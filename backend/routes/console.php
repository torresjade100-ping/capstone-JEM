<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('users:update-auth', function () {
    $admin = \App\Models\User::where('role', 'admin')->orWhere('email', 'admin@jemlumber.com')->orWhere('email', 'admin')->first();
    if ($admin) {
        $admin->update([
            'email' => 'admin',
            'password' => \Illuminate\Support\Facades\Hash::make('admin123'),
            'role' => 'admin',
            'status' => 'active',
        ]);
        $this->info("Admin updated: id={$admin->id}, email={$admin->email}, role={$admin->role}");
    } else {
        $admin = \App\Models\User::create([
            'name' => 'System Administrator',
            'email' => 'admin',
            'phone' => '+639171234567',
            'password' => \Illuminate\Support\Facades\Hash::make('admin123'),
            'role' => 'admin',
            'status' => 'active',
        ]);
        $this->info("Admin created: id={$admin->id}, email={$admin->email}, role={$admin->role}");
    }

    $staff = \App\Models\User::where('role', 'staff')->orWhere('email', 'staff@jemlumber.com')->orWhere('email', 'staff')->first();
    if ($staff) {
        $staff->update([
            'email' => 'staff',
            'password' => \Illuminate\Support\Facades\Hash::make('staff123'),
            'role' => 'staff',
            'status' => 'active',
        ]);
        if (!$staff->staff) {
            \App\Models\Staff::firstOrCreate(['user_id' => $staff->id], ['status' => 'active', 'position' => 'Staff']);
        }
        $this->info("Staff updated: id={$staff->id}, email={$staff->email}, role={$staff->role}");
    } else {
        $staff = \App\Models\User::create([
            'name' => 'Operations Staff',
            'email' => 'staff',
            'phone' => '+639181234567',
            'password' => \Illuminate\Support\Facades\Hash::make('staff123'),
            'role' => 'staff',
            'status' => 'active',
        ]);
        \App\Models\Staff::firstOrCreate(['user_id' => $staff->id], ['status' => 'active', 'position' => 'Staff']);
        $this->info("Staff created: id={$staff->id}, email={$staff->email}, role={$staff->role}");
    }
})->purpose('Update admin and staff credentials');

Artisan::command('users:test-auth', function () {
    $authController = new \App\Http\Controllers\Api\AuthController();

    // Test Admin Login
    $adminReq = \Illuminate\Http\Request::create('/api/auth/login', 'POST', [
        'email' => 'admin',
        'password' => 'admin123',
    ]);
    $adminRes = $authController->login($adminReq);
    $adminData = json_decode($adminRes->getContent(), true);
    $this->info("Admin Login Result: Status {$adminRes->getStatusCode()} - " . ($adminData['success'] ? 'SUCCESS' : 'FAILED: ' . ($adminData['message'] ?? '')));

    // Test Staff Login
    $staffReq = \Illuminate\Http\Request::create('/api/auth/login', 'POST', [
        'email' => 'staff',
        'password' => 'staff123'
    ]);
    $staffRes = $authController->login($staffReq);
    $staffData = json_decode($staffRes->getContent(), true);
    $this->info("Staff Login Result: Status {$staffRes->getStatusCode()} - " . ($staffData['success'] ? 'SUCCESS' : 'FAILED: ' . ($staffData['message'] ?? '')));
})->purpose('Test admin and staff login authentication');

Artisan::command('data:wipe-transactions-and-orders', function () {
    $this->warn('Wiping all transaction, order, sales, payment, and audit records...');

    \Illuminate\Support\Facades\Schema::disableForeignKeyConstraints();

    $tables = [
        'refunds',
        'voids',
        'transaction_items',
        'transactions',
        'order_adjustments',
        'backorders',
        'deliveries',
        'payment_transactions',
        'payments',
        'order_items',
        'orders',
        'sale_items',
        'sales_transactions',
        'cart_items',
    ];

    foreach ($tables as $table) {
        if (\Illuminate\Support\Facades\Schema::hasTable($table)) {
            \Illuminate\Support\Facades\DB::table($table)->truncate();
            $this->info("Truncated: {$table}");
        }
    }

    if (\Illuminate\Support\Facades\Schema::hasTable('audit_logs')) {
        \Illuminate\Support\Facades\DB::table('audit_logs')
            ->whereNotNull('transaction_id')
            ->orWhere('action', 'like', '%transaction%')
            ->orWhere('action', 'like', '%order%')
            ->orWhere('action', 'like', '%void%')
            ->orWhere('action', 'like', '%refund%')
            ->delete();
        $this->info("Cleaned transaction audit logs from: audit_logs");
    }

    \Illuminate\Support\Facades\Schema::enableForeignKeyConstraints();

    $this->info('Successfully wiped all transaction and order records. Ready for clean production use.');
})->purpose('Wipe all fake transactions, orders, and sales records while preserving products, categories, suppliers, and users');

Artisan::command('data:status', function () {
    $this->info("=== JEM System Database Counts ===");
    $this->line("Users: " . \App\Models\User::count());
    $this->line("Categories: " . \App\Models\Category::count());
    $this->line("Products: " . \App\Models\Product::count());
    $this->line("Suppliers: " . (\Illuminate\Support\Facades\Schema::hasTable('suppliers') ? \App\Models\Supplier::count() : 0));
    $this->line("Orders: " . (\Illuminate\Support\Facades\Schema::hasTable('orders') ? \App\Models\Order::count() : 0));
    $this->line("Transactions: " . (\Illuminate\Support\Facades\Schema::hasTable('transactions') ? \App\Models\Transaction::count() : 0));
    $this->line("Sales Transactions: " . (\Illuminate\Support\Facades\Schema::hasTable('sales_transactions') ? \Illuminate\Support\Facades\DB::table('sales_transactions')->count() : 0));
    $this->line("Backorders: " . (\Illuminate\Support\Facades\Schema::hasTable('backorders') ? \Illuminate\Support\Facades\DB::table('backorders')->count() : 0));
    $this->line("Refunds: " . (\Illuminate\Support\Facades\Schema::hasTable('refunds') ? \Illuminate\Support\Facades\DB::table('refunds')->count() : 0));
    $this->line("Voids: " . (\Illuminate\Support\Facades\Schema::hasTable('voids') ? \Illuminate\Support\Facades\DB::table('voids')->count() : 0));
})->purpose('Show system record counts');




