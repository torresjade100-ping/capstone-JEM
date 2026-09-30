<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\Refund;
use App\Models\Transaction;
use App\Models\User;
use App\Models\VoidRecord;
use App\Models\VoidSecuritySetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class TransactionsAuditLedgerTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $staff;
    protected Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'name' => 'Isaac Daumar',
            'role' => 'admin',
            'status' => 'active',
        ]);

        $this->staff = User::factory()->create([
            'name' => 'Paolo Mendoza',
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

        $this->product = Product::create([
            'category_id' => $category->id,
            'brand_id' => $brand->id,
            'name' => 'Blue Coupling 1/2"',
            'sku' => 'HW-COUPLING-01',
            'base_price' => 30.00,
            'selling_price' => 35.00,
            'stock_quantity' => 100,
            'unit' => 'piece',
            'status' => 'active',
        ]);

        // Configure default 6-digit Void PIN (123456)
        VoidSecuritySetting::updateOrCreate(
            ['id' => 1],
            [
                'void_pin_hash' => Hash::make('123456'),
                'configured_by' => $this->admin->id,
                'configured_at' => now(),
            ]
        );
    }

    /**
     * TEST 1: Staff creates a normal sale.
     * Expected:
     * - transaction appears in Transactions
     * - status = PAID
     * - inventory decreases
     * - receipt available
     */
    public function test_1_staff_creates_normal_sale(): void
    {
        $initialStock = $this->product->stock_quantity;
        $orderNumber = 'ORD-20260924-0001';

        $response = $this->actingAs($this->staff, 'sanctum')->postJson('/api/staff/walk-in-orders', [
            'transaction_number' => $orderNumber,
            'customer_name' => 'Walk-in',
            'payment_method' => 'cash',
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'quantity' => 2,
                    'unit_price' => 35.00,
                ],
            ],
            'amount_received' => 100.00,
            'change_amount' => 30.00,
        ]);

        $response->assertStatus(200);

        // Assert transaction was created in DB
        $tx = Transaction::where('transaction_number', $orderNumber)->first();
        $this->assertNotNull($tx);
        $this->assertEquals('PAID', $tx->status);
        $this->assertEquals(70.00, (float) $tx->total_net);
        $this->assertStringContainsString('Paolo Mendoza', $tx->cashier_name);

        // Assert inventory decreased
        $this->assertEquals($initialStock - 2, $this->product->fresh()->stock_quantity);

        // Assert appears in transactions endpoint
        $txListResponse = $this->actingAs($this->staff, 'sanctum')->getJson('/api/transactions');
        $txListResponse->assertStatus(200);
        $txListResponse->assertJsonFragment(['transaction_number' => $orderNumber]);

        // Assert receipt endpoint
        $receiptResponse = $this->actingAs($this->staff, 'sanctum')->getJson("/api/transactions/{$tx->id}/receipt");
        $receiptResponse->assertStatus(200);
        $receiptResponse->assertJsonFragment(['transaction_number' => $orderNumber]);
    }

    /**
     * TEST 2: Admin creates a sale.
     * Expected:
     * - transaction appears
     * - cashier is recorded as Admin
     * - receipt available
     */
    public function test_2_admin_creates_sale(): void
    {
        $orderNumber = 'ORD-20260924-0002';

        $response = $this->actingAs($this->admin, 'sanctum')->postJson('/api/pos/checkout', [
            'transaction_number' => $orderNumber,
            'customer_name' => 'Walk-in',
            'payment_method' => 'cash',
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'quantity' => 1,
                    'unit_price' => 35.00,
                ],
            ],
        ]);

        $response->assertStatus(200);

        $tx = Transaction::where('transaction_number', $orderNumber)->first();
        $this->assertNotNull($tx);
        $this->assertEquals('PAID', $tx->status);
        $this->assertStringContainsString('Admin', $tx->cashier_name);

        $receiptResponse = $this->actingAs($this->admin, 'sanctum')->getJson("/api/transactions/{$tx->id}/receipt");
        $receiptResponse->assertStatus(200);
    }

    /**
     * TEST 3: Staff prints receipt.
     * Expected:
     * - receipt prints/displays
     * - no duplicate transaction created
     * - logs RECEIPT_PRINTED
     */
    public function test_3_staff_prints_receipt_no_duplicate_created(): void
    {
        $tx = Transaction::create([
            'transaction_number' => 'ORD-20260924-0003',
            'cashier_id' => $this->staff->id,
            'cashier_name' => 'Paolo Mendoza (Staff)',
            'customer_name' => 'Walk-in',
            'payment_method' => 'CASH',
            'gross_subtotal' => 35.00,
            'discount' => 0.00,
            'total_net' => 35.00,
            'amount_tendered' => 50.00,
            'change_due' => 15.00,
            'status' => 'PAID',
            'date_time' => now(),
        ]);

        $initialTxCount = Transaction::count();

        // Print once
        $res1 = $this->actingAs($this->staff, 'sanctum')->getJson("/api/transactions/{$tx->id}/receipt");
        $res1->assertStatus(200);

        // Reprint second time
        $res2 = $this->actingAs($this->staff, 'sanctum')->getJson("/api/transactions/{$tx->id}/receipt");
        $res2->assertStatus(200);

        // Total transaction count must remain unchanged
        $this->assertEquals($initialTxCount, Transaction::count());

        // Verify audit log for RECEIPT_PRINTED
        $log = AuditLog::where('action', 'RECEIPT_PRINTED')->where('transaction_id', $tx->id)->first();
        $this->assertNotNull($log);
    }

    /**
     * TEST 4: Refund a PAID transaction.
     * Expected:
     * - refund record created
     * - status = REFUNDED
     * - inventory restored
     * - audit log created
     */
    public function test_4_refund_paid_transaction(): void
    {
        // Setup initial sale: 100 in stock, purchase 5 -> 95
        $tx = Transaction::create([
            'transaction_number' => 'ORD-20260924-0004',
            'cashier_id' => $this->staff->id,
            'cashier_name' => 'Paolo Mendoza (Staff)',
            'customer_name' => 'Walk-in',
            'payment_method' => 'CASH',
            'gross_subtotal' => 175.00,
            'discount' => 0.00,
            'total_net' => 175.00,
            'status' => 'PAID',
            'date_time' => now(),
        ]);

        $tx->items()->create([
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'sku' => $this->product->sku,
            'quantity' => 5,
            'unit_price' => 35.00,
            'line_total' => 175.00,
        ]);

        $this->product->update(['stock_quantity' => 95]);

        // Process Refund
        $res = $this->actingAs($this->staff, 'sanctum')->postJson("/api/transactions/{$tx->id}/refund", [
            'reason' => 'Customer ordered incorrect coupling size',
        ]);

        $res->assertStatus(200);

        // Assert transaction status updated
        $this->assertEquals('REFUNDED', $tx->fresh()->status);

        // Assert inventory restored: 95 + 5 = 100
        $this->assertEquals(100, $this->product->fresh()->stock_quantity);

        // Assert refund record created
        $refund = Refund::where('transaction_id', $tx->id)->first();
        $this->assertNotNull($refund);
        $this->assertEquals(175.00, (float) $refund->amount);

        // Assert audit log
        $audit = AuditLog::where('action', 'REFUND_CREATED')->where('transaction_id', $tx->id)->first();
        $this->assertNotNull($audit);
    }

    /**
     * TEST 5: Staff attempts to void with wrong PIN.
     * Expected:
     * - void rejected ("Invalid Void PIN.")
     * - transaction remains PAID
     * - no inventory change
     * - failed attempt does not expose PIN
     * - no void record created
     */
    public function test_5_staff_attempts_void_with_wrong_pin(): void
    {
        $tx = Transaction::create([
            'transaction_number' => 'ORD-20260924-0005',
            'cashier_id' => $this->staff->id,
            'cashier_name' => 'Paolo Mendoza (Staff)',
            'customer_name' => 'Walk-in',
            'payment_method' => 'CASH',
            'gross_subtotal' => 70.00,
            'discount' => 0.00,
            'total_net' => 70.00,
            'status' => 'PAID',
            'date_time' => now(),
        ]);

        $tx->items()->create([
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'sku' => $this->product->sku,
            'quantity' => 2,
            'unit_price' => 35.00,
            'line_total' => 70.00,
        ]);

        $stockBefore = $this->product->fresh()->stock_quantity;

        // Attempt void with WRONG PIN (999999)
        $res = $this->actingAs($this->staff, 'sanctum')->postJson("/api/transactions/{$tx->id}/void", [
            'reason' => 'Cashier duplicate entry',
            'void_pin' => '999999',
        ]);

        $res->assertStatus(422);
        $res->assertJsonFragment(['message' => 'Invalid Void PIN.']);

        // Transaction remains PAID
        $this->assertEquals('PAID', $tx->fresh()->status);

        // No inventory change
        $this->assertEquals($stockBefore, $this->product->fresh()->stock_quantity);

        // No void record created
        $this->assertNull(VoidRecord::where('transaction_id', $tx->id)->first());
    }

    /**
     * TEST 6: Staff voids with correct 6-digit PIN.
     * Expected:
     * - status = VOIDED
     * - inventory restored
     * - void reason recorded
     * - user recorded
     * - timestamp recorded
     * - audit log created
     */
    public function test_6_staff_voids_with_correct_pin(): void
    {
        $tx = Transaction::create([
            'transaction_number' => 'ORD-20260924-0006',
            'cashier_id' => $this->staff->id,
            'cashier_name' => 'Paolo Mendoza (Staff)',
            'customer_name' => 'Walk-in',
            'payment_method' => 'CASH',
            'gross_subtotal' => 70.00,
            'discount' => 0.00,
            'total_net' => 70.00,
            'status' => 'PAID',
            'date_time' => now(),
        ]);

        $tx->items()->create([
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'sku' => $this->product->sku,
            'quantity' => 2,
            'unit_price' => 35.00,
            'line_total' => 70.00,
        ]);

        $this->product->update(['stock_quantity' => 98]);

        // Attempt void with CORRECT PIN (123456)
        $res = $this->actingAs($this->staff, 'sanctum')->postJson("/api/transactions/{$tx->id}/void", [
            'reason' => 'Customer cancelled order before leaving counter',
            'void_pin' => '123456',
        ]);

        $res->assertStatus(200);

        // Transaction marked VOIDED
        $this->assertEquals('VOIDED', $tx->fresh()->status);

        // Inventory restored: 98 + 2 = 100
        $this->assertEquals(100, $this->product->fresh()->stock_quantity);

        // VoidRecord created
        $voidRecord = VoidRecord::where('transaction_id', $tx->id)->first();
        $this->assertNotNull($voidRecord);
        $this->assertEquals($this->staff->id, $voidRecord->voided_by);
        $this->assertEquals('Customer cancelled order before leaving counter', $voidRecord->reason);

        // Audit log created
        $audit = AuditLog::where('action', 'TRANSACTION_VOIDED')->where('transaction_id', $tx->id)->first();
        $this->assertNotNull($audit);
    }

    /**
     * TEST 7: Staff tries to access Void Security.
     * Expected:
     * - access denied (403)
     */
    public function test_7_staff_access_to_void_security_denied(): void
    {
        $statusRes = $this->actingAs($this->staff, 'sanctum')->getJson('/api/admin/void-security/status');
        $statusRes->assertStatus(403);

        $setupRes = $this->actingAs($this->staff, 'sanctum')->postJson('/api/admin/void-security/setup', [
            'pin' => '654321',
            'pin_confirmation' => '654321',
        ]);
        $setupRes->assertStatus(403);

        $changeRes = $this->actingAs($this->staff, 'sanctum')->postJson('/api/admin/void-security/change', [
            'current_pin' => '123456',
            'pin' => '654321',
            'pin_confirmation' => '654321',
        ]);
        $changeRes->assertStatus(403);
    }

    /**
     * TEST 8: Admin creates Void PIN.
     * Expected:
     * - exactly 6 digits accepted
     * - invalid length rejected
     * - letters rejected
     * - PIN stored only as secure hash
     */
    public function test_8_admin_creates_void_pin(): void
    {
        // Delete existing setting to simulate unconfigured state
        VoidSecuritySetting::truncate();

        // 1. Letters rejected
        $resLetters = $this->actingAs($this->admin, 'sanctum')->postJson('/api/admin/void-security/setup', [
            'pin' => 'abcdef',
            'pin_confirmation' => 'abcdef',
        ]);
        $resLetters->assertStatus(422);

        // 2. Short length (5 digits) rejected
        $resShort = $this->actingAs($this->admin, 'sanctum')->postJson('/api/admin/void-security/setup', [
            'pin' => '12345',
            'pin_confirmation' => '12345',
        ]);
        $resShort->assertStatus(422);

        // 3. Valid 6-digit PIN accepted
        $resValid = $this->actingAs($this->admin, 'sanctum')->postJson('/api/admin/void-security/setup', [
            'pin' => '849201',
            'pin_confirmation' => '849201',
        ]);
        $resValid->assertStatus(200);

        // Verify stored in DB as hash (NOT plaintext)
        $setting = VoidSecuritySetting::first();
        $this->assertNotNull($setting);
        $this->assertNotEquals('849201', $setting->void_pin_hash);
        $this->assertTrue(Hash::check('849201', $setting->void_pin_hash));

        // Audit log created for VOID_PIN_CREATED
        $audit = AuditLog::where('action', 'VOID_PIN_CREATED')->first();
        $this->assertNotNull($audit);
    }

    /**
     * TEST 9: Admin changes Void PIN.
     * Expected:
     * - current PIN required
     * - new PIN exactly 6 digits
     * - confirmation required
     * - new hash saved
     * - old PIN no longer works
     */
    public function test_9_admin_changes_void_pin(): void
    {
        // Current PIN is 123456
        $resWrongCurrent = $this->actingAs($this->admin, 'sanctum')->postJson('/api/admin/void-security/change', [
            'current_pin' => '000000',
            'pin' => '987654',
            'pin_confirmation' => '987654',
        ]);
        $resWrongCurrent->assertStatus(422);
        $resWrongCurrent->assertJsonFragment(['message' => 'Current Void PIN is incorrect.']);

        // Change with correct current PIN
        $resChange = $this->actingAs($this->admin, 'sanctum')->postJson('/api/admin/void-security/change', [
            'current_pin' => '123456',
            'pin' => '987654',
            'pin_confirmation' => '987654',
        ]);
        $resChange->assertStatus(200);

        $setting = VoidSecuritySetting::first();
        // Old PIN no longer works
        $this->assertFalse(Hash::check('123456', $setting->void_pin_hash));
        // New PIN works
        $this->assertTrue(Hash::check('987654', $setting->void_pin_hash));
    }

    /**
     * TEST 10: Try to void an already VOIDED transaction.
     * Expected:
     * - operation rejected
     * - inventory must NOT be restored twice
     */
    public function test_10_cannot_void_already_voided_transaction(): void
    {
        $tx = Transaction::create([
            'transaction_number' => 'ORD-20260924-0010',
            'cashier_id' => $this->staff->id,
            'cashier_name' => 'Paolo Mendoza (Staff)',
            'customer_name' => 'Walk-in',
            'payment_method' => 'CASH',
            'gross_subtotal' => 35.00,
            'discount' => 0.00,
            'total_net' => 35.00,
            'status' => 'VOIDED',
            'date_time' => now(),
        ]);

        $tx->items()->create([
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'sku' => $this->product->sku,
            'quantity' => 1,
            'unit_price' => 35.00,
            'line_total' => 35.00,
        ]);

        $stockBefore = $this->product->fresh()->stock_quantity;

        $res = $this->actingAs($this->staff, 'sanctum')->postJson("/api/transactions/{$tx->id}/void", [
            'reason' => 'Attempting duplicate void',
            'void_pin' => '123456',
        ]);

        $res->assertStatus(422);
        $res->assertJsonFragment(['message' => 'This transaction is already VOIDED. Inventory cannot be restored twice.']);

        // Inventory must not change
        $this->assertEquals($stockBefore, $this->product->fresh()->stock_quantity);
    }

    /**
     * TEST 11: Try to refund an already fully refunded transaction.
     * Expected:
     * - operation rejected
     * - no duplicate refund
     * - inventory must NOT be restored twice
     */
    public function test_11_cannot_refund_already_refunded_transaction(): void
    {
        $tx = Transaction::create([
            'transaction_number' => 'ORD-20260924-0011',
            'cashier_id' => $this->staff->id,
            'cashier_name' => 'Paolo Mendoza (Staff)',
            'customer_name' => 'Walk-in',
            'payment_method' => 'CASH',
            'gross_subtotal' => 35.00,
            'discount' => 0.00,
            'total_net' => 35.00,
            'status' => 'REFUNDED',
            'date_time' => now(),
        ]);

        $tx->items()->create([
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'sku' => $this->product->sku,
            'quantity' => 1,
            'unit_price' => 35.00,
            'line_total' => 35.00,
        ]);

        $stockBefore = $this->product->fresh()->stock_quantity;

        $res = $this->actingAs($this->staff, 'sanctum')->postJson("/api/transactions/{$tx->id}/refund", [
            'reason' => 'Attempting duplicate refund',
        ]);

        $res->assertStatus(422);
        $res->assertJsonFragment(['message' => 'This transaction has already been refunded. Inventory cannot be restored twice.']);

        // Inventory must not change
        $this->assertEquals($stockBefore, $this->product->fresh()->stock_quantity);
    }

    /**
     * TEST 12: Verify order_source, dynamic tabs, and audit counts.
     */
    public function test_12_transactions_tab_and_order_source_filtering_and_counts(): void
    {
        // 1. Walk-in paid transaction
        Transaction::create([
            'transaction_number' => 'ORD-20260924-W001',
            'cashier_id' => $this->staff->id,
            'cashier_name' => 'Paolo Mendoza (Staff)',
            'customer_name' => 'Walk-in Customer',
            'payment_method' => 'CASH',
            'order_source' => 'Walk-in',
            'gross_subtotal' => 70.00,
            'discount' => 0.00,
            'total_net' => 70.00,
            'status' => 'PAID',
            'date_time' => now(),
        ]);

        // 2. Online paid transaction with GCash
        Transaction::create([
            'transaction_number' => 'ORD-20260924-O001',
            'cashier_id' => $this->admin->id,
            'cashier_name' => 'Isaac Daumar (Admin)',
            'customer_name' => 'Maria Santos',
            'payment_method' => 'GCASH',
            'order_source' => 'Online',
            'reference_number' => 'GCASH-987654321',
            'gross_subtotal' => 140.00,
            'discount' => 0.00,
            'total_net' => 140.00,
            'status' => 'PAID',
            'date_time' => now(),
        ]);

        // 3. Walk-in voided transaction
        Transaction::create([
            'transaction_number' => 'ORD-20260924-W002',
            'cashier_id' => $this->staff->id,
            'cashier_name' => 'Paolo Mendoza (Staff)',
            'customer_name' => 'John Doe',
            'payment_method' => 'CASH',
            'order_source' => 'Walk-in',
            'gross_subtotal' => 35.00,
            'discount' => 0.00,
            'total_net' => 35.00,
            'status' => 'VOIDED',
            'date_time' => now(),
        ]);

        // Query all tab
        $resAll = $this->actingAs($this->staff, 'sanctum')->getJson('/api/transactions?tab=all');
        $resAll->assertStatus(200);
        $resAll->assertJsonPath('meta.counts.all', 3);
        $resAll->assertJsonPath('meta.counts.payments', 2);
        $resAll->assertJsonPath('meta.counts.voids', 1);
        $resAll->assertJsonPath('meta.counts.gcash', 1);
        $resAll->assertJsonPath('meta.counts.online', 1);
        $resAll->assertJsonPath('meta.counts.walkin', 2);

        // Filter by order_source = online
        $resOnline = $this->actingAs($this->staff, 'sanctum')->getJson('/api/transactions?tab=all&order_source=online');
        $resOnline->assertStatus(200);
        $this->assertCount(1, $resOnline->json('data.data'));
        $this->assertEquals('ORD-20260924-O001', $resOnline->json('data.data.0.transaction_number'));
        $this->assertEquals('Online', $resOnline->json('data.data.0.order_source'));

        // Filter by tab = gcash
        $resGcash = $this->actingAs($this->staff, 'sanctum')->getJson('/api/transactions?tab=gcash');
        $resGcash->assertStatus(200);
        $this->assertCount(1, $resGcash->json('data.data'));
        $this->assertEquals('GCASH-987654321', $resGcash->json('data.data.0.reference_number'));

        // Filter by tab = voids
        $resVoids = $this->actingAs($this->staff, 'sanctum')->getJson('/api/transactions?tab=voids');
        $resVoids->assertStatus(200);
        $this->assertCount(1, $resVoids->json('data.data'));
        $this->assertEquals('ORD-20260924-W002', $resVoids->json('data.data.0.transaction_number'));
    }
}

