<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Category;
use App\Models\LossDamageTheft;
use App\Models\Product;
use App\Models\StockAdjustment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LossDamageTheftTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $staff;
    protected Category $category;
    protected Brand $brand;
    protected Product $product;

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
            'name' => 'Isaac Staff',
        ]);

        $this->category = Category::create([
            'name' => 'Hand Tools',
            'description' => 'Manual tools and hardware',
            'status' => 'active',
        ]);

        $this->brand = Brand::create([
            'name' => 'Stanley',
            'status' => 'active',
        ]);

        $this->product = Product::create([
            'category_id' => $this->category->id,
            'brand_id' => $this->brand->id,
            'name' => 'Claw Hammer 16oz',
            'base_price' => 250.00,
            'selling_price' => 300.00,
            'cost_price' => 200.00,
            'stock_quantity' => 50,
            'low_stock_threshold' => 5,
            'status' => 'active',
        ]);
    }

    /**
     * TEST 1: Staff creates a pending damaged incident without immediate stock deduction.
     */
    public function test_staff_can_report_pending_damaged_incident(): void
    {
        Sanctum::actingAs($this->staff);

        $response = $this->postJson('/api/loss-damage-thefts', [
            'product_id' => $this->product->id,
            'incident_type' => 'damaged',
            'quantity' => 2,
            'incident_date' => now()->toDateString(),
            'reported_by' => 'Isaac Staff',
            'reason' => 'Handle cracked during warehouse transport',
            'status' => 'pending',
            'action_taken' => 'Moved to quarantine area for inspection',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('loss_damage_thefts', [
            'product_id' => $this->product->id,
            'incident_type' => 'damaged',
            'quantity' => 2,
            'status' => 'pending',
            'stock_adjusted' => false,
        ]);

        // Stock remains 50 because it was not yet confirmed/resolved
        $this->assertEquals(50, $this->product->fresh()->stock_quantity);
    }

    /**
     * TEST 2: Admin creates a resolved incident which immediately deducts stock and logs adjustment.
     */
    public function test_confirmed_theft_incident_deducts_stock_and_creates_stock_adjustment(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/loss-damage-thefts', [
            'product_id' => $this->product->id,
            'incident_type' => 'stolen',
            'quantity' => 5,
            'incident_date' => now()->toDateString(),
            'reported_by' => 'Admin Boss',
            'reason' => 'Security footage showed item taken from shelf',
            'status' => 'resolved',
            'action_taken' => 'Filed police blotter and written off inventory',
        ]);

        $response->assertStatus(201);

        // Product stock must now be 50 - 5 = 45
        $this->assertEquals(45, $this->product->fresh()->stock_quantity);

        // Verify stock adjustment record exists with type 'stolen'
        $this->assertDatabaseHas('stock_adjustments', [
            'product_id' => $this->product->id,
            'adjustment_type' => 'stolen',
            'quantity_before' => 50,
            'quantity_changed' => -5,
            'quantity_after' => 45,
        ]);

        // Verify incident record has stock_adjusted = true
        $this->assertDatabaseHas('loss_damage_thefts', [
            'product_id' => $this->product->id,
            'incident_type' => 'stolen',
            'quantity' => 5,
            'status' => 'resolved',
            'stock_adjusted' => true,
        ]);
    }

    /**
     * TEST 3: Updating status to resolved deducts stock if not previously adjusted.
     */
    public function test_updating_status_to_resolved_triggers_stock_deduction(): void
    {
        Sanctum::actingAs($this->staff);

        $incident = LossDamageTheft::create([
            'product_id' => $this->product->id,
            'sku' => 'PRD-0001',
            'incident_type' => 'lost',
            'quantity' => 3,
            'incident_date' => now()->toDateString(),
            'reported_by' => 'Isaac Staff',
            'reason' => 'Missing from warehouse bin during cycle count',
            'status' => 'investigating',
            'stock_adjusted' => false,
            'created_by' => $this->staff->id,
        ]);

        $this->assertEquals(50, $this->product->fresh()->stock_quantity);

        // Admin updates status to resolved
        Sanctum::actingAs($this->admin);

        $response = $this->patchJson("/api/loss-damage-thefts/{$incident->id}/status", [
            'status' => 'resolved',
            'action_taken' => 'Investigation concluded item was lost. Inventory deducted.',
        ]);

        $response->assertStatus(200);

        // Stock should now be 47
        $this->assertEquals(47, $this->product->fresh()->stock_quantity);

        $this->assertDatabaseHas('loss_damage_thefts', [
            'id' => $incident->id,
            'status' => 'resolved',
            'stock_adjusted' => true,
        ]);
    }

    /**
     * TEST 4: Validation prevents insufficient stock deduction and invalid quantity.
     */
    public function test_rejects_quantity_greater_than_available_stock_when_confirming(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/loss-damage-thefts', [
            'product_id' => $this->product->id,
            'incident_type' => 'lost',
            'quantity' => 999, // Exceeds current stock of 50
            'incident_date' => now()->toDateString(),
            'reason' => 'Entire shipment gone',
            'status' => 'resolved', // requests deduction
        ]);

        $response->assertStatus(400);
        $this->assertEquals(50, $this->product->fresh()->stock_quantity);
    }

    /**
     * TEST 5: Summary endpoint aggregates totals, types, and financial loss correctly.
     */
    public function test_summary_aggregates_incident_metrics_correctly(): void
    {
        Sanctum::actingAs($this->admin);

        LossDamageTheft::create([
            'product_id' => $this->product->id,
            'incident_type' => 'lost',
            'quantity' => 2,
            'incident_date' => now()->toDateString(),
            'reported_by' => 'Isaac Staff',
            'reason' => 'Lost',
            'status' => 'pending',
        ]);

        LossDamageTheft::create([
            'product_id' => $this->product->id,
            'incident_type' => 'damaged',
            'quantity' => 3,
            'incident_date' => now()->toDateString(),
            'reported_by' => 'Isaac Staff',
            'reason' => 'Damaged',
            'status' => 'resolved',
        ]);

        LossDamageTheft::create([
            'product_id' => $this->product->id,
            'incident_type' => 'stolen',
            'quantity' => 1,
            'incident_date' => now()->toDateString(),
            'reported_by' => 'Admin Boss',
            'reason' => 'Stolen',
            'status' => 'investigating',
        ]);

        $response = $this->getJson('/api/loss-damage-thefts/summary');

        $response->assertStatus(200);
        $data = $response->json('data');

        $this->assertEquals(3, $data['total_incidents']);
        $this->assertEquals(6, $data['total_quantity_affected']); // 2 + 3 + 1
        $this->assertEquals(2, $data['by_type']['lost']['quantity']);
        $this->assertEquals(3, $data['by_type']['damaged']['quantity']);
        $this->assertEquals(1, $data['by_type']['stolen']['quantity']);

        // Cost price is 200.00 * 6 = 1200.00
        $this->assertEquals(1200.00, $data['total_estimated_loss']);
    }

    /**
     * TEST 6: Searching and filtering by incident type and status.
     */
    public function test_filtering_and_searching_loss_damage_theft_records(): void
    {
        Sanctum::actingAs($this->admin);

        LossDamageTheft::create([
            'product_id' => $this->product->id,
            'reference_number' => 'LDT-SEARCH-01',
            'incident_type' => 'damaged',
            'quantity' => 4,
            'incident_date' => now()->toDateString(),
            'reported_by' => 'Isaac Staff',
            'reason' => 'Broken glass in storage',
            'status' => 'pending',
        ]);

        LossDamageTheft::create([
            'product_id' => $this->product->id,
            'reference_number' => 'LDT-SEARCH-02',
            'incident_type' => 'stolen',
            'quantity' => 1,
            'incident_date' => now()->toDateString(),
            'reported_by' => 'Security Guard',
            'reason' => 'Theft in aisle 4',
            'status' => 'resolved',
        ]);

        // Filter by damaged
        $damagedResp = $this->getJson('/api/loss-damage-thefts?incident_type=damaged');
        $damagedResp->assertStatus(200);
        $this->assertCount(1, $damagedResp->json('data.data'));
        $this->assertEquals('damaged', $damagedResp->json('data.data.0.incident_type'));

        // Search by reason keyword "aisle"
        $searchResp = $this->getJson('/api/loss-damage-thefts?search=aisle');
        $searchResp->assertStatus(200);
        $this->assertCount(1, $searchResp->json('data.data'));
        $this->assertEquals('LDT-SEARCH-02', $searchResp->json('data.data.0.reference_number'));
    }
}
