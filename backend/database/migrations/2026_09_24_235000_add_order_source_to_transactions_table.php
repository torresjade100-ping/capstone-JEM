<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('transactions') && !Schema::hasColumn('transactions', 'order_source')) {
            Schema::table('transactions', function (Blueprint $table) {
                $table->string('order_source')->nullable()->default('Walk-in')->after('customer_name');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('transactions') && Schema::hasColumn('transactions', 'order_source')) {
            Schema::table('transactions', function (Blueprint $table) {
                $table->dropColumn('order_source');
            });
        }
    }
};
