<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('audit_logs')) {
            Schema::table('audit_logs', function (Blueprint $table) {
                if (! Schema::hasColumn('audit_logs', 'module')) {
                    $table->string('module')->nullable()->after('user_role');
                }
                if (! Schema::hasColumn('audit_logs', 'record_type')) {
                    $table->string('record_type')->nullable()->after('module');
                }
                if (! Schema::hasColumn('audit_logs', 'record_id')) {
                    $table->unsignedBigInteger('record_id')->nullable()->after('record_type');
                }
                if (! Schema::hasColumn('audit_logs', 'before')) {
                    $table->json('before')->nullable()->after('metadata');
                }
                if (! Schema::hasColumn('audit_logs', 'after')) {
                    $table->json('after')->nullable()->after('before');
                }
            });
        }
    }

    public function down(): void
    {
        // No-op
    }
};
