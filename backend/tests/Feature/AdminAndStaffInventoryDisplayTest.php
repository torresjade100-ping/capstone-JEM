<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\StockAdjustment;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminAndStaffInventoryDisplayTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $staff;
    protected Product $product;
    protected Category $category;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
            'name' => 'Admin Boss',
        ]);

        $this->staff = User::factory()->create([
            'role' => 'staff',
            'status' => 'active',
            'name' => 'Staff Member',
        ]);

        $this->category = Category::create([
            'name' => 'Hardware Construction',
            'status' => 'active',
        ]);

        $brand = Brand::create([
            'name' => 'Holcim',
            'status' => 'active',
        ]);

        $this->product = Product::create([
            'category_id' => $this->category->id,
            'brand_id' => $brand->id,
            'name' => 'Portland Cement Type 1',
            'base_price' => 280.00,
            'selling_price' => 280.00,
            'cost_price' => 230.00,
            'unit' => 'bag',
            'stock_quantity' => 100,
            'low_stock_threshold' => 15,
            'status' => 'active',
        ]);

        StockAdjustment::create([
            'product_id' => $this->product->id,
            'user_id' => $this->admin->id,
            'adjustment_type' => 'restock',
            'quantity_before' => 0,
            'quantity_changed' => 100,
            'quantity_after' => 100,
            'reference_number' => 'BATCH-TEST-001',
            'reason' => 'Initial Inventory Inflow',
            'notes' => 'Setup verification',
        ]);
    }

    public function test_admin_can_retrieve_inventory_via_admin_and_root_endpoints()
    {
        Sanctum::actingAs($this->admin);

        $responseAdmin = $this->getJson('/api/admin/inventory');
        $responseAdmin->assertStatus(200);
        $responseAdmin->assertJsonStructure([
            'success',
            'data' => [
                '*' => [
                    'id',
                    'product_id',
                    'name',
                    'category',
                    'unit',
                    'selling_price',
                    'quantity',
                    'stock_status',
                    'status',
                ]
            ]
        ]);
        $this->assertCount(1, $responseAdmin->json('data'));

        $responseRoot = $this->getJson('/api/inventory');
        $responseRoot->assertStatus(200);
        $this->assertCount(1, $responseRoot->json('data'));
    }

    public function test_staff_can_retrieve_inventory_via_staff_admin_and_root_endpoints()
    {
        Sanctum::actingAs($this->staff);

        $responseStaff = $this->getJson('/api/staff/inventory');
        $responseStaff->assertStatus(200);
        $responseStaff->assertJsonStructure([
            'success',
            'data' => [
                '*' => [
                    'id',
                    'product_id',
                    'name',
                    'category',
                    'unit',
                    'selling_price',
                    'quantity',
                    'stock_status',
                    'status',
                ]
            ]
        ]);
        $this->assertCount(1, $responseStaff->json('data'));

        $responseAdminPath = $this->getJson('/api/admin/inventory');
        $responseAdminPath->assertStatus(200);
        $this->assertCount(1, $responseAdminPath->json('data'));

        $responseRoot = $this->getJson('/api/inventory');
        $responseRoot->assertStatus(200);
        $this->assertCount(1, $responseRoot->json('data'));
    }

    public function test_admin_and_staff_can_retrieve_stock_adjustments()
    {
        Sanctum::actingAs($this->admin);
        $adminResp = $this->getJson('/api/admin/stock-adjustments');
        $adminResp->assertStatus(200);
        $adminResp->assertJson(['success' => true]);

        Sanctum::actingAs($this->staff);
        $staffResp = $this->getJson('/api/staff/stock-adjustments');
        $staffResp->assertStatus(200);
        $staffResp->assertJson(['success' => true]);

        $rootResp = $this->getJson('/api/stock-adjustments');
        $rootResp->assertStatus(200);
        $rootResp->assertJson(['success' => true]);
    }

    public function test_stock_adjustments_contain_quantity_changed_and_quantity_change_attribute()
    {
        $adjustment = StockAdjustment::first();
        $this->assertNotNull($adjustment, 'StockAdjustment record should exist.');
        $this->assertEquals(100, $adjustment->quantity_changed);
        $this->assertEquals(100, $adjustment->quantity_change);

        Sanctum::actingAs($this->admin);
        $response = $this->getJson('/api/stock-adjustments');
        $response->assertStatus(200);
        $data = $response->json('data');
        $items = isset($data['data']) ? $data['data'] : $data;
        $this->assertNotEmpty($items);
        $this->assertArrayHasKey('quantity_change', $items[0]);
    }

    public function test_product_batches_can_be_retrieved_by_admin_and_staff()
    {
        Sanctum::actingAs($this->admin);
        $adminResp = $this->getJson("/api/admin/products/{$this->product->id}/batches");
        $adminResp->assertStatus(200);

        Sanctum::actingAs($this->staff);
        $staffResp = $this->getJson("/api/staff/products/{$this->product->id}/batches");
        $staffResp->assertStatus(200);

        $rootResp = $this->getJson("/api/products/{$this->product->id}/batches");
        $rootResp->assertStatus(200);
    }

    public function test_stock_adjustment_creates_record_and_synchronizes_inventory()
    {
        $initialStock = (int) $this->product->stock_quantity;
        $qtyChange = 25;

        Sanctum::actingAs($this->admin);
        $response = $this->postJson('/api/admin/stock-adjustments', [
            'product_id' => $this->product->id,
            'quantity_change' => $qtyChange,
            'reason' => 'Unit Test Restock Sync',
            'adjustment_type' => 'restock',
            'notes' => 'Automated test verification',
        ]);

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);

        $this->product->refresh();
        $this->assertEquals($initialStock + $qtyChange, (int) $this->product->stock_quantity);

        // Verify it appears in stock-adjustments list for staff
        Sanctum::actingAs($this->staff);
        $staffResp = $this->getJson("/api/staff/stock-adjustments/product/{$this->product->id}");
        $staffResp->assertStatus(200);
        $data = $staffResp->json('data');
        $this->assertTrue(collect($data)->contains('reason', 'Unit Test Restock Sync'));
    }
}
