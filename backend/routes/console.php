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
        'password' => 'admin123'
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


