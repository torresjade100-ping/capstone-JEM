<?php

namespace Database\Seeders;

use App\Models\Customer;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $path = database_path('data/users.json');
        if (!File::exists($path)) {
            $path = database_path('data/users.example.json');
        }

        if (!File::exists($path)) {
            $this->command->warn("No users file found at {$path}");
            return;
        }

        $users = json_decode(File::get($path), true, 512, JSON_THROW_ON_ERROR);

        foreach ($users as $userData) {
            $user = User::firstOrCreate(
                ['email' => $userData['email']],
                [
                    'name' => $userData['name'],
                    'phone' => $userData['phone'] ?? null,
                    'password' => Hash::make($userData['password']),
                    'role' => $userData['role'] ?? 'customer',
                    'status' => $userData['status'] ?? 'active',
                ]
            );

            if (!empty($userData['customer_profile'])) {
                Customer::firstOrCreate(
                    ['user_id' => $user->id],
                    $userData['customer_profile']
                );
            }
        }

        $this->command->info('Users and customer profiles seeded successfully (' . count($users) . ' records).');
    }
}
