<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Add cost_price and selling_price to products table
        Schema::table('products', function (Blueprint $table) {
            if (! Schema::hasColumn('products', 'cost_price')) {
                $table->decimal('cost_price', 12, 2)->default(0.00)->after('base_price');
            }
            if (! Schema::hasColumn('products', 'selling_price')) {
                $table->decimal('selling_price', 12, 2)->default(0.00)->after('cost_price');
            }
        });

        // Sync existing products' selling_price and cost_price
        DB::table('products')->update([
            'selling_price' => DB::raw('base_price'),
            'cost_price' => DB::raw('ROUND(base_price * 0.70, 2)'),
        ]);

        // 2. Create inventory_batches table
        if (! Schema::hasTable('inventory_batches')) {
            Schema::create('inventory_batches', function (Blueprint $table) {
                $table->id();
                $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
                $table->string('batch_number')->index();
                $table->foreignId('supplier_id')->nullable()->constrained('suppliers')->nullOnDelete();
                $table->string('supplier_name')->nullable();
                $table->decimal('cost_price', 12, 2)->default(0.00);
                $table->decimal('selling_price', 12, 2)->default(0.00);
                $table->unsignedInteger('initial_quantity')->default(0);
                $table->unsignedInteger('quantity')->default(0);
                $table->date('received_date');
                $table->date('expiration_date')->nullable();
                $table->enum('status', ['active', 'depleted', 'expired'])->default('active')->index();
                $table->text('notes')->nullable();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
                $table->softDeletes();
            });
        }

        // 3. Seed initial inventory batches for existing products with stock > 0
        $existingProducts = DB::table('products')->whereNull('deleted_at')->get();
        $defaultSupplier = DB::table('suppliers')->first();
        $adminUser = DB::table('users')->where('role', 'admin')->first();

        foreach ($existingProducts as $index => $prod) {
            $qty = (int) $prod->stock_quantity;
            $batchNo = sprintf('BATCH-%s-%04d', date('Ymd'), $prod->id);

            DB::table('inventory_batches')->insert([
                'product_id' => $prod->id,
                'batch_number' => $batchNo,
                'supplier_id' => $defaultSupplier ? $defaultSupplier->id : null,
                'supplier_name' => $defaultSupplier ? $defaultSupplier->name : 'Initial Stock In',
                'cost_price' => (float) $prod->cost_price,
                'selling_price' => (float) $prod->selling_price,
                'initial_quantity' => $qty,
                'quantity' => $qty,
                'received_date' => date('Y-m-d', strtotime($prod->created_at ?? 'now')),
                'expiration_date' => null,
                'status' => $qty > 0 ? 'active' : 'depleted',
                'notes' => 'Initial inventory stock batch record',
                'created_by' => $adminUser ? $adminUser->id : null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_batches');

        Schema::table('products', function (Blueprint $table) {
            if (Schema::hasColumn('products', 'selling_price')) {
                $table->dropColumn('selling_price');
            }
            if (Schema::hasColumn('products', 'cost_price')) {
                $table->dropColumn('cost_price');
            }
        });
    }
};
