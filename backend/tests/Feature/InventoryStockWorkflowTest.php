<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\Supplier;
use App\Models\User;
use App\Models\StockAdjustment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class InventoryStockWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected Category $category;
    protected Brand $brand;
    protected Supplier $supplier;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
        ]);

        $this->category = Category::create([
            'name' => 'Screens & Wire',
            'description' => 'Screen mesh and hardware wire',
            'status' => 'active',
        ]);

        $this->brand = Brand::create([
            'name' => 'Metro Screen',
            'status' => 'active',
        ]);

        $this->supplier = Supplier::create([
            'name' => 'Metro Hardware Supplies',
            'contact_person' => 'Juan Dela Cruz',
            'phone' => '09171234567',
            'email' => 'metro@example.com',
            'address' => 'Davao City',
            'status' => 'active',
        ]);
    }

    /**
     * TEST 1: RESTOCK
     * Current stock = 80, Restock = 20 -> New Stock = 100
     * Transaction: RESTOCK +20, 80 -> 100
     */
    public function test_1_restock_delivery_adds_stock_and_creates_restock_record(): void
    {
        Sanctum::actingAs($this->admin);

        $product = Product::create([
            'category_id' => $this->category->id,
            'brand_id' => $this->brand->id,
            'name' => 'Aluminum Screen 3ft',
            'base_price' => 150.00,
            'selling_price' => 180.00,
            'cost_price' => 120.00,
            'stock_quantity' => 80,
            'low_stock_threshold' => 10,
            'status' => 'active',
        ]);

        $this->assertEquals(80, $product->fresh()->stock_quantity);

        // Receive restock delivery of 20 meters
        $response = $this->postJson("/api/admin/products/{$product->id}/batches", [
            'quantity' => 20,
            'supplier_id' => $this->supplier->id,
            'reference_number' => 'PO-1042',
            'purchase_order' => 'PO-1042',
            'cost_price' => 120.00,
            'selling_price' => 180.00,
            'received_date' => now()->toDateString(),
            'notes' => 'Received batch from Metro Hardware PO-1042',
        ]);

        $response->assertStatus(201);

        // Product stock must now be 100
        $this->assertEquals(100, $product->fresh()->stock_quantity);

        // Stock adjustment record must exist with type 'restock'
        $this->assertDatabaseHas('stock_adjustments', [
            'product_id' => $product->id,
            'user_id' => $this->admin->id,
            'supplier_id' => $this->supplier->id,
            'adjustment_type' => 'restock',
            'quantity_before' => 80,
            'quantity_changed' => 20,
            'quantity_after' => 100,
            'reference_number' => 'PO-1042',
        ]);
    }

    /**
     * TEST 2: ADJUST DOWN
     * Current stock = 100, Physical count = 95 -> Adjustment = -5, New Stock = 95
     * Transaction: ADJUSTMENT -5, 100 -> 95
     */
    public function test_2_adjust_down_corrects_inventory_due_to_damaged_stock(): void
    {
        Sanctum::actingAs($this->admin);

        $product = Product::create([
            'category_id' => $this->category->id,
            'brand_id' => $this->brand->id,
            'name' => 'Aluminum Screen 3ft',
            'base_price' => 150.00,
            'selling_price' => 180.00,
            'cost_price' => 120.00,
            'stock_quantity' => 100,
            'low_stock_threshold' => 10,
            'status' => 'active',
        ]);

        // Physical count is 95, so adjustment delta is -5
        $response = $this->postJson('/api/admin/stock-adjustments', [
            'product_id' => $product->id,
            'quantity_change' => -5,
            'adjustment_type' => 'damaged',
            'reason' => 'Damaged Stock',
            'notes' => 'Screen mesh torn during storage',
        ]);

        $response->assertStatus(200);

        // Stock must be 95
        $this->assertEquals(95, $product->fresh()->stock_quantity);

        $this->assertDatabaseHas('stock_adjustments', [
            'product_id' => $product->id,
            'adjustment_type' => 'damaged',
            'quantity_before' => 100,
            'quantity_changed' => -5,
            'quantity_after' => 95,
            'reason' => 'Damaged Stock',
        ]);
    }

    /**
     * TEST 3: ADJUST UP
     * Current stock = 95, Physical count = 100 -> Adjustment = +5, New Stock = 100
     * Transaction: ADJUSTMENT +5, 95 -> 100
     */
    public function test_3_adjust_up_corrects_inventory_count(): void
    {
        Sanctum::actingAs($this->admin);

        $product = Product::create([
            'category_id' => $this->category->id,
            'brand_id' => $this->brand->id,
            'name' => 'Aluminum Screen 3ft',
            'base_price' => 150.00,
            'selling_price' => 180.00,
            'cost_price' => 120.00,
            'stock_quantity' => 95,
            'low_stock_threshold' => 10,
            'status' => 'active',
        ]);

        // Physical count is 100, so adjustment delta is +5
        $response = $this->postJson('/api/admin/stock-adjustments', [
            'product_id' => $product->id,
            'quantity_change' => 5,
            'adjustment_type' => 'adjustment',
            'reason' => 'Inventory Count Correction',
            'notes' => 'Found misplaced roll in warehouse aisle 3',
        ]);

        $response->assertStatus(200);

        $this->assertEquals(100, $product->fresh()->stock_quantity);

        $this->assertDatabaseHas('stock_adjustments', [
            'product_id' => $product->id,
            'adjustment_type' => 'adjustment',
            'quantity_before' => 95,
            'quantity_changed' => 5,
            'quantity_after' => 100,
            'reason' => 'Inventory Count Correction',
        ]);
    }

    /**
     * TEST 4: NO CHANGE
     * If quantity_change is 0, request is rejected with validation error
     */
    public function test_4_zero_quantity_adjustment_is_rejected_without_creating_transaction(): void
    {
        Sanctum::actingAs($this->admin);

        $product = Product::create([
            'category_id' => $this->category->id,
            'brand_id' => $this->brand->id,
            'name' => 'Aluminum Screen 3ft',
            'base_price' => 150.00,
            'selling_price' => 180.00,
            'cost_price' => 120.00,
            'stock_quantity' => 100,
            'low_stock_threshold' => 10,
            'status' => 'active',
        ]);

        $response = $this->postJson('/api/admin/stock-adjustments', [
            'product_id' => $product->id,
            'quantity_change' => 0,
            'adjustment_type' => 'adjustment',
            'reason' => 'Inventory Count Correction',
        ]);

        $response->assertStatus(422);

        // No adjustment record created
        $this->assertDatabaseMissing('stock_adjustments', [
            'product_id' => $product->id,
            'quantity_changed' => 0,
        ]);
        $this->assertEquals(100, $product->fresh()->stock_quantity);
    }

    /**
     * TEST 5: INVALID NEGATIVE COUNT
     * Trying to adjust stock below zero is prevented
     */
    public function test_5_invalid_negative_stock_adjustment_is_prevented(): void
    {
        Sanctum::actingAs($this->admin);

        $product = Product::create([
            'category_id' => $this->category->id,
            'brand_id' => $this->brand->id,
            'name' => 'Aluminum Screen 3ft',
            'base_price' => 150.00,
            'selling_price' => 180.00,
            'cost_price' => 120.00,
            'stock_quantity' => 5,
            'low_stock_threshold' => 10,
            'status' => 'active',
        ]);

        // Attempting to deduct 10 when stock is 5
        $response = $this->postJson('/api/admin/stock-adjustments', [
            'product_id' => $product->id,
            'quantity_change' => -10,
            'adjustment_type' => 'damaged',
            'reason' => 'Damaged Stock',
        ]);

        // Should return 400 error and preserve current stock of 5
        $response->assertStatus(400);
        $this->assertEquals(5, $product->fresh()->stock_quantity);
    }

    /**
     * TEST 6: HISTORY
     * History returns complete chronological log of RESTOCK and ADJUSTMENT transactions
     */
    public function test_6_history_shows_restock_and_adjustment_transactions_in_order(): void
    {
        Sanctum::actingAs($this->admin);

        $product = Product::create([
            'category_id' => $this->category->id,
            'brand_id' => $this->brand->id,
            'name' => 'Aluminum Screen 3ft',
            'base_price' => 150.00,
            'selling_price' => 180.00,
            'cost_price' => 120.00,
            'stock_quantity' => 60,
            'low_stock_threshold' => 10,
            'status' => 'active',
        ]);

        // Transaction 1: Restock +20 (60 -> 80)
        $this->postJson("/api/admin/products/{$product->id}/batches", [
            'quantity' => 20,
            'supplier_id' => $this->supplier->id,
            'reference_number' => 'PO-1042',
            'cost_price' => 120.00,
            'selling_price' => 180.00,
            'received_date' => now()->toDateString(),
            'notes' => 'Supplier delivery',
        ])->assertStatus(201);

        // Transaction 2: Adjust -5 (80 -> 75)
        $this->postJson('/api/admin/stock-adjustments', [
            'product_id' => $product->id,
            'quantity_change' => -5,
            'adjustment_type' => 'damaged',
            'reason' => 'Damaged Stock',
            'notes' => 'Damaged rolls',
        ])->assertStatus(200);

        // Fetch history
        $response = $this->getJson("/api/admin/stock-adjustments/product/{$product->id}");
        $response->assertStatus(200);

        $logs = $response->json('data') ?? $response->json();
        $this->assertCount(2, $logs);

        // Most recent should be the adjustment -5
        $this->assertEquals('damaged', $logs[0]['adjustment_type']);
        $this->assertEquals(-5, $logs[0]['quantity_changed']);
        $this->assertEquals(80, $logs[0]['quantity_before']);
        $this->assertEquals(75, $logs[0]['quantity_after']);

        // Older should be the restock +20
        $this->assertEquals('restock', $logs[1]['adjustment_type']);
        $this->assertEquals(20, $logs[1]['quantity_changed']);
        $this->assertEquals(60, $logs[1]['quantity_before']);
        $this->assertEquals(80, $logs[1]['quantity_after']);
        $this->assertEquals('PO-1042', $logs[1]['reference_number']);
    }

    /**
     * TEST 7: DATA CONSISTENCY
     * Fresh queries to product and transactions confirm data integrity
     */
    public function test_7_data_consistency_across_queries(): void
    {
        Sanctum::actingAs($this->admin);

        $product = Product::create([
            'category_id' => $this->category->id,
            'brand_id' => $this->brand->id,
            'name' => 'Aluminum Screen 3ft',
            'base_price' => 150.00,
            'selling_price' => 180.00,
            'cost_price' => 120.00,
            'stock_quantity' => 80,
            'low_stock_threshold' => 10,
            'status' => 'active',
        ]);

        // Restock +20
        $this->postJson("/api/admin/products/{$product->id}/batches", [
            'quantity' => 20,
            'supplier_id' => $this->supplier->id,
            'reference_number' => 'PO-999',
            'cost_price' => 120.00,
            'selling_price' => 180.00,
            'received_date' => now()->toDateString(),
        ])->assertStatus(201);

        $freshProduct = Product::find($product->id);
        $this->assertEquals(100, $freshProduct->stock_quantity);
        $this->assertEquals('in_stock', $freshProduct->stock_status);

        // Total sum of stock adjustments matches delta
        $adjustmentsSum = StockAdjustment::where('product_id', $product->id)->sum('quantity_changed');
        $this->assertEquals(20, $adjustmentsSum);
    }
}
