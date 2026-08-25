<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SalesTransaction;
use App\Models\SaleItem;
use App\Models\Payment;
use App\Models\Product;
use App\Services\InventoryService;
use App\Services\Payments\PaymentManager;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class POSController extends Controller
{
    protected InventoryService $inventoryService;
    protected PaymentManager $pm;

    public function __construct(InventoryService $inventoryService, PaymentManager $pm)
    {
        $this->inventoryService = $inventoryService;
        $this->pm = $pm;
    }

    public function checkout(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
            'payment_method' => ['required', 'in:gcash,maya,cod'],
            'discount' => ['nullable', 'numeric', 'min:0'],
        ]);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        return DB::transaction(function () use ($request) {
            $subtotal = 0;
            foreach ($request->items as $it) {
                $product = Product::findOrFail($it['product_id']);
                if ($product->stock_quantity < $it['quantity']) {
                    abort(422, 'Insufficient stock available for this product.');
                }
                $it['unit_price'] = (float) $product->base_price;
                $subtotal += ($it['unit_price'] * $it['quantity']);
            }
            $discount = $request->discount ?? 0;
            $total = $subtotal - $discount;

            $tx = SalesTransaction::create([
                'user_id' => $request->user()->id ?? null,
                'transaction_number' => 'POS'.time().rand(100,999),
                'type' => 'pos',
                'subtotal' => $subtotal,
                'discount' => $discount,
                'total' => $total,
                'payment_method' => $request->payment_method,
                'status' => 'completed',
            ]);

            try {
                app(\App\Services\AuditService::class)->record([
                    'user_id' => $request->user()->id ?? null,
                    'action' => 'create',
                    'module' => 'sales_transaction',
                    'record_type' => 'sales_transaction',
                    'record_id' => $tx->id,
                    'before' => null,
                    'after' => $tx->toArray(),
                    'ip_address' => $request->ip(),
                ]);
            } catch (\Throwable $e) {}

            foreach ($request->items as $it) {
                $product = Product::findOrFail($it['product_id']);
                SaleItem::create([
                    'sales_transaction_id' => $tx->id,
                    'product_id' => $it['product_id'],
                    'product_variant_id' => $it['product_variant_id'] ?? null,
                    'quantity' => $it['quantity'],
                    'unit_price' => $product->base_price,
                    'total_price' => $product->base_price * $it['quantity'],
                ]);

                // Deduct actual product stock quantity
                $qtyToDeduct = (int) $it['quantity'];
                $qtyBefore = (int) ($product->stock_quantity ?? 0);
                $qtyAfter = max(0, $qtyBefore - $qtyToDeduct);
                $product->stock_quantity = $qtyAfter;
                $product->save();

                // If variant exists, also decrement variant stock
                if (!empty($it['product_variant_id'])) {
                    \App\Models\ProductVariant::where('id', $it['product_variant_id'])
                        ->decrement('stock_quantity', $qtyToDeduct);
                }

                // Log Stock Adjustment and Audit Record
                try {
                    $this->inventoryService->adjustStock(
                        $request->user(),
                        $it['product_id'],
                        $it['product_variant_id'] ?? null,
                        -1 * $qtyToDeduct,
                        "Walk-in POS Sale (Tx #{$tx->transaction_number})",
                        'pos_sale'
                    );
                } catch (\Throwable $e) {
                    try {
                        \App\Models\StockAdjustment::create([
                            'product_id' => $product->id,
                            'product_variant_id' => $it['product_variant_id'] ?? null,
                            'user_id' => $request->user()->id ?? 1,
                            'adjustment_type' => 'deduct',
                            'quantity_before' => $qtyBefore,
                            'quantity_changed' => -1 * $qtyToDeduct,
                            'quantity_after' => $qtyAfter,
                            'reason' => "Walk-in POS Sale (Tx #{$tx->transaction_number})",
                        ]);
                    } catch (\Throwable $err) {}
                }
            }


            // Create payment record
            Payment::create([
                'order_id' => null,
                'method' => $request->payment_method,
                'status' => 'completed',
                'amount' => $total,
                'reference_number' => 'POS-'.time().rand(100,999),
                'transaction_date' => now(),
            ]);

            return response()->json(['success' => true, 'data' => ['transaction' => $tx]]);
        });
    }
}
