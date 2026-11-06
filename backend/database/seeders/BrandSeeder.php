<?php

namespace Database\Seeders;

use App\Models\Brand;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;

class BrandSeeder extends Seeder
{
    public function run(): void
    {
        $path = database_path('data/brands.json');
        if (!File::exists($path)) {
            $path = database_path('data/brands.example.json');
        }

        if (!File::exists($path)) {
            $this->command->warn("No brands file found at {$path}");
            return;
        }

        $brands = json_decode(File::get($path), true, 512, JSON_THROW_ON_ERROR);

        foreach ($brands as $brand) {
            Brand::firstOrCreate(
                ['name' => $brand['name']],
                [
                    'description' => $brand['description'] ?? null,
                    'status' => $brand['status'] ?? 'active',
                ]
            );
        }

        $this->command->info('Brands seeded successfully (' . count($brands) . ' records).');
    }
}
