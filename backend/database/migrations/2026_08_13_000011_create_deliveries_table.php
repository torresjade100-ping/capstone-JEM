<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('deliveries')) {
            Schema::create('deliveries', function (Blueprint $table) {
                $table->id();
                $table->foreignId('order_level_id')->nullable()->constrained('order_levels')->nullOnDelete();
                $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
                $table->string('contact_number')->nullable();
                $table->text('delivery_address')->nullable();
                $table->integer('delivery_lead_time_days')->nullable();
                $table->string('courier')->nullable();
                $table->string('tracking_number')->nullable();
                $table->string('status')->default('pending');
                $table->dateTime('delivery_date')->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('deliveries');
    }
};
