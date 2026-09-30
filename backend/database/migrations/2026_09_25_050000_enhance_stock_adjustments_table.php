<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stock_adjustments', function (Blueprint $table) {
            if (!Schema::hasColumn('stock_adjustments', 'supplier_id')) {
                $table->foreignId('supplier_id')->nullable()->after('user_id')->constrained('suppliers')->nullOnDelete();
            }
            if (!Schema::hasColumn('stock_adjustments', 'reference_number')) {
                $table->string('reference_number', 100)->nullable()->after('quantity_after');
            }
            if (!Schema::hasColumn('stock_adjustments', 'notes')) {
                $table->text('notes')->nullable()->after('reason');
            }
        });

        // Ensure adjustment_type can accommodate all required stock transaction types
        try {
            DB::statement("ALTER TABLE stock_adjustments MODIFY COLUMN adjustment_type VARCHAR(50) NOT NULL DEFAULT 'other'");
        } catch (\Throwable $e) {
            // non-blocking for SQLite / test environments
        }
    }

    public function down(): void
    {
        Schema::table('stock_adjustments', function (Blueprint $table) {
            if (Schema::hasColumn('stock_adjustments', 'supplier_id')) {
                $table->dropForeign(['supplier_id']);
                $table->dropColumn('supplier_id');
            }
            if (Schema::hasColumn('stock_adjustments', 'reference_number')) {
                $table->dropColumn('reference_number');
            }
            if (Schema::hasColumn('stock_adjustments', 'notes')) {
                $table->dropColumn('notes');
            }
        });
    }
};
