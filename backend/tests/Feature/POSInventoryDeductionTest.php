<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\SalesTransaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class POSInventoryDeductionTest extends TestCase
{
    use RefreshDatabase;

    protected User $staff;
    protected Product $productA;
    protected Product $productB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->staff = User::factory()->create([
            'role' => 'staff',
            'status' => 'active',
        ]);

        $category = Category::create([
            'name' => 'Plumbing',
            'status' => 'active',
        ]);

        $brand = Brand::create([
            'name' => 'Atlanta',
            'status' => 'active',
        ]);

        $this->productA = Product::create([
            'category_id' => $category->id,
            'brand_id' => $brand->id,
            'name' => 'Blue Coupling 1/2"',
            'base_price' => 15.00,
            'selling_price' => 15.00,
            'stock_quantity' => 150,
            'unit' => 'piece',
            'status' => 'active',
        ]);

        $this->productB = Product::create([
            'category_id' => $category->id,
            'brand_id' => $brand->id,
            'name' => 'Cement 40kg',
            'base_price' => 240.00,
            'selling_price' => 240.00,
            'stock_quantity' => 80,
            'unit' => 'bag',
            'status' => 'active',
        ]);
    }

    /**
     * Test 1 — Single item: Stock 150, Buy 1 -> Expected 149
     */
    public function test_single_item_inventory_deduction(): void
    {
        $response = $this->actingAs($this->staff)->postJson('/api/staff/walk-in-orders', [
            'items' => [
                [
                    'product_id' => $this->productA->id,
                    'quantity' => 1,
                    'unit_price' => 15.00,
                ],
            ],
            'payment_method' => 'cash',
            'discount' => 0,
            'transaction_number' => 'ORD-TEST-001',
        ]);

        $response->assertStatus(200);
        $this->assertEquals(149, $this->productA->fresh()->stock_quantity);
    }

    /**
     * Test 2 — Multiple quantity: Stock 150, Buy 5 -> Expected 145
     */
    public function test_multiple_quantity_inventory_deduction(): void
    {
        $response = $this->actingAs($this->staff)->postJson('/api/staff/walk-in-orders', [
            'items' => [
                [
                    'product_id' => $this->productA->id,
                    'quantity' => 5,
                    'unit_price' => 15.00,
                ],
            ],
            'payment_method' => 'cash',
            'discount' => 0,
            'transaction_number' => 'ORD-TEST-002',
        ]);

        $response->assertStatus(200);
        $this->assertEquals(145, $this->productA->fresh()->stock_quantity);
    }

    /**
     * Test 3 — Multiple products: Product A 150 -> Buy 2 -> 148; Product B 80 -> Buy 3 -> 77
     */
    public function test_multiple_products_inventory_deduction(): void
    {
        $response = $this->actingAs($this->staff)->postJson('/api/staff/walk-in-orders', [
            'items' => [
                [
                    'product_id' => $this->productA->id,
                    'quantity' => 2,
                    'unit_price' => 15.00,
                ],
                [
                    'product_id' => $this->productB->id,
                    'quantity' => 3,
                    'unit_price' => 240.00,
                ],
            ],
            'payment_method' => 'cash',
            'discount' => 0,
            'transaction_number' => 'ORD-TEST-003',
        ]);

        $response->assertStatus(200);
        $this->assertEquals(148, $this->productA->fresh()->stock_quantity);
        $this->assertEquals(77, $this->productB->fresh()->stock_quantity);
    }

    /**
     * Test 4 — Insufficient stock: Stock 3, Buy 5 -> Rejected and stock remains 3
     */
    public function test_insufficient_stock_rejects_and_preserves_stock(): void
    {
        $this->productA->update(['stock_quantity' => 3]);

        $response = $this->actingAs($this->staff)->postJson('/api/staff/walk-in-orders', [
            'items' => [
                [
                    'product_id' => $this->productA->id,
                    'quantity' => 5,
                    'unit_price' => 15.00,
                ],
            ],
            'payment_method' => 'cash',
            'discount' => 0,
            'transaction_number' => 'ORD-TEST-004',
        ]);

        $response->assertStatus(422);
        $response->assertJson([
            'message' => 'Insufficient stock. Only 3 pcs of Blue Coupling 1/2" are available.',
        ]);
        $this->assertEquals(3, $this->productA->fresh()->stock_quantity);
    }

    /**
     * Test 5 — Duplicate confirmation: same transaction_number does not deduct stock again
     */
    public function test_idempotent_duplicate_transaction_does_not_deduct_again(): void
    {
        $txNumber = 'ORD-TEST-IDEMPOTENT';

        $first = $this->actingAs($this->staff)->postJson('/api/staff/walk-in-orders', [
            'items' => [
                [
                    'product_id' => $this->productA->id,
                    'quantity' => 2,
                    'unit_price' => 15.00,
                ],
            ],
            'payment_method' => 'cash',
            'discount' => 0,
            'transaction_number' => $txNumber,
        ]);
        $first->assertStatus(200);
        $this->assertEquals(148, $this->productA->fresh()->stock_quantity);

        // Send duplicate with same transaction_number
        $second = $this->actingAs($this->staff)->postJson('/api/staff/walk-in-orders', [
            'items' => [
                [
                    'product_id' => $this->productA->id,
                    'quantity' => 2,
                    'unit_price' => 15.00,
                ],
            ],
            'payment_method' => 'cash',
            'discount' => 0,
            'transaction_number' => $txNumber,
        ]);
        $second->assertStatus(200);
        $second->assertJsonPath('data.already_processed', true);

        // Stock MUST remain 148, not 146
        $this->assertEquals(148, $this->productA->fresh()->stock_quantity);
    }
}
