<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\RestockRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RestockRequestStaffTest extends TestCase
{
    use RefreshDatabase;

    protected User $staff;
    protected User $admin;
    protected Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        $this->staff = User::factory()->create([
            'name' => 'Staff Member',
            'email' => 'staff.restock@jem.com',
            'role' => 'staff',
            'status' => 'active',
        ]);

        $this->admin = User::factory()->create([
            'name' => 'Admin Manager',
            'email' => 'admin.restock@jem.com',
            'role' => 'admin',
            'status' => 'active',
        ]);

        $category = Category::create([
            'name' => 'Fasteners',
            'status' => 'active',
        ]);

        $brand = Brand::create([
            'name' => 'Stanley',
        ]);

        $this->product = Product::create([
            'name' => 'Hex Bolts 1/2 x 2',
            'sku' => 'HEX-122',
            'category_id' => $category->id,
            'brand_id' => $brand->id,
            'unit' => 'pcs',
            'stock_quantity' => 10,
            'reorder_level' => 20,
            'cost_price' => 5.00,
            'selling_price' => 10.00,
            'base_price' => 10.00,
            'status' => 'active',
        ]);
    }

    public function test_authenticated_staff_can_submit_restock_request_and_user_id_is_saved_from_sanctum(): void
    {
        Sanctum::actingAs($this->staff);

        $response = $this->postJson('/api/restock-requests', [
            'product_id' => $this->product->id,
            'requested_quantity' => 50,
            'notes' => 'Running critically low on hex bolts',
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'message' => 'Stock request submitted successfully.',
            ]);

        // Assert database has user_id populated with the Sanctum staff ID
        $this->assertDatabaseHas('restock_requests', [
            'product_id' => $this->product->id,
            'requested_quantity' => 50,
            'user_id' => $this->staff->id,
            'requested_by' => $this->staff->id,
            'status' => 'pending',
            'notes' => 'Running critically low on hex bolts',
        ]);

        $request = RestockRequest::first();
        $this->assertNotNull($request);
        $this->assertEquals($this->staff->id, $request->user_id);
        $this->assertEquals($this->staff->id, $request->requested_by);
        $this->assertEquals($this->staff->id, $request->user?->id);
        $this->assertEquals($this->staff->id, $request->requester?->id);
    }

    public function test_unauthenticated_user_cannot_submit_restock_request(): void
    {
        $response = $this->postJson('/api/restock-requests', [
            'product_id' => $this->product->id,
            'requested_quantity' => 25,
        ]);

        $response->assertStatus(401);
    }

    public function test_staff_can_view_only_their_own_restock_requests(): void
    {
        $otherStaff = User::factory()->create([
            'name' => 'Other Staff',
            'email' => 'other.staff@jem.com',
            'role' => 'staff',
            'status' => 'active',
        ]);

        RestockRequest::create([
            'product_id' => $this->product->id,
            'user_id' => $this->staff->id,
            'requested_quantity' => 15,
            'status' => 'pending',
            'notes' => 'Staff 1 request',
        ]);

        RestockRequest::create([
            'product_id' => $this->product->id,
            'user_id' => $otherStaff->id,
            'requested_quantity' => 30,
            'status' => 'pending',
            'notes' => 'Other staff request',
        ]);

        Sanctum::actingAs($this->staff);

        $response = $this->getJson('/api/restock-requests');
        $response->assertStatus(200);

        $data = $response->json('data.data');
        $this->assertCount(1, $data);
        $this->assertEquals($this->staff->id, $data[0]['user_id']);
        $this->assertEquals('Staff 1 request', $data[0]['notes']);
    }

    public function test_admin_can_view_all_restock_requests_with_user_and_requester(): void
    {
        RestockRequest::create([
            'product_id' => $this->product->id,
            'user_id' => $this->staff->id,
            'requested_quantity' => 40,
            'status' => 'pending',
        ]);

        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/restock-requests');
        $response->assertStatus(200);

        $data = $response->json('data.data');
        $this->assertCount(1, $data);
        $this->assertEquals($this->staff->id, $data[0]['user_id']);
        $this->assertEquals($this->staff->name, $data[0]['user']['name']);
        $this->assertEquals($this->staff->name, $data[0]['requester']['name']);
    }

    public function test_duplicate_submission_within_short_interval_is_idempotent(): void
    {
        Sanctum::actingAs($this->staff);

        $firstResponse = $this->postJson('/api/restock-requests', [
            'product_id' => $this->product->id,
            'requested_quantity' => 20,
            'notes' => 'Testing duplicate',
        ]);
        $firstResponse->assertStatus(201);

        $secondResponse = $this->postJson('/api/restock-requests', [
            'product_id' => $this->product->id,
            'requested_quantity' => 20,
            'notes' => 'Testing duplicate again',
        ]);

        $secondResponse->assertStatus(200);
        $this->assertTrue($secondResponse->json('is_duplicate'));
        $this->assertEquals($firstResponse->json('data.id'), $secondResponse->json('data.id'));
        $this->assertEquals(1, RestockRequest::count());
    }
}
