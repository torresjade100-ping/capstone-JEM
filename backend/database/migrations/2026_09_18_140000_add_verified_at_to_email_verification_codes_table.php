<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('email_verification_codes', function (Blueprint $table) {
            if (! Schema::hasColumn('email_verification_codes', 'verified_at')) {
                $table->timestamp('verified_at')->nullable()->after('expires_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('email_verification_codes', function (Blueprint $table) {
            if (Schema::hasColumn('email_verification_codes', 'verified_at')) {
                $table->dropColumn('verified_at');
            }
        });
    }
};
