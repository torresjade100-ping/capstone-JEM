<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('audit_logs')) {
            Schema::create('audit_logs', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('action');
                $table->string('module')->nullable();
                $table->string('record_type')->nullable();
                $table->unsignedBigInteger('record_id')->nullable();
                $table->text('reason')->nullable();
                $table->json('before')->nullable();
                $table->json('after')->nullable();
                $table->string('ip_address')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('notifications')) {
            Schema::create('notifications', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('type')->nullable();
                $table->text('data')->nullable();
                $table->string('channel')->default('database');
                $table->boolean('read')->default(false);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('feedbacks')) {
            Schema::create('feedbacks', function (Blueprint $table) {
                $table->id();
                $table->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
                $table->string('subject');
                $table->text('message');
                $table->string('type')->nullable();
                $table->string('status')->default('open');
                $table->text('admin_response')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('feedbacks');
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('audit_logs');
    }
};
