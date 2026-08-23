<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\StockAdjustment;
use Illuminate\Support\Facades\DB;
use Throwable;
use App\Services\AuditService;
use Illuminate\Support\Facades\Request as RequestFacade;

class InventoryService
{
    /**
     * Adjust stock for a product or product variant transactionally.
     *
     * @param  \App\Models\User  $user
     * @param  int  $productId
     * @param  int|null  $variantId
     * @param  int  $quantityChange  Positive to increase, negative to decrease
     * @param  string  $reason
     * @param  string  $type
     * @return array
     *
     * @throws \Throwable
     */
    public function adjustStock($user, int $productId, ?int $variantId, int $quantityChange, string $reason, string $type = 'other'): array
    {
        return DB::transaction(function () use ($user, $productId, $variantId, $quantityChange, $reason, $type) {
            if ($variantId) {
                $variant = ProductVariant::lockForUpdate()->findOrFail($variantId);

                $before = $variant->stock_quantity;
                $after = $before + $quantityChange;

                if ($after < 0) {
                    throw new \Exception('Insufficient stock for this variant.');
                }

                $variant->stock_quantity = $after;
                $variant->save();

                // Update overall product stock (optional conservative update)
                $product = Product::lockForUpdate()->findOrFail($productId);
                $product->stock_quantity = max(0, $product->stock_quantity + $quantityChange);
                $product->save();

                StockAdjustment::create([
                    'product_id' => $productId,
                    'product_variant_id' => $variantId,
                    'user_id' => $user->id,
                    'adjustment_type' => $type,
                    'quantity_before' => $before,
                    'quantity_changed' => $quantityChange,
                    'quantity_after' => $after,
                    'reason' => $reason,
                ]);

                // Audit log
                try {
                    app(AuditService::class)->record([
                        'user_id' => $user->id ?? null,
                        'action' => 'stock_adjustment',
                        'module' => 'inventory',
                        'record_type' => 'product_variant',
                        'record_id' => $variantId,
                        'reason' => $reason,
                        'before' => ['stock_quantity' => $before],
                        'after' => ['stock_quantity' => $after],
                        'ip_address' => RequestFacade::ip(),
                    ]);
                } catch (Throwable $e) {
                    // swallow audit errors
                }

                return ['product' => $product, 'variant' => $variant];
            }

            $product = Product::lockForUpdate()->findOrFail($productId);

            $before = $product->stock_quantity;
            $after = $before + $quantityChange;

            if ($after < 0) {
                throw new \Exception('Insufficient stock for this product.');
            }

            $product->stock_quantity = $after;
            $product->save();

            StockAdjustment::create([
                'product_id' => $productId,
                'product_variant_id' => null,
                'user_id' => $user->id,
                'adjustment_type' => $type,
                'quantity_before' => $before,
                'quantity_changed' => $quantityChange,
                'quantity_after' => $after,
                'reason' => $reason,
            ]);

            // Audit log for product-level adjustment
            try {
                app(AuditService::class)->record([
                    'user_id' => $user->id ?? null,
                    'action' => 'stock_adjustment',
                    'module' => 'inventory',
                    'record_type' => 'product',
                    'record_id' => $productId,
                    'reason' => $reason,
                    'before' => ['stock_quantity' => $before],
                    'after' => ['stock_quantity' => $after],
                    'ip_address' => RequestFacade::ip(),
                ]);
            } catch (Throwable $e) {
                // swallow audit errors
            }

            return ['product' => $product];
        });
    }

    /**
     * Get low stock products and variants.
     *
     * @return array
     */
    public function getLowStock()
    {
        $lowProducts = Product::where('status', 'active')
            ->whereColumn('stock_quantity', '<=', 'low_stock_threshold')
            ->get()
            ->map(fn($p) => [
                'type' => 'product',
                'id' => $p->id,
                'name' => $p->name,
                'stock' => $p->stock_quantity,
                'threshold' => $p->low_stock_threshold,
                'status' => $p->stock_quantity <= 0 ? 'out_of_stock' : 'low',
            ]);

        $lowVariants = ProductVariant::with('product')
            ->where('status', 'active')
            ->whereHas('product', function ($q) {
                $q->whereColumn('product_variants.stock_quantity', '<=', 'products.low_stock_threshold');
            })
            ->get();

        $lowVariantsList = $lowVariants->map(function ($v) {
            $threshold = $v->product?->low_stock_threshold ?? 0;
            return [
                'type' => 'variant',
                'id' => $v->id,
                'product_id' => $v->product_id,
                'sku' => $v->sku,
                'stock' => $v->stock_quantity,
                'threshold' => $threshold,
                'status' => $v->stock_quantity <= 0 ? 'out_of_stock' : 'low',
            ];
        });

        return $lowProducts->merge($lowVariantsList)->values()->all();
    }

    /**
     * Get available quantity for product or variant.
     *
     * @param  int  $productId
     * @param  int|null  $variantId
     * @return int
     */
    public function getAvailableQuantity(int $productId, ?int $variantId = null): int
    {
        if ($variantId) {
            $variant = ProductVariant::find($variantId);
            return $variant ? (int) $variant->stock_quantity : 0;
        }

        $product = Product::find($productId);
        return $product ? (int) $product->stock_quantity : 0;
    }
}
