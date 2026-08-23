<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            if (! Schema::hasColumn('product_variants', 'pre_order_enabled')) {
                $table->boolean('pre_order_enabled')->default(false)->after('stock_quantity');
            }
            if (! Schema::hasColumn('product_variants', 'expected_restock_date')) {
                $table->dateTime('expected_restock_date')->nullable()->after('pre_order_enabled');
            }
        });
    }

    public function down(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            if (Schema::hasColumn('product_variants', 'expected_restock_date')) {
                $table->dropColumn('expected_restock_date');
            }
            if (Schema::hasColumn('product_variants', 'pre_order_enabled')) {
                $table->dropColumn('pre_order_enabled');
            }
        });
    }
};
