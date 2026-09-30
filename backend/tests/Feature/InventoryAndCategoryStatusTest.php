<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class InventoryAndCategoryStatusTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected Category $category;
    protected Brand $brand;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
        ]);

        $this->category = Category::create([
            'name' => 'Lumber & Timber',
            'description' => 'Construction lumber and wood materials',
            'status' => 'active',
        ]);

        $this->brand = Brand::create([
            'name' => 'JEM Mills',
            'status' => 'active',
        ]);
    }

    /**
     * TEST 1: Stock = 100, Reorder Level = 10 -> Expected: In Stock
     */
    public function test_1_stock_100_reorder_10_is_in_stock(): void
    {
        $product = Product::create([
            'category_id' => $this->category->id,
            'brand_id' => $this->brand->id,
            'name' => 'Coco Lumber 2x2x12',
            'base_price' => 120.00,
            'selling_price' => 120.00,
            'cost_price' => 85.00,
            'stock_quantity' => 100,
            'low_stock_threshold' => 10,
            'status' => 'active',
        ]);

        $this->assertEquals('in_stock', $product->stock_status);

        Sanctum::actingAs($this->admin);
        $res = $this->getJson('/api/admin/inventory');
        $res->assertOk();
        $item = collect($res->json('data'))->firstWhere('id', $product->id);
        $this->assertEquals('in_stock', $item['stock_status']);
    }

    /**
     * TEST 2: Stock = 10, Reorder Level = 10 -> Expected: Low Stock
     */
    public function test_2_stock_10_reorder_10_is_low_stock(): void
    {
        $product = Product::create([
            'category_id' => $this->category->id,
            'brand_id' => $this->brand->id,
            'name' => 'Marine Plywood 1/2"',
            'base_price' => 650.00,
            'selling_price' => 650.00,
            'cost_price' => 500.00,
            'stock_quantity' => 10,
            'low_stock_threshold' => 10,
            'status' => 'active',
        ]);

        $this->assertEquals('low_stock', $product->stock_status);

        Sanctum::actingAs($this->admin);
        $res = $this->getJson('/api/admin/inventory');
        $item = collect($res->json('data'))->firstWhere('id', $product->id);
        $this->assertEquals('low_stock', $item['stock_status']);
    }

    /**
     * TEST 3: Stock = 5, Reorder Level = 10 -> Expected: Low Stock
     */
    public function test_3_stock_5_reorder_10_is_low_stock(): void
    {
        $product = Product::create([
            'category_id' => $this->category->id,
            'brand_id' => $this->brand->id,
            'name' => 'Portland Cement 40kg',
            'base_price' => 260.00,
            'selling_price' => 260.00,
            'cost_price' => 210.00,
            'stock_quantity' => 5,
            'low_stock_threshold' => 10,
            'status' => 'active',
        ]);

        $this->assertEquals('low_stock', $product->stock_status);

        Sanctum::actingAs($this->admin);
        $res = $this->getJson('/api/admin/inventory');
        $item = collect($res->json('data'))->firstWhere('id', $product->id);
        $this->assertEquals('low_stock', $item['stock_status']);
    }

    /**
     * TEST 4: Stock = 0, Reorder Level = 10 -> Expected: Out of Stock
     */
    public function test_4_stock_0_reorder_10_is_out_of_stock(): void
    {
        $product = Product::create([
            'category_id' => $this->category->id,
            'brand_id' => $this->brand->id,
            'name' => 'Corrugated GI Sheet 8ft',
            'base_price' => 380.00,
            'selling_price' => 380.00,
            'cost_price' => 290.00,
            'stock_quantity' => 0,
            'low_stock_threshold' => 10,
            'status' => 'active',
        ]);

        $this->assertEquals('out_of_stock', $product->stock_status);

        Sanctum::actingAs($this->admin);
        $res = $this->getJson('/api/admin/inventory');
        $item = collect($res->json('data'))->firstWhere('id', $product->id);
        $this->assertEquals('out_of_stock', $item['stock_status']);
    }

    /**
     * TEST 5: Restock an Out of Stock product.
     * Expected: Stock quantity increases and status automatically changes to Low Stock or In Stock.
     */
    public function test_5_restock_out_of_stock_product_automatically_updates_status(): void
    {
        $product = Product::create([
            'category_id' => $this->category->id,
            'brand_id' => $this->brand->id,
            'name' => 'Steel Rebar 12mm x 6m',
            'base_price' => 320.00,
            'selling_price' => 320.00,
            'cost_price' => 250.00,
            'stock_quantity' => 0,
            'low_stock_threshold' => 10,
            'status' => 'active',
        ]);

        $this->assertEquals('out_of_stock', $product->stock_status);

        Sanctum::actingAs($this->admin);

        // Receive batch of 5 units -> 5 <= 10 -> status automatically Low Stock
        $this->postJson("/api/admin/products/{$product->id}/batches", [
            'product_id' => $product->id,
            'cost_price' => 250.00,
            'selling_price' => 320.00,
            'quantity' => 5,
            'received_date' => date('Y-m-d'),
        ])->assertCreated();

        $product->refresh();
        $this->assertEquals(5, $product->stock_quantity);
        $this->assertEquals('low_stock', $product->stock_status);

        // Receive another batch of 20 units -> 25 > 10 -> status automatically In Stock
        $this->postJson("/api/admin/products/{$product->id}/batches", [
            'product_id' => $product->id,
            'cost_price' => 250.00,
            'selling_price' => 320.00,
            'quantity' => 20,
            'received_date' => date('Y-m-d'),
        ])->assertCreated();

        $product->refresh();
        $this->assertEquals(25, $product->stock_quantity);
        $this->assertEquals('in_stock', $product->stock_status);
    }

    /**
     * TEST 6: Reduce an In Stock product below the reorder level.
     * Expected: Status automatically changes to Low Stock.
     */
    public function test_6_reduce_in_stock_below_reorder_level_automatically_becomes_low_stock(): void
    {
        $product = Product::create([
            'category_id' => $this->category->id,
            'brand_id' => $this->brand->id,
            'name' => 'PVC Blue Pipe 1/2"',
            'base_price' => 95.00,
            'selling_price' => 95.00,
            'cost_price' => 70.00,
            'stock_quantity' => 50,
            'low_stock_threshold' => 10,
            'status' => 'active',
        ]);

        $this->assertEquals('in_stock', $product->stock_status);

        Sanctum::actingAs($this->admin);

        // Reduce stock by 45 (from 50 down to 5)
        $this->postJson('/api/admin/stock-adjustments', [
            'product_id' => $product->id,
            'quantity_change' => -45,
            'adjustment_type' => 'damaged',
            'reason' => 'Damaged inventory written off',
        ])->assertOk();

        $product->refresh();
        $this->assertEquals(5, $product->stock_quantity);
        $this->assertEquals('low_stock', $product->stock_status);
    }

    /**
     * TEST 7: Reduce stock to zero.
     * Expected: Status automatically changes to Out of Stock.
     */
    public function test_7_reduce_stock_to_zero_automatically_becomes_out_of_stock(): void
    {
        $product = Product::create([
            'category_id' => $this->category->id,
            'brand_id' => $this->brand->id,
            'name' => 'Common Nails 3-inch (1kg)',
            'base_price' => 85.00,
            'selling_price' => 85.00,
            'cost_price' => 60.00,
            'stock_quantity' => 5,
            'low_stock_threshold' => 10,
            'status' => 'active',
        ]);

        $this->assertEquals('low_stock', $product->stock_status);

        Sanctum::actingAs($this->admin);

        // Reduce remaining 5 to zero
        $this->postJson('/api/admin/stock-adjustments', [
            'product_id' => $product->id,
            'quantity_change' => -5,
            'adjustment_type' => 'miscount',
            'reason' => 'Inventory write-off down to 0',
        ])->assertOk();

        $product->refresh();
        $this->assertEquals(0, $product->stock_quantity);
        $this->assertEquals('out_of_stock', $product->stock_status);
    }

    /**
     * TEST 8: Deactivate a category.
     * Expected: Category becomes Inactive and cannot be selected for new product assignments.
     */
    public function test_8_deactivate_category_prevents_new_product_assignment(): void
    {
        Sanctum::actingAs($this->admin);

        // Deactivate category
        $res = $this->postJson("/api/admin/categories/{$this->category->id}/deactivate");
        $res->assertOk();
        $this->assertEquals('inactive', $res->json('data.status'));

        $this->category->refresh();
        $this->assertEquals('inactive', $this->category->status);

        // Attempt to create a new product assigning this inactive category
        $prodRes = $this->postJson('/api/admin/products', [
            'category_id' => $this->category->id,
            'brand_id' => $this->brand->id,
            'name' => 'Brand New Product with Inactive Cat',
            'base_price' => 100.00,
            'cost_price' => 70.00,
            'selling_price' => 100.00,
            'stock_quantity' => 10,
            'low_stock_threshold' => 5,
            'status' => 'active',
        ]);

        $prodRes->assertStatus(422);
        $prodRes->assertJsonValidationErrors(['category_id']);
    }

    /**
     * TEST 9: Reactivate the category.
     * Expected: Category becomes Active and can be selected again.
     */
    public function test_9_reactivate_category_allows_product_assignment(): void
    {
        Sanctum::actingAs($this->admin);

        // First deactivate
        $this->category->update(['status' => 'inactive']);

        // Reactivate category via endpoint
        $res = $this->postJson("/api/admin/categories/{$this->category->id}/activate");
        $res->assertOk();
        $this->assertEquals('active', $res->json('data.status'));

        $this->category->refresh();
        $this->assertEquals('active', $this->category->status);

        // Now creating a product with this active category must succeed
        $prodRes = $this->postJson('/api/admin/products', [
            'category_id' => $this->category->id,
            'brand_id' => $this->brand->id,
            'name' => 'Brand New Product with Reactivated Cat',
            'base_price' => 150.00,
            'cost_price' => 100.00,
            'selling_price' => 150.00,
            'stock_quantity' => 20,
            'low_stock_threshold' => 5,
            'status' => 'active',
        ]);

        $prodRes->assertStatus(201);
        $this->assertDatabaseHas('products', ['name' => 'Brand New Product with Reactivated Cat']);
    }

    /**
     * TEST 10: Filter Inventory by In Stock, Low Stock, Out of Stock.
     * Expected: Only the correct products appear.
     */
    public function test_10_filter_inventory_by_stock_status(): void
    {
        Product::create([
            'category_id' => $this->category->id,
            'brand_id' => $this->brand->id,
            'name' => 'Healthy In Stock Item',
            'selling_price' => 100,
            'stock_quantity' => 80,
            'low_stock_threshold' => 10,
            'status' => 'active',
        ]);

        Product::create([
            'category_id' => $this->category->id,
            'brand_id' => $this->brand->id,
            'name' => 'Warning Low Stock Item',
            'selling_price' => 100,
            'stock_quantity' => 6,
            'low_stock_threshold' => 10,
            'status' => 'active',
        ]);

        Product::create([
            'category_id' => $this->category->id,
            'brand_id' => $this->brand->id,
            'name' => 'Alert Out of Stock Item',
            'selling_price' => 100,
            'stock_quantity' => 0,
            'low_stock_threshold' => 10,
            'status' => 'active',
        ]);

        Sanctum::actingAs($this->admin);

        // 1. In Stock Filter
        $inStockRes = $this->getJson('/api/admin/inventory?stock_status=in_stock');
        $inStockRes->assertOk();
        $inStockData = $inStockRes->json('data');
        $this->assertCount(1, $inStockData);
        $this->assertEquals('Healthy In Stock Item', $inStockData[0]['product_name']);
        $this->assertEquals('in_stock', $inStockData[0]['stock_status']);

        // 2. Low Stock Filter
        $lowStockRes = $this->getJson('/api/admin/inventory?stock_status=low_stock');
        $lowStockRes->assertOk();
        $lowStockData = $lowStockRes->json('data');
        $this->assertCount(1, $lowStockData);
        $this->assertEquals('Warning Low Stock Item', $lowStockData[0]['product_name']);
        $this->assertEquals('low_stock', $lowStockData[0]['stock_status']);

        // 3. Out of Stock Filter
        $outOfStockRes = $this->getJson('/api/admin/inventory?stock_status=out_of_stock');
        $outOfStockRes->assertOk();
        $outOfStockData = $outOfStockRes->json('data');
        $this->assertCount(1, $outOfStockData);
        $this->assertEquals('Alert Out of Stock Item', $outOfStockData[0]['product_name']);
        $this->assertEquals('out_of_stock', $outOfStockData[0]['stock_status']);
    }

    /**
     * TEST 11: Filter Categories by Active, Inactive.
     * Expected: Only the correct categories appear.
     */
    public function test_11_filter_categories_by_status(): void
    {
        $inactiveCat = Category::create([
            'name' => 'Seasonal Decorations',
            'description' => 'Temporarily archived holiday supplies',
            'status' => 'inactive',
        ]);

        Sanctum::actingAs($this->admin);

        // Filter active
        $activeRes = $this->getJson('/api/admin/categories?status=active&all=1');
        $activeRes->assertOk();
        $activeData = collect($activeRes->json('data'));
        $this->assertTrue($activeData->contains('name', 'Lumber & Timber'));
        $this->assertFalse($activeData->contains('name', 'Seasonal Decorations'));

        // Filter inactive
        $inactiveRes = $this->getJson('/api/admin/categories?status=inactive&all=1');
        $inactiveRes->assertOk();
        $inactiveData = collect($inactiveRes->json('data'));
        $this->assertTrue($inactiveData->contains('name', 'Seasonal Decorations'));
        $this->assertFalse($inactiveData->contains('name', 'Lumber & Timber'));

        // All categories
        $allRes = $this->getJson('/api/admin/categories?all=1');
        $allRes->assertOk();
        $allData = collect($allRes->json('data'));
        $this->assertTrue($allData->contains('name', 'Lumber & Timber'));
        $this->assertTrue($allData->contains('name', 'Seasonal Decorations'));
    }

    /**
     * TEST 12: Preserves relationship when product has inactive category, but rejects reassignment to inactive category.
     */
    public function test_12_existing_product_with_inactive_category_preserves_relationship(): void
    {
        $product = Product::create([
            'category_id' => $this->category->id,
            'brand_id' => $this->brand->id,
            'name' => 'Historical Treated Plank',
            'base_price' => 200.00,
            'selling_price' => 200.00,
            'stock_quantity' => 25,
            'low_stock_threshold' => 5,
            'status' => 'active',
        ]);

        // Category becomes inactive later
        $this->category->update(['status' => 'inactive']);

        Sanctum::actingAs($this->admin);

        // Updating price or description with category_id unchanged must succeed
        $updateRes = $this->putJson("/api/admin/products/{$product->id}", [
            'selling_price' => 220.00,
            'description' => 'Updated product description',
        ]);
        $updateRes->assertOk();
        $product->refresh();
        $this->assertEquals(220.00, (float) $product->selling_price);
        $this->assertEquals($this->category->id, $product->category_id);

        // Creating another inactive category
        $otherInactiveCat = Category::create([
            'name' => 'Obsolete Paints',
            'status' => 'inactive',
        ]);

        // Trying to reassign product to a different inactive category must be rejected (422)
        $reassignRes = $this->putJson("/api/admin/products/{$product->id}", [
            'category_id' => $otherInactiveCat->id,
        ]);
        $reassignRes->assertStatus(422);
        $reassignRes->assertJsonValidationErrors(['category_id']);
    }
}
