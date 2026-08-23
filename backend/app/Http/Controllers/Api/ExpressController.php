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

            $tx = SalesTransaction::create([
                'user_id' => $request->user()->id ?? null,
                'transaction_number' => 'EXP'.time().rand(100,999),
                'type' => 'express',
                'subtotal' => $subtotal,
                'discount' => 0,
                'total' => $total,
                'payment_method' => $request->payment_method,
                'status' => 'completed',
            ]);

            try {
                app(\App\Services\AuditService::class)->record([
                    'user_id' => $request->user()->id ?? null,
                    'action' => 'create',
                    'module' => 'sales_transaction',
                    'record_type' => 'sales_transaction',
                    'record_id' => $tx->id,
                    'before' => null,
                    'after' => $tx->toArray(),
                    'ip_address' => $request->ip(),
                ]);
            } catch (\Throwable $e) {}

            foreach ($request->items as $it) {
                SaleItem::create([
                    'sales_transaction_id' => $tx->id,
                    'product_id' => $it['product_id'],
                    'product_variant_id' => $it['product_variant_id'] ?? null,
                    'quantity' => $it['quantity'],
                    'unit_price' => $it['unit_price'],
                    'total_price' => $it['unit_price'] * $it['quantity'],
                ]);

                $this->inventoryService->adjustStock($request->user(), $it['product_id'], $it['product_variant_id'] ?? null, -1 * $it['quantity'], 'express_sale', 'sale');
            }

            Payment::create([
                'order_id' => null,
                'method' => $request->payment_method,
                'status' => 'completed',
                'amount' => $total,
                'reference_number' => 'EXP-'.time().rand(100,999),
                'transaction_date' => now(),
            ]);

            return response()->json(['success' => true, 'data' => ['transaction' => $tx]]);
        });
    }
}
