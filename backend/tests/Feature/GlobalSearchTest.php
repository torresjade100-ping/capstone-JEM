<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Feedback;
use App\Models\Order;
use App\Models\Product;
use App\Models\RestockRequest;
use App\Models\Supplier;
use App\Models\Transaction;
use App\Models\User;
use App\Models\VoidRecord;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class GlobalSearchTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'name' => 'System Administrator',
            'email' => 'admin@jem.com',
            'role' => 'admin',
            'status' => 'active',
        ]);
    }

    public function test_global_search_requires_admin_authentication(): void
    {
        $response = $this->getJson('/api/admin/global-search?q=test');
        $response->assertStatus(401);
    }

    public function test_global_search_returns_empty_when_query_is_empty(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/admin/global-search?q=');
        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'total_results' => 0,
            'results' => [],
        ]);
    }

    public function test_global_search_finds_users(): void
    {
        Sanctum::actingAs($this->admin);

        User::factory()->create([
            'name' => 'Juan Dela Cruz',
            'email' => 'juan@example.com',
            'role' => 'staff',
        ]);

        $response = $this->getJson('/api/admin/global-search?q=juan');
        $response->assertStatus(200);
        $response->assertJsonFragment(['title' => 'Juan Dela Cruz']);
        $this->assertArrayHasKey('users', $response->json('results'));
    }

    public function test_global_search_finds_products_and_inventory(): void
    {
        Sanctum::actingAs($this->admin);

        $cat = Category::create(['name' => 'Hardware & Tools', 'status' => 'active']);
        $brand = Brand::create(['name' => 'Stanley', 'status' => 'active']);

        Product::create([
            'category_id' => $cat->id,
            'brand_id' => $brand->id,
            'name' => 'Claw Hammer 16oz',
            'base_price' => 250.00,
            'selling_price' => 320.00,
            'cost_price' => 200.00,
            'stock_quantity' => 45,
            'low_stock_threshold' => 10,
            'status' => 'active',
        ]);

        $response = $this->getJson('/api/admin/global-search?q=hammer');
        $response->assertStatus(200);
        $response->assertJsonFragment(['title' => 'Claw Hammer 16oz']);
        $this->assertArrayHasKey('products', $response->json('results'));
        $this->assertArrayHasKey('inventory', $response->json('results'));
    }

    public function test_global_search_finds_categories(): void
    {
        Sanctum::actingAs($this->admin);

        Category::create([
            'name' => 'Electrical Supplies',
            'description' => 'Wires, switches, breakers',
            'status' => 'active',
        ]);

        $response = $this->getJson('/api/admin/global-search?q=electrical');
        $response->assertStatus(200);
        $response->assertJsonFragment(['title' => 'Electrical Supplies']);
        $this->assertArrayHasKey('categories', $response->json('results'));
    }

    public function test_global_search_finds_orders_and_transactions(): void
    {
        Sanctum::actingAs($this->admin);

        $customerUser = User::factory()->create(['name' => 'Maria Santos']);
        $customer = \App\Models\Customer::create(['user_id' => $customerUser->id]);

        Order::create([
            'customer_id' => $customer->id,
            'order_number' => 'ORD-9876',
            'total' => 1500.00,
            'status' => 'pending',
            'payment_method' => 'cod',
        ]);

        Transaction::create([
            'transaction_number' => 'TXN-5544',
            'reference_number' => 'TXN-5544',
            'customer_name' => 'Maria Santos',
            'total_net' => 1500.00,
            'total_amount' => 1500.00,
            'status' => 'paid',
            'payment_method' => 'cash',
            'date_time' => now(),
        ]);

        $response = $this->getJson('/api/admin/global-search?q=9876');
        $response->assertStatus(200);
        $response->assertJsonFragment(['title' => 'Order #ORD-9876']);

        $txResponse = $this->getJson('/api/admin/global-search?q=5544');
        $txResponse->assertStatus(200);
        $txResponse->assertJsonFragment(['title' => 'Transaction #TXN-5544']);
    }

    public function test_global_search_finds_suppliers(): void
    {
        Sanctum::actingAs($this->admin);

        Supplier::create([
            'name' => 'Davao Metal Works',
            'contact_person' => 'Pedro Penduko',
            'phone' => '09181234567',
            'status' => 'active',
        ]);

        $response = $this->getJson('/api/admin/global-search?q=metal');
        $response->assertStatus(200);
        $response->assertJsonFragment(['title' => 'Davao Metal Works']);
        $this->assertArrayHasKey('suppliers', $response->json('results'));
    }

    public function test_global_search_finds_reports(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/admin/global-search?q=valuation');
        $response->assertStatus(200);
        $response->assertJsonFragment(['title' => 'Inventory Valuation Report']);
        $this->assertArrayHasKey('reports', $response->json('results'));
    }

    public function test_global_search_finds_void_security(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/admin/global-search?q=pin');
        $response->assertStatus(200);
        $response->assertJsonFragment(['title' => 'Void Security PIN Control']);
        $this->assertArrayHasKey('void_security', $response->json('results'));
    }
}
