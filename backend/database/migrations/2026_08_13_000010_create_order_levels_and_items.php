<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('order_levels')) {
            Schema::create('order_levels', function (Blueprint $table) {
                $table->id();
                $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
                $table->unsignedSmallInteger('level_number')->default(1);
                $table->string('status')->default('pending');
                $table->dateTime('delivery_date')->nullable();
                $table->string('tracking_number')->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();
            });

            Schema::create('order_level_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('order_level_id')->constrained('order_levels')->cascadeOnDelete();
                $table->foreignId('order_item_id')->constrained('order_items')->cascadeOnDelete();
                $table->integer('quantity')->default(0);
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('order_level_items');
        Schema::dropIfExists('order_levels');
    }
};
