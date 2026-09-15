<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Update orders table status enum to include 'backordered'
        if (Schema::hasTable('orders')) {
            if (DB::getDriverName() === 'mysql') {
                DB::statement("ALTER TABLE orders MODIFY status ENUM('pending','confirmed','backordered','received','processing','ready','shipped','out_for_delivery','delivered','completed','cancelled','returned','rejected') NOT NULL DEFAULT 'pending'");
            }
        }

        // 2. Enhance order_items table with granular fulfillment tracking
        if (Schema::hasTable('order_items')) {
            Schema::table('order_items', function (Blueprint $table) {
                if (! Schema::hasColumn('order_items', 'ordered_quantity')) {
                    $table->unsignedInteger('ordered_quantity')->default(1)->after('quantity');
                }
                if (! Schema::hasColumn('order_items', 'fulfilled_quantity')) {
                    $table->unsignedInteger('fulfilled_quantity')->default(0)->after('ordered_quantity');
                }
                if (! Schema::hasColumn('order_items', 'backordered_quantity')) {
                    $table->unsignedInteger('backordered_quantity')->default(0)->after('fulfilled_quantity');
                }
                if (! Schema::hasColumn('order_items', 'available_quantity_at_order')) {
                    $table->unsignedInteger('available_quantity_at_order')->default(0)->after('backordered_quantity');
                }
                if (! Schema::hasColumn('order_items', 'fulfillment_status')) {
                    $table->string('fulfillment_status', 50)->default('fulfilled')->after('available_quantity_at_order');
                }
            });

            // Backfill existing rows so ordered_quantity = quantity and fulfilled_quantity = quantity
            DB::statement("UPDATE order_items SET ordered_quantity = quantity, fulfilled_quantity = quantity, backordered_quantity = 0, fulfillment_status = 'fulfilled' WHERE ordered_quantity = 1 AND quantity > 1");
        }

        // 3. Enhance backorders table with all relational & tracking fields
        if (Schema::hasTable('backorders')) {
            Schema::table('backorders', function (Blueprint $table) {
                if (! Schema::hasColumn('backorders', 'order_id')) {
                    $table->foreignId('order_id')->nullable()->after('id')->constrained('orders')->cascadeOnDelete();
                }
                if (! Schema::hasColumn('backorders', 'product_id')) {
                    $table->foreignId('product_id')->nullable()->after('order_item_id')->constrained('products')->cascadeOnDelete();
                }
                if (! Schema::hasColumn('backorders', 'product_variant_id')) {
                    $table->foreignId('product_variant_id')->nullable()->after('product_id')->constrained('product_variants')->nullOnDelete();
                }
                if (! Schema::hasColumn('backorders', 'requested_quantity')) {
                    $table->integer('requested_quantity')->default(0)->after('product_variant_id');
                }
                if (! Schema::hasColumn('backorders', 'fulfilled_quantity')) {
                    $table->integer('fulfilled_quantity')->default(0)->after('requested_quantity');
                }
                if (! Schema::hasColumn('backorders', 'remaining_quantity')) {
                    $table->integer('remaining_quantity')->default(0)->after('fulfilled_quantity');
                }
                if (! Schema::hasColumn('backorders', 'expected_restock_date')) {
                    $table->dateTime('expected_restock_date')->nullable()->after('status');
                }
            });

            // If MySQL, ensure status is varchar/enum accommodating 'pending', 'partially_fulfilled', 'fulfilled', 'cancelled'
            if (DB::getDriverName() === 'mysql') {
                DB::statement("ALTER TABLE backorders MODIFY status VARCHAR(50) NOT NULL DEFAULT 'pending'");
            }
        }

        // 4. Ensure inventory table has reserved_quantity and available_quantity
        if (Schema::hasTable('inventory')) {
            Schema::table('inventory', function (Blueprint $table) {
                if (! Schema::hasColumn('inventory', 'reserved_quantity')) {
                    $table->integer('reserved_quantity')->default(0)->after('current_quantity');
                }
                if (! Schema::hasColumn('inventory', 'available_quantity')) {
                    $table->integer('available_quantity')->default(0)->after('reserved_quantity');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('order_items')) {
            Schema::table('order_items', function (Blueprint $table) {
                $cols = ['ordered_quantity', 'fulfilled_quantity', 'backordered_quantity', 'available_quantity_at_order', 'fulfillment_status'];
                foreach ($cols as $col) {
                    if (Schema::hasColumn('order_items', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }

        if (Schema::hasTable('orders') && DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE orders MODIFY status ENUM('pending','confirmed','received','processing','ready','shipped','out_for_delivery','delivered','completed','cancelled','returned','rejected') NOT NULL DEFAULT 'pending'");
        }
    }
};
