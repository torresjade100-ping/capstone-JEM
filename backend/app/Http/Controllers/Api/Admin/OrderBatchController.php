<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;

class OrderBatchController extends Controller
{
    public function bulkUpdateStatus(Request $request)
    {
        $this->validate($request, ['order_ids' => 'required|array', 'status' => 'required|string']);
        $orderIds = $request->order_ids;
        $status = $request->status;

        $orders = Order::whereIn('id', $orderIds)->get();
        // Validate all orders belong to store and are in a mutable state
        foreach ($orders as $order) {
            // simple validation example, can expand
            if (in_array($order->status, ['cancelled','refunded'])) {
                return response()->json(['success' => false, 'message' => 'Order '.$order->id.' cannot be updated.'], 422);
            }
        }

        foreach ($orders as $order) {
            $order->status = $status;
            $order->save();
        }

        return response()->json(['success' => true, 'message' => 'Updated '.count($orders).' orders.']);
    }

    public function generateManifest(Request $request)
    {
        $this->validate($request, ['order_ids' => 'required|array']);
        $orders = Order::with('items')->whereIn('id', $request->order_ids)->get();
        $manifest = $orders->map(function ($o) {
            return [
                'order_id' => $o->id,
                'order_number' => $o->order_number,
                'items' => $o->items->map(fn($i) => ['product' => $i->product_id, 'qty' => $i->quantity]),
                'delivery_address' => $o->delivery_address,
            ];
        });

        return response()->json(['success' => true, 'data' => $manifest]);
    }
}
