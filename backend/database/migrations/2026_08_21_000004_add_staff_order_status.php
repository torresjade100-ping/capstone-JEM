<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE orders MODIFY status ENUM('pending','confirmed','received','processing','ready','shipped','out_for_delivery','delivered','completed','cancelled','returned','rejected') NOT NULL DEFAULT 'pending'");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE orders MODIFY status ENUM('pending','processing','shipped','delivered','cancelled','returned','confirmed','ready','out_for_delivery','completed','rejected') NOT NULL DEFAULT 'pending'");
        }
    }
};
