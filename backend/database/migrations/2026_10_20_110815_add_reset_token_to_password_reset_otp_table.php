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
        Schema::table('password_reset_otp', function (Blueprint $table) {
            if (!Schema::hasColumn('password_reset_otp', 'reset_token')) {
                $table->string('reset_token', 100)->nullable()->index()->after('used');
            }
            if (!Schema::hasColumn('password_reset_otp', 'verified_at')) {
                $table->timestamp('verified_at')->nullable()->after('reset_token');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('password_reset_otp', function (Blueprint $table) {
            if (Schema::hasColumn('password_reset_otp', 'reset_token')) {
                $table->dropColumn('reset_token');
            }
            if (Schema::hasColumn('password_reset_otp', 'verified_at')) {
                $table->dropColumn('verified_at');
            }
        });
    }
};
