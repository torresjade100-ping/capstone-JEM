<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('payments')) {
            Schema::table('payments', function (Blueprint $table) {
                if (! Schema::hasColumn('payments', 'reference_number')) {
                    $table->string('reference_number')->nullable()->after('method');
                }
                if (! Schema::hasColumn('payments', 'transaction_date')) {
                    $table->dateTime('transaction_date')->nullable()->after('reference_number');
                }
                if (! Schema::hasColumn('payments', 'verified_by')) {
                    $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete()->after('transaction_date');
                }
            });
        }
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            if (Schema::hasColumn('payments', 'verified_by')) {
                $table->dropForeign([ 'verified_by' ]);
                $table->dropColumn('verified_by');
            }
            if (Schema::hasColumn('payments', 'transaction_date')) {
                $table->dropColumn('transaction_date');
            }
            if (Schema::hasColumn('payments', 'reference_number')) {
                $table->dropColumn('reference_number');
            }
        });
    }
};
