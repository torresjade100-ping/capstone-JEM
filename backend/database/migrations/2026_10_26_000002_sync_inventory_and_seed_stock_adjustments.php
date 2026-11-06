<?php

use App\Models\Inventory;
use App\Models\Product;
use App\Models\StockAdjustment;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('products') || !Schema::hasTable('inventory')) {
            return;
        }

        $admin = User::where('role', 'admin')->first() ?? User::first();
        $adminId = $admin ? $admin->id : 1;

        $products = Product::with(['variants', 'batches'])->get();

        foreach ($products as $p) {
            $qty = (int) ($p->stock_quantity ?? 0);
            $threshold = (int) ($p->low_stock_threshold ?? 10);
            $variant = $p->variants->first();

            // 1. Sync inventory table
            Inventory::updateOrCreate(
                ['product_id' => $p->id],
                [
                    'product_variant_id' => $variant?->id,
                    'current_quantity' => $qty,
                    'available_quantity' => $qty,
                    'reserved_quantity' => 0,
                    'threshold' => $threshold,
                ]
            );

            // 2. Ensure initial stock adjustment record exists if empty
            if (Schema::hasTable('stock_adjustments')) {
                $hasAdj = StockAdjustment::where('product_id', $p->id)->exists();
                if (!$hasAdj && $qty > 0) {
                    $batch = $p->batches->first();
                    $batchNum = $batch?->batch_number ?? ('INIT-' . str_pad((string) $p->id, 4, '0', STR_PAD_LEFT));

                    StockAdjustment::create([
                        'product_id' => $p->id,
                        'product_variant_id' => $variant?->id,
                        'user_id' => $adminId,
                        'supplier_id' => $batch?->supplier_id,
                        'adjustment_type' => 'restock',
                        'quantity_before' => 0,
                        'quantity_changed' => $qty,
                        'quantity_after' => $qty,
                        'reference_number' => $batchNum,
                        'reason' => 'Physical Inventory Stock-In',
                        'notes' => 'Initial hardware store stock intake and warehouse synchronization',
                        'created_at' => $batch?->received_date ?? now(),
                        'updated_at' => $batch?->received_date ?? now(),
                    ]);
                }
            }
        }
    }

    public function down(): void
    {
        // Safe no-op: does not delete product inventory
    }
};
