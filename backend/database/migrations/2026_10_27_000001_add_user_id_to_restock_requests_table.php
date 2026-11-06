<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('restock_requests') && ! Schema::hasColumn('restock_requests', 'user_id')) {
            Schema::table('restock_requests', function (Blueprint $table) {
                $table->foreignId('user_id')->nullable()->after('requested_by')->constrained('users')->nullOnDelete();
            });

            if (Schema::hasColumn('restock_requests', 'requested_by')) {
                DB::table('restock_requests')
                    ->whereNull('user_id')
                    ->whereNotNull('requested_by')
                    ->update(['user_id' => DB::raw('requested_by')]);
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('restock_requests') && Schema::hasColumn('restock_requests', 'user_id')) {
            Schema::table('restock_requests', function (Blueprint $table) {
                $table->dropConstrainedForeignId('user_id');
            });
        }
    }
};
