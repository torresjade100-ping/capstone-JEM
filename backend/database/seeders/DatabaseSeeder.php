<?php

namespace Database\Seeders;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Customer;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $admin = User::create([
            'name' => 'Administrator',
            'email' => 'admin@jemlumber.com',
            'phone' => '+639171234567',
            'password' => Hash::make('Password123!'),
            'role' => 'admin',
            'status' => 'active',
        ]);

        $staff = User::create([
            'name' => 'Staff Member',
            'email' => 'staff@jemlumber.com',
            'phone' => '+639181234567',
            'password' => Hash::make('Password123!'),
            'role' => 'staff',
            'status' => 'active',
        ]);

        $customer = User::create([
            'name' => 'Customer User',
            'email' => 'customer@jemlumber.com',
            'phone' => '+639191234567',
            'password' => Hash::make('Password123!'),
            'role' => 'customer',
            'status' => 'active',
        ]);

        Customer::create(['user_id' => $customer->id]);

        Category::create(['name' => 'Lumber', 'description' => 'Lumber products', 'status' => 'active']);
        Brand::create(['name' => 'Coco', 'description' => 'Coco Lumber', 'status' => 'active']);
    }
}
