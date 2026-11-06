<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('loss_damage_thefts', function (Blueprint $table) {
            $table->id();
            $table->string('reference_number', 50)->unique()->nullable();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignId('product_variant_id')->nullable()->constrained('product_variants')->nullOnDelete();
            $table->string('sku', 100)->nullable();
            $table->enum('incident_type', ['lost', 'damaged', 'stolen'])->default('damaged');
            $table->unsignedInteger('quantity')->default(1);
            $table->date('incident_date');
            $table->string('reported_by', 150);
            $table->foreignId('reported_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('reason');
            $table->enum('status', ['pending', 'investigating', 'resolved'])->default('pending');
            $table->text('action_taken')->nullable();
            $table->boolean('stock_adjusted')->default(false);
            $table->foreignId('stock_adjustment_id')->nullable()->constrained('stock_adjustments')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['incident_type', 'status']);
            $table->index(['incident_date']);
            $table->index(['product_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loss_damage_thefts');
    }
};
