<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Backorder;
use App\Models\Order;
use Illuminate\Http\Request;

class BackorderController extends Controller
{
    public function index(Request $request)
    {
        $q = Backorder::with(['product', 'variant', 'order'])->orderBy('created_at', 'desc');
        $items = $q->paginate(20);
        return response()->json(['success' => true, 'data' => $items]);
    }

    public function show($id)
    {
        $item = Backorder::with(['product', 'variant', 'order'])->findOrFail($id);
        return response()->json(['success' => true, 'data' => $item]);
    }

    public function update(Request $request, $id)
    {
        $backorder = Backorder::findOrFail($id);
        $data = $request->only(['status','expected_restock_date','notes']);
        $before = $backorder->toArray();
        $backorder->update($data);

        try {
            app(\App\Services\AuditService::class)->record([
                'user_id' => $request->user()->id ?? null,
                'action' => 'update',
                'module' => 'backorder',
                'record_type' => 'backorder',
                'record_id' => $backorder->id,
                'before' => $before,
                'after' => $backorder->toArray(),
                'ip_address' => $request->ip(),
            ]);
        } catch (\Throwable $e) {}

        return response()->json(['success' => true, 'data' => $backorder]);
    }

    public function fulfillPartial(Request $request, $id)
    {
        $this->validate($request, ['quantity' => 'required|integer|min:1']);
        $backorder = Backorder::findOrFail($id);
        $before = $backorder->toArray();
        $qty = (int) $request->quantity;
        $backorder->fulfilled_quantity += $qty;
        $backorder->remaining_quantity = max(0, $backorder->requested_quantity - $backorder->fulfilled_quantity);
        if ($backorder->remaining_quantity === 0) {
            $backorder->status = 'fulfilled';
        } else {
            $backorder->status = 'partial';
        }
        $backorder->save();

        try {
            app(\App\Services\AuditService::class)->record([
                'user_id' => $request->user()->id ?? null,
                'action' => 'fulfill_partial',
                'module' => 'backorder',
                'record_type' => 'backorder',
                'record_id' => $backorder->id,
                'before' => $before,
                'after' => $backorder->toArray(),
                'ip_address' => $request->ip(),
            ]);
        } catch (\Throwable $e) {}

        // Manual step: notify customer placeholder
        // TODO: implement notifications

        return response()->json(['success' => true, 'data' => $backorder]);
    }

    public function createFromOrder(Request $request)
    {
        $this->validate($request, [
            'order_id' => 'required|exists:orders,id',
            'product_id' => 'required|exists:products,id',
            'product_variant_id' => 'nullable|exists:product_variants,id',
            'requested_quantity' => 'required|integer|min:1',
            'expected_restock_date' => 'nullable|date',
        ]);

        $data = $request->only(['order_id','product_id','product_variant_id','requested_quantity','expected_restock_date','notes']);
        $data['fulfilled_quantity'] = 0;
        $data['remaining_quantity'] = $data['requested_quantity'];
        $backorder = Backorder::create($data);
        return response()->json(['success' => true, 'data' => $backorder]);
    }
}
