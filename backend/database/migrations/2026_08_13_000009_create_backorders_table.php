<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('backorders')) {
            Schema::create('backorders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignId('product_variant_id')->nullable()->constrained('product_variants')->nullOnDelete();
            $table->integer('requested_quantity')->default(0);
            $table->integer('fulfilled_quantity')->default(0);
            $table->integer('remaining_quantity')->default(0);
            $table->string('status')->default('pending');
            $table->dateTime('expected_restock_date')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('backorders');
    }
};
