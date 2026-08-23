<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            if (! Schema::hasColumn('notifications', 'type')) $table->string('type')->nullable()->after('user_id');
            if (! Schema::hasColumn('notifications', 'data')) $table->text('data')->nullable()->after('type');
            if (! Schema::hasColumn('notifications', 'channel')) $table->string('channel')->default('database')->after('data');
        });
    }

    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            if (Schema::hasColumn('notifications', 'channel')) $table->dropColumn('channel');
            if (Schema::hasColumn('notifications', 'data')) $table->dropColumn('data');
            if (Schema::hasColumn('notifications', 'type')) $table->dropColumn('type');
        });
    }
};
