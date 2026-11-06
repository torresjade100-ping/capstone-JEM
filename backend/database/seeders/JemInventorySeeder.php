<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class JemInventorySeeder extends Seeder
{
    public function run(): void
    {
        $this->call(ProductSeeder::class);
    }
}
