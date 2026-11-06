<?php

namespace Database\Seeders;

use App\Models\Brand;
use App\Models\Category;
use App\Models\InventoryBatch;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $path = database_path('data/products.json');

        if (!File::exists($path)) {
            $path = database_path('data/products.example.json');
        }

        if (!File::exists($path)) {
            $this->command->error("No product seed file found at {$path}");
            return;
        }

        $items = json_decode(File::get($path), true, 512, JSON_THROW_ON_ERROR);

        if (empty($items)) {
            $this->command->warn('No items found in ' . $path);
            return;
        }

        // 1. Ensure Foreign Key constraints are disabled during clean wipe
        Schema::disableForeignKeyConstraints();

        if (Schema::hasTable('cart_items')) {
            DB::table('cart_items')->truncate();
        }
        if (Schema::hasTable('order_adjustments')) {
            DB::table('order_adjustments')->truncate();
        }
        if (Schema::hasTable('backorders')) {
            DB::table('backorders')->truncate();
        }
        if (Schema::hasTable('order_items')) {
            DB::table('order_items')->truncate();
        }
        if (Schema::hasTable('orders')) {
            DB::table('orders')->truncate();
        }
        if (Schema::hasTable('stock_adjustments')) {
            DB::table('stock_adjustments')->truncate();
        }
        if (Schema::hasTable('restock_requests')) {
            DB::table('restock_requests')->truncate();
        }
        if (Schema::hasTable('inventory_batches')) {
            DB::table('inventory_batches')->truncate();
        }
        if (Schema::hasTable('product_variants')) {
            DB::table('product_variants')->truncate();
        }
        if (Schema::hasTable('customer_wishlists')) {
            DB::table('customer_wishlists')->truncate();
        }
        if (Schema::hasTable('products')) {
            DB::table('products')->truncate();
        }

        Schema::enableForeignKeyConstraints();

        // 2. Pre-index Categories and Brands in memory to eliminate N+1 queries
        $categories = Category::all()->keyBy('name');
        $brands = Brand::all()->keyBy('name');

        $defaultCatId = $categories['Lumber']->id ?? $categories->first()?->id ?? 1;
        $defaultBrandId = $brands['Generic']->id ?? $brands->first()?->id ?? 1;

        $totalItems = count($items);
        $this->command->info("Seeding {$totalItems} products using chunking and transactions...");

        // 3. Batch / Chunk Processing (chunks of 50)
        $chunks = array_chunk($items, 50);
        $batchCounter = 1;

        foreach ($chunks as $chunk) {
            DB::transaction(function () use ($chunk, $categories, $brands, $defaultCatId, $defaultBrandId, &$batchCounter) {
                foreach ($chunk as $item) {
                    $catId = isset($item['category']) && $categories->has($item['category'])
                        ? $categories->get($item['category'])->id
                        : $defaultCatId;

                    $brandId = isset($item['brand']) && $brands->has($item['brand'])
                        ? $brands->get($item['brand'])->id
                        : $defaultBrandId;

                    $product = Product::create([
                        'category_id' => $catId,
                        'brand_id' => $brandId,
                        'name' => $item['name'],
                        'description' => $item['description'] ?? null,
                        'base_price' => $item['selling_price'] ?? 0,
                        'cost_price' => $item['cost_price'] ?? 0,
                        'selling_price' => $item['selling_price'] ?? 0,
                        'unit' => $item['unit'] ?? 'piece',
                        'image' => $item['image'] ?? null,
                        'stock_quantity' => $item['stock'] ?? 0,
                        'low_stock_threshold' => 10,
                        'status' => 'active',
                    ]);

                    // Product Variant
                    if (!empty($item['sku'])) {
                        ProductVariant::create([
                            'product_id' => $product->id,
                            'sku' => $item['sku'],
                            'size' => $item['size'] ?? 'Standard',
                            'price' => $item['selling_price'] ?? 0,
                            'stock_quantity' => $item['stock'] ?? 0,
                            'status' => 'active',
                        ]);
                    }

                    // Inventory Batch
                    if (Schema::hasTable('inventory_batches')) {
                        $batchNumber = 'BATCH-' . date('Y') . '-' . str_pad($batchCounter++, 4, '0', STR_PAD_LEFT);
                        InventoryBatch::create([
                            'product_id' => $product->id,
                            'batch_number' => $batchNumber,
                            'supplier_id' => null,
                            'supplier_name' => 'JEM Hardware Main Yard',
                            'cost_price' => $item['cost_price'] ?? 0,
                            'selling_price' => $item['selling_price'] ?? 0,
                            'initial_quantity' => $item['stock'] ?? 0,
                            'quantity' => $item['stock'] ?? 0,
                            'received_date' => now()->toDateString(),
                            'status' => 'active',
                            'notes' => 'Physical store inventory',
                        ]);
                    }
                }
            });

            $this->command->getOutput()->write('.');
        }

        $this->command->newLine();
        $this->command->info("Products, variants, and inventory batches seeded successfully ({$totalItems} items).");
    }
}
