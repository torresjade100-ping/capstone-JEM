<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'mysql') return;

        DB::statement("ALTER TABLE orders MODIFY status ENUM('pending','processing','shipped','delivered','cancelled','returned','confirmed','ready','out_for_delivery','completed','rejected') NOT NULL DEFAULT 'pending'");
        DB::statement("ALTER TABLE orders MODIFY payment_method ENUM('gcash','maya','bank_transfer','cod','split_payment') NOT NULL DEFAULT 'cod'");
        DB::statement("ALTER TABLE payments MODIFY method ENUM('gcash','maya','bank_transfer','cod','split_payment') NOT NULL DEFAULT 'cod'");
        DB::statement("ALTER TABLE payments MODIFY status ENUM('pending','completed','paid','failed','refunded','awaiting_verification') NOT NULL DEFAULT 'pending'");
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'mysql') return;

        DB::statement("ALTER TABLE payments MODIFY status ENUM('pending','completed','failed','refunded') NOT NULL DEFAULT 'pending'");
        DB::statement("ALTER TABLE payments MODIFY method ENUM('gcash','maya','cod') NOT NULL DEFAULT 'cod'");
        DB::statement("ALTER TABLE orders MODIFY payment_method ENUM('gcash','maya','cod') NOT NULL DEFAULT 'cod'");
        DB::statement("ALTER TABLE orders MODIFY status ENUM('pending','processing','shipped','delivered','cancelled','returned') NOT NULL DEFAULT 'pending'");
    }
};
