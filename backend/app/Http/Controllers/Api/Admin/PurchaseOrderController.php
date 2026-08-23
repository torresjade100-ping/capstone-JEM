<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Services\InventoryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PurchaseOrderController extends Controller
{
    public function index()
    {
        return response()->json(['success' => true, 'data' => PurchaseOrder::with('items')->paginate(20)]);
    }

    public function store(Request $request)
    {
        $this->validate($request, ['supplier_id' => 'required|exists:suppliers,id','items' => 'required|array']);

        return DB::transaction(function () use ($request) {
            $po = PurchaseOrder::create($request->only(['supplier_id','order_number','expected_delivery_date','notes']));
            foreach ($request->items as $it) {
                PurchaseOrderItem::create([
                    'purchase_order_id' => $po->id,
                    'product_id' => $it['product_id'],
                    'product_variant_id' => $it['product_variant_id'] ?? null,
                    'quantity' => $it['quantity'],
                    'unit_cost' => $it['unit_cost'] ?? 0,
                ]);
            }
            try {
                app(\App\Services\AuditService::class)->record([
                    'user_id' => $request->user()->id ?? null,
                    'action' => 'create',
                    'module' => 'purchase_order',
                    'record_type' => 'purchase_order',
                    'record_id' => $po->id,
                    'before' => null,
                    'after' => $po->toArray(),
                    'ip_address' => $request->ip(),
                ]);
            } catch (\Throwable $e) {}

            return response()->json(['success' => true, 'data' => $po->load('items')]);
        });
    }

    public function approve(Request $request, $id)
    {
        $po = PurchaseOrder::findOrFail($id);
        $before = $po->toArray();
        $po->status = 'approved';
        $po->save();

        try {
            app(\App\Services\AuditService::class)->record([
                'user_id' => $request->user()->id ?? null,
                'action' => 'approve',
                'module' => 'purchase_order',
                'record_type' => 'purchase_order',
                'record_id' => $po->id,
                'before' => $before,
                'after' => $po->toArray(),
                'ip_address' => $request->ip(),
            ]);
        } catch (\Throwable $e) {}

        return response()->json(['success' => true, 'data' => $po]);
    }

    public function receive(Request $request, $id, InventoryService $inventoryService)
    {
        $po = PurchaseOrder::with('items')->findOrFail($id);
        $this->validate($request, ['items' => 'required|array']);

        return DB::transaction(function () use ($po, $request, $inventoryService) {
            $receipt = $po->receipts()->create(['received_by' => $request->user()->name, 'received_at' => now(), 'notes' => $request->notes ?? null]);
            foreach ($request->items as $it) {
                $item = $po->items->firstWhere('id', $it['purchase_order_item_id']);
                if (! $item) continue;
                $qty = (int) $it['received_quantity'];
                $item->received_quantity += $qty;
                $item->save();

                // Update inventory
                $inventoryService->adjustStock($request->user(), $item->product_id, $item->product_variant_id, $qty, 'purchase_receive', 'restock');
            }
            $before = $po->toArray();
            $po->status = 'received';
            $po->save();

            try {
                app(\App\Services\AuditService::class)->record([
                    'user_id' => $request->user()->id ?? null,
                    'action' => 'receive',
                    'module' => 'purchase_order',
                    'record_type' => 'purchase_order',
                    'record_id' => $po->id,
                    'before' => $before,
                    'after' => $po->toArray(),
                    'ip_address' => $request->ip(),
                ]);
            } catch (\Throwable $e) {}

            return response()->json(['success' => true, 'data' => $po->load('items')]);
        });
    }
}
