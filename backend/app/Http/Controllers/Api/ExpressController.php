<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SalesTransaction;
use App\Models\SaleItem;
use App\Models\Payment;
use App\Services\InventoryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ExpressController extends Controller
{
    protected InventoryService $inventoryService;

    public function __construct(InventoryService $inventoryService)
    {
        $this->inventoryService = $inventoryService;
    }

    public function quickSale(Request $request)
    {
        $this->validate($request, ['items' => 'required|array','payment_method' => 'required|string']);

        return DB::transaction(function () use ($request) {
            $subtotal = 0;
            foreach ($request->items as $it) {
                $subtotal += ($it['unit_price'] * $it['quantity']);
            }
            $total = $subtotal;

            $txNumber = 'EXP'.time().rand(100,999);
            $paymentMethodStr = strtoupper($request->payment_method ?? 'CASH');
            if ($paymentMethodStr === 'COD') $paymentMethodStr = 'CASH';

            $user = $request->user();
            $roleLabel = ($user && $user->role === 'admin') ? 'Admin' : 'Staff';
            $cashierName = $user ? "{$user->name} ({$roleLabel})" : 'Isaac Daumar (Staff)';

            $tx = SalesTransaction::create([
                'user_id' => $user->id ?? null,
                'transaction_number' => $txNumber,
                'type' => 'express',
                'subtotal' => $subtotal,
                'discount' => 0,
                'total' => $total,
                'payment_method' => $request->payment_method,
                'status' => 'completed',
            ]);

            $auditTx = \App\Models\Transaction::create([
                'transaction_number' => $txNumber,
                'order_id' => null,
                'type' => $paymentMethodStr === 'GCASH' ? 'gcash' : 'retail',
                'date_time' => now(),
                'cashier_id' => $user->id ?? null,
                'cashier_name' => $cashierName,
                'cashier_role' => $user->role ?? 'staff',
                'customer_id' => null,
                'customer_name' => 'Walk-in',
                'payment_method' => $paymentMethodStr,
                'reference_number' => $paymentMethodStr === 'GCASH' ? ('GCASH-'.time().rand(100, 999)) : null,
                'gross_subtotal' => $subtotal,
                'discount' => 0,
                'total_net' => $total,
                'amount_tendered' => $total,
                'change_due' => 0,
                'status' => 'PAID',
                'notes' => 'Express quick sale',
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
                    'reason' => "Express quick sale processed by {$cashierName}",
                    'metadata' => [
                        'transaction_number' => $auditTx->transaction_number,
                        'total_net' => $auditTx->total_net,
                        'payment_method' => $auditTx->payment_method,
                        'items_count' => count($request->items),
                    ],
                    'ip_address' => $request->ip(),
                ]);
            } catch (\Throwable $e) {}

            foreach ($request->items as $it) {
                $product = \App\Models\Product::find($it['product_id']);
                SaleItem::create([
                    'sales_transaction_id' => $tx->id,
                    'product_id' => $it['product_id'],
                    'product_variant_id' => $it['product_variant_id'] ?? null,
                    'quantity' => $it['quantity'],
                    'unit_price' => $it['unit_price'],
                    'total_price' => $it['unit_price'] * $it['quantity'],
                ]);

                \App\Models\TransactionItem::create([
                    'transaction_id' => $auditTx->id,
                    'product_id' => $it['product_id'],
                    'product_variant_id' => $it['product_variant_id'] ?? null,
                    'product_name' => $product?->name ?? 'Hardware Product',
                    'sku' => $product?->sku ?? null,
                    'quantity' => $it['quantity'],
                    'unit_price' => $it['unit_price'],
                    'line_total' => $it['unit_price'] * $it['quantity'],
                ]);

                $this->inventoryService->adjustStock($user, $it['product_id'], $it['product_variant_id'] ?? null, -1 * $it['quantity'], 'express_sale', 'sale');
            }

            Payment::create([
                'order_id' => null,
                'method' => $request->payment_method,
                'status' => 'completed',
                'amount' => $total,
                'reference_number' => 'EXP-'.time().rand(100,999),
                'transaction_date' => now(),
            ]);

            return response()->json(['success' => true, 'data' => ['transaction' => $tx, 'audit_transaction' => $auditTx]]);
        });
    }
}
