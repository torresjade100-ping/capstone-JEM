<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('customer_addresses')) {
            Schema::table('customer_addresses', function (Blueprint $table) {
                if (!Schema::hasColumn('customer_addresses', 'user_id')) {
                    $table->foreignId('user_id')->nullable()->after('id')->constrained('users')->nullOnDelete();
                }
                if (!Schema::hasColumn('customer_addresses', 'label')) {
                    $table->string('label', 50)->default('Home')->after('customer_id');
                }
                if (!Schema::hasColumn('customer_addresses', 'recipient_name')) {
                    $table->string('recipient_name', 100)->nullable()->after('label');
                }
                if (!Schema::hasColumn('customer_addresses', 'phone_number')) {
                    $table->string('phone_number', 30)->nullable()->after('recipient_name');
                }
                if (!Schema::hasColumn('customer_addresses', 'address_line1')) {
                    $table->string('address_line1', 255)->nullable()->after('phone_number');
                }
                if (!Schema::hasColumn('customer_addresses', 'barangay')) {
                    $table->string('barangay', 100)->nullable()->after('address_line1');
                }
                if (!Schema::hasColumn('customer_addresses', 'city')) {
                    $table->string('city', 100)->nullable()->after('barangay');
                }
                if (!Schema::hasColumn('customer_addresses', 'province')) {
                    $table->string('province', 100)->nullable()->after('city');
                }
                if (!Schema::hasColumn('customer_addresses', 'postal_code')) {
                    $table->string('postal_code', 20)->nullable()->after('province');
                }
                if (!Schema::hasColumn('customer_addresses', 'delivery_instructions')) {
                    $table->text('delivery_instructions')->nullable()->after('postal_code');
                }
            });

            // Backfill existing rows with legacy column data
            try {
                DB::table('customer_addresses')
                    ->whereNull('recipient_name')
                    ->update([
                        'label' => DB::raw("CASE WHEN tag LIKE '%Job Site%' THEN 'Home' WHEN tag LIKE '%Project%' THEN 'Work' ELSE COALESCE(tag, 'Home') END"),
                        'recipient_name' => DB::raw("COALESCE(contact_name, 'Valued Customer')"),
                        'phone_number' => DB::raw("contact_phone"),
                        'address_line1' => DB::raw("COALESCE(address, 'Address')"),
                        'delivery_instructions' => DB::raw("notes"),
                        'city' => 'Santa Rosa',
                        'province' => 'Laguna',
                        'postal_code' => '4026',
                    ]);

                // Sync user_id from customers table
                DB::statement("
                    UPDATE customer_addresses ca
                    JOIN customers c ON ca.customer_id = c.id
                    SET ca.user_id = c.user_id
                    WHERE ca.user_id IS NULL AND c.user_id IS NOT NULL
                ");
            } catch (\Throwable $e) {
                // Non-critical data migration
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('customer_addresses')) {
            Schema::table('customer_addresses', function (Blueprint $table) {
                if (Schema::hasColumn('customer_addresses', 'user_id')) {
                    $table->dropConstrainedForeignId('user_id');
                }
                $columns = [
                    'label',
                    'recipient_name',
                    'phone_number',
                    'address_line1',
                    'barangay',
                    'city',
                    'province',
                    'postal_code',
                    'delivery_instructions',
                ];
                foreach ($columns as $column) {
                    if (Schema::hasColumn('customer_addresses', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }
    }
};
