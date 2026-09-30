<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SalesTransaction;
use App\Models\SaleItem;
use App\Models\Payment;
use App\Models\Product;
use App\Services\InventoryService;
use App\Services\Payments\PaymentManager;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class POSController extends Controller
{
    protected InventoryService $inventoryService;
    protected PaymentManager $pm;

    public function __construct(InventoryService $inventoryService, PaymentManager $pm)
    {
        $this->inventoryService = $inventoryService;
        $this->pm = $pm;
    }

    public function checkout(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.unit_price' => ['nullable', 'numeric', 'min:0'],
            'payment_method' => ['required', 'string'],
            'discount' => ['nullable', 'numeric', 'min:0'],
            'transaction_number' => ['nullable', 'string', 'max:100'],
        ]);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        // Idempotency: If transaction_number was already processed, return existing record
        if (!empty($request->transaction_number)) {
            $existing = SalesTransaction::where('transaction_number', $request->transaction_number)->first();
            $existingTx = \App\Models\Transaction::where('transaction_number', $request->transaction_number)->first();
            if ($existing || $existingTx) {
                return response()->json([
                    'success' => true,
                    'data' => [
                        'transaction' => $existing ?? $existingTx,
                        'already_processed' => true,
                    ]
                ]);
            }
        }

        return DB::transaction(function () use ($request) {
            $user = $request->user() ?? \App\Models\User::where('role', 'staff')->first() ?? \App\Models\User::first();

            // 1. Pessimistic Lock & Validate stock availability for all items before any changes
            $subtotal = 0;
            $lockedProducts = [];
            foreach ($request->items as $it) {
                $product = Product::lockForUpdate()->findOrFail($it['product_id']);
                $reqQty = (int) $it['quantity'];

                if ($product->stock_quantity < $reqQty) {
                    abort(422, "Insufficient stock. Only {$product->stock_quantity} pcs of {$product->name} are available.");
                }

                if (!empty($it['product_variant_id'])) {
                    $variant = \App\Models\ProductVariant::lockForUpdate()->find($it['product_variant_id']);
                    if ($variant && $variant->stock_quantity < $reqQty) {
                        abort(422, "Insufficient stock for variant of {$product->name}. Only {$variant->stock_quantity} pcs available.");
                    }
                }

                $price = (float) ($it['unit_price'] ?? $product->selling_price ?? $product->base_price);
                $subtotal += ($price * $reqQty);
                $lockedProducts[$it['product_id']] = $product;
            }

            $discount = (float) ($request->discount ?? 0);
            $total = max(0, $subtotal - $discount);

            $normalizedPaymentMethod = $request->payment_method === 'cash' ? 'cod' : $request->payment_method;
            $txNumber = $request->transaction_number ?: 'POS'.time().rand(100, 999);

            $paymentMethodStr = strtoupper($request->payment_method ?? 'CASH');
            if ($paymentMethodStr === 'COD') $paymentMethodStr = 'CASH';

            $roleLabel = ($user && $user->role === 'admin') ? 'Admin' : 'Staff';
            $cashierName = $user ? "{$user->name} ({$roleLabel})" : 'Isaac Daumar (Staff)';
            $customerName = trim($request->input('customer_name') ?: 'Walk-in');
            $amountReceived = (float) ($request->input('amount_received') ?? $total);
            $changeAmount = (float) ($request->input('change_amount') ?? max(0, $amountReceived - $total));
            $refNumber = $request->input('reference_number') ?? ($request->input('gcash_reference') ?? ($paymentMethodStr === 'GCASH' ? ('GCASH-'.time().rand(100, 999)) : null));

            // 2. Create Sales Transaction
            $tx = SalesTransaction::create([
                'user_id' => $user->id ?? null,
                'transaction_number' => $txNumber,
                'type' => 'pos',
                'subtotal' => $subtotal,
                'discount' => $discount,
                'total' => $total,
                'payment_method' => $normalizedPaymentMethod,
                'status' => 'completed',
            ]);

            // 2b. Create Audit Ledger Transaction record
            $auditTx = \App\Models\Transaction::create([
                'transaction_number' => $txNumber,
                'order_id' => null,
                'type' => $paymentMethodStr === 'GCASH' ? 'gcash' : 'retail',
                'date_time' => now(),
                'cashier_id' => $user->id ?? null,
                'cashier_name' => $cashierName,
                'cashier_role' => $user->role ?? 'staff',
                'customer_id' => null,
                'customer_name' => $customerName,
                'payment_method' => $paymentMethodStr,
                'reference_number' => $refNumber,
                'gross_subtotal' => $subtotal,
                'discount' => $discount,
                'total_net' => $total,
                'amount_tendered' => $amountReceived,
                'change_due' => $changeAmount,
                'status' => 'PAID',
                'notes' => $request->input('notes'),
            ]);

            try {
                app(\App\Services\AuditService::class)->record([
                    'user_id' => $user->id ?? null,
                    'user_name' => $user->name ?? 'System',
                    'user_role' => $user->role ?? 'staff',
                    'action' => 'SALE_CREATED',
                    'transaction_id' => $auditTx->id,
                    'order_id' => null,
                    'module' => 'transactions',
                    'record_type' => 'transaction',
                    'record_id' => $auditTx->id,
                    'reason' => "POS Sale checkout processed by {$user->name} ({$roleLabel})",
                    'metadata' => [
                        'transaction_number' => $auditTx->transaction_number,
                        'total_net' => $auditTx->total_net,
                        'payment_method' => $auditTx->payment_method,
                        'items_count' => count($request->items),
                    ],
                    'ip_address' => $request->ip(),
                ]);
            } catch (\Throwable $e) {}

            // 3. Deduct stock exactly once and record SaleItem, TransactionItem & StockAdjustment
            foreach ($request->items as $it) {
                $product = $lockedProducts[$it['product_id']] ?? Product::lockForUpdate()->findOrFail($it['product_id']);
                $qtyToDeduct = (int) $it['quantity'];
                $itemPrice = (float) ($it['unit_price'] ?? $product->selling_price ?? $product->base_price);

                SaleItem::create([
                    'sales_transaction_id' => $tx->id,
                    'product_id' => $it['product_id'],
                    'product_variant_id' => $it['product_variant_id'] ?? null,
                    'quantity' => $qtyToDeduct,
                    'unit_price' => $itemPrice,
                    'total_price' => $itemPrice * $qtyToDeduct,
                ]);

                \App\Models\TransactionItem::create([
                    'transaction_id' => $auditTx->id,
                    'product_id' => $product->id,
                    'product_variant_id' => $it['product_variant_id'] ?? null,
                    'product_name' => $product->name,
                    'sku' => $product->sku ?? null,
                    'quantity' => $qtyToDeduct,
                    'unit_price' => $itemPrice,
                    'line_total' => $itemPrice * $qtyToDeduct,
                ]);

                // Deduct actual product stock quantity
                $qtyBefore = (int) ($product->stock_quantity ?? 0);
                $qtyAfter = max(0, $qtyBefore - $qtyToDeduct);
                $product->stock_quantity = $qtyAfter;
                $product->save();

                // If variant exists, decrement variant stock
                if (!empty($it['product_variant_id'])) {
                    \App\Models\ProductVariant::where('id', $it['product_variant_id'])
                        ->decrement('stock_quantity', $qtyToDeduct);
                }

                // Log Stock Adjustment
                try {
                    \App\Models\StockAdjustment::create([
                        'product_id' => $product->id,
                        'product_variant_id' => $it['product_variant_id'] ?? null,
                        'user_id' => $user->id ?? 1,
                        'adjustment_type' => 'other',
                        'quantity_before' => $qtyBefore,
                        'quantity_changed' => -1 * $qtyToDeduct,
                        'quantity_after' => $qtyAfter,
                        'reason' => "Walk-in POS Sale (Tx #{$tx->transaction_number})",
                    ]);
                } catch (\Throwable $err) {}
            }

            // 4. Create payment record
            try {
                Payment::create([
                    'order_id' => null,
                    'method' => in_array($normalizedPaymentMethod, ['gcash', 'maya', 'bank_transfer', 'cod']) ? $normalizedPaymentMethod : 'cod',
                    'status' => 'completed',
                    'amount' => $total,
                    'reference_number' => 'POS-'.time().rand(100, 999),
                    'transaction_date' => now(),
                ]);
            } catch (\Throwable $err) {}

            return response()->json([
                'success' => true,
                'data' => [
                    'transaction' => $tx,
                    'audit_transaction' => $auditTx->load('items'),
                ]
            ]);
        });
    }
}
