<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('feedback')) {
            Schema::table('feedback', function (Blueprint $table) {
                if (!Schema::hasColumn('feedback', 'admin_response')) {
                    $table->text('admin_response')->nullable()->after('message');
                }
                if (!Schema::hasColumn('feedback', 'responded_by')) {
                    $table->foreignId('responded_by')->nullable()->after('admin_response')->constrained('users')->nullOnDelete();
                }
                if (!Schema::hasColumn('feedback', 'responded_at')) {
                    $table->timestamp('responded_at')->nullable()->after('responded_by');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('feedback')) {
            Schema::table('feedback', function (Blueprint $table) {
                if (Schema::hasColumn('feedback', 'responded_by')) {
                    $table->dropConstrainedForeignId('responded_by');
                }
                if (Schema::hasColumn('feedback', 'admin_response')) {
                    $table->dropColumn('admin_response');
                }
                if (Schema::hasColumn('feedback', 'responded_at')) {
                    $table->dropColumn('responded_at');
                }
            });
        }
    }
};
