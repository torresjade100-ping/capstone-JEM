<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Transactions Table
        if (! Schema::hasTable('transactions')) {
            Schema::create('transactions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('order_id')->nullable()->constrained('orders')->nullOnDelete();
                $table->string('transaction_number')->unique()->index();
                $table->foreignId('cashier_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('cashier_name')->default('System');
                $table->string('cashier_role')->default('staff');
                $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
                $table->string('customer_name')->default('Walk-in');
                $table->string('payment_method')->default('cash'); // cash, gcash, maya, cod, etc.
                $table->string('reference_number')->nullable();
                $table->decimal('gross_subtotal', 14, 2)->default(0.00);
                $table->decimal('discount', 14, 2)->default(0.00);
                $table->decimal('total_net', 14, 2)->default(0.00);
                $table->decimal('amount_tendered', 14, 2)->default(0.00);
                $table->decimal('change_due', 14, 2)->default(0.00);
                $table->string('status')->default('PAID'); // PAID, REFUNDED, PARTIALLY_REFUNDED, VOIDED, PENDING, FAILED
                $table->string('type')->default('retail'); // retail, gcash, online
                $table->dateTime('date_time')->index();
                $table->text('notes')->nullable();
                $table->timestamps();
            });
        }

        // 2. Transaction Items Table
        if (! Schema::hasTable('transaction_items')) {
            Schema::create('transaction_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('transaction_id')->constrained('transactions')->cascadeOnDelete();
                $table->foreignId('product_id')->nullable()->constrained('products')->nullOnDelete();
                $table->foreignId('product_variant_id')->nullable()->constrained('product_variants')->nullOnDelete();
                $table->string('product_name');
                $table->string('sku')->nullable();
                $table->string('unit')->default('piece');
                $table->unsignedInteger('quantity')->default(1);
                $table->decimal('unit_price', 14, 2)->default(0.00);
                $table->decimal('line_total', 14, 2)->default(0.00);
                $table->timestamps();
            });
        }

        // 3. Refunds Table
        if (! Schema::hasTable('refunds')) {
            Schema::create('refunds', function (Blueprint $table) {
                $table->id();
                $table->foreignId('transaction_id')->constrained('transactions')->cascadeOnDelete();
                $table->foreignId('refunded_by')->constrained('users')->cascadeOnDelete();
                $table->decimal('amount', 14, 2);
                $table->text('reason');
                $table->dateTime('refund_date');
                $table->json('items_restored')->nullable();
                $table->timestamps();
            });
        }

        // 4. Voids Table
        if (! Schema::hasTable('voids')) {
            Schema::create('voids', function (Blueprint $table) {
                $table->id();
                $table->foreignId('transaction_id')->constrained('transactions')->cascadeOnDelete();
                $table->foreignId('voided_by')->constrained('users')->cascadeOnDelete();
                $table->text('reason');
                $table->dateTime('void_date');
                $table->json('items_restored')->nullable();
                $table->timestamps();
            });
        }

        // 5. Void Security Settings Table
        if (! Schema::hasTable('void_security_settings')) {
            Schema::create('void_security_settings', function (Blueprint $table) {
                $table->id();
                $table->string('void_pin_hash')->nullable();
                $table->foreignId('configured_by')->nullable()->constrained('users')->nullOnDelete();
                $table->dateTime('configured_at')->nullable();
                $table->timestamps();
            });
        }

        // 6. Enhance Audit Logs with required fields if missing
        if (Schema::hasTable('audit_logs')) {
            Schema::table('audit_logs', function (Blueprint $table) {
                if (! Schema::hasColumn('audit_logs', 'action')) {
                    $table->string('action')->nullable()->after('user_id');
                }
                if (! Schema::hasColumn('audit_logs', 'transaction_id')) {
                    $table->unsignedBigInteger('transaction_id')->nullable()->after('action');
                }
                if (! Schema::hasColumn('audit_logs', 'order_id')) {
                    $table->unsignedBigInteger('order_id')->nullable()->after('transaction_id');
                }
                if (! Schema::hasColumn('audit_logs', 'user_name')) {
                    $table->string('user_name')->nullable()->after('order_id');
                }
                if (! Schema::hasColumn('audit_logs', 'user_role')) {
                    $table->string('user_role')->nullable()->after('user_name');
                }
                if (! Schema::hasColumn('audit_logs', 'module')) {
                    $table->string('module')->nullable()->after('user_role');
                }
                if (! Schema::hasColumn('audit_logs', 'record_type')) {
                    $table->string('record_type')->nullable()->after('module');
                }
                if (! Schema::hasColumn('audit_logs', 'record_id')) {
                    $table->unsignedBigInteger('record_id')->nullable()->after('record_type');
                }
                if (! Schema::hasColumn('audit_logs', 'reason')) {
                    $table->text('reason')->nullable()->after('record_id');
                }
                if (! Schema::hasColumn('audit_logs', 'metadata')) {
                    $table->json('metadata')->nullable()->after('reason');
                }
                if (! Schema::hasColumn('audit_logs', 'before')) {
                    $table->json('before')->nullable()->after('metadata');
                }
                if (! Schema::hasColumn('audit_logs', 'after')) {
                    $table->json('after')->nullable()->after('before');
                }
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('voids');
        Schema::dropIfExists('refunds');
        Schema::dropIfExists('transaction_items');
        Schema::dropIfExists('transactions');
        Schema::dropIfExists('void_security_settings');
    }
};
