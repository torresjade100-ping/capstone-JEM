<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $path = database_path('data/categories.json');
        if (!File::exists($path)) {
            $path = database_path('data/categories.example.json');
        }

        if (!File::exists($path)) {
            $this->command->warn("No categories file found at {$path}");
            return;
        }

        $categories = json_decode(File::get($path), true, 512, JSON_THROW_ON_ERROR);

        foreach ($categories as $cat) {
            Category::firstOrCreate(
                ['name' => $cat['name']],
                [
                    'description' => $cat['description'] ?? null,
                    'status' => $cat['status'] ?? 'active',
                ]
            );
        }

        $this->command->info('Categories seeded successfully (' . count($categories) . ' records).');
    }
}
