<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Expand payment_method enums
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE orders MODIFY payment_method ENUM('gcash','maya','bank_transfer','cod') NOT NULL DEFAULT 'cod'");
            DB::statement("ALTER TABLE payments MODIFY method ENUM('gcash','maya','bank_transfer','cod') NOT NULL DEFAULT 'cod'");
        }

        // 2. Create customer_addresses table if not exists
        if (! Schema::hasTable('customer_addresses')) {
            Schema::create('customer_addresses', function (Blueprint $table) {
                $table->id();
                $table->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
                $table->string('tag')->default('Job Site');
                $table->text('address');
                $table->string('contact_name')->nullable();
                $table->string('contact_phone')->nullable();
                $table->text('notes')->nullable();
                $table->boolean('is_default')->default(false);
                $table->timestamps();
                $table->softDeletes();
            });
        }

        // 3. Create customer_wishlists table if not exists
        if (! Schema::hasTable('customer_wishlists')) {
            Schema::create('customer_wishlists', function (Blueprint $table) {
                $table->id();
                $table->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
                $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
                $table->timestamps();
                $table->unique(['customer_id', 'product_id']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_wishlists');
        Schema::dropIfExists('customer_addresses');

        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE orders MODIFY payment_method ENUM('gcash','maya','cod') NOT NULL DEFAULT 'cod'");
            DB::statement("ALTER TABLE payments MODIFY method ENUM('gcash','maya','cod') NOT NULL DEFAULT 'cod'");
        }
    }
};
