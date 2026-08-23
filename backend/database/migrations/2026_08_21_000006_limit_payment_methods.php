<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'mysql') return;
        DB::statement("ALTER TABLE orders MODIFY payment_method ENUM('gcash','maya','cod') NOT NULL DEFAULT 'cod'");
        DB::statement("ALTER TABLE payments MODIFY method ENUM('gcash','maya','cod') NOT NULL DEFAULT 'cod'");
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'mysql') return;
        DB::statement("ALTER TABLE orders MODIFY payment_method ENUM('gcash','maya','bank_transfer','cod','split_payment') NOT NULL DEFAULT 'cod'");
        DB::statement("ALTER TABLE payments MODIFY method ENUM('gcash','maya','bank_transfer','cod','split_payment') NOT NULL DEFAULT 'cod'");
    }
};
