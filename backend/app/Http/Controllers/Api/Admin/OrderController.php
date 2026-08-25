<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use App\Services\AuditService;

class OrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Order::with(['items.product', 'payments', 'customer.user'])->latest();
        if ($request->filled('status')) $query->where('status', $request->status);
        if ($request->filled('search')) $query->where('order_number', 'like', '%'.$request->search.'%');
        $perPage = min(max((int) $request->input('per_page', 20), 1), 100);
        return response()->json(['success' => true, 'data' => $query->paginate($perPage)]);
    }


    public function show(Order $order): JsonResponse { return response()->json(['success' => true, 'data' => $order->load(['items.product', 'payments', 'customer.user'])]); }

    public function updateStatus(Request $request, Order $order): JsonResponse
    {
        $data = $request->validate(['status' => ['required', Rule::in(['pending', 'confirmed', 'received', 'processing', 'ready', 'out_for_delivery', 'shipped', 'delivered', 'completed', 'cancelled', 'returned'])]]);
        $before = $order->status;
        $order->update($data);
        return response()->json(['success' => true, 'message' => "Order status changed from {$before} to {$order->status}.", 'data' => $order->fresh()]);
    }

    public function transition(Request $request, Order $order, string $target): JsonResponse
    {
        $allowed = [
            'receive' => ['pending', 'confirmed'],
            'process' => ['received'],
            'ready' => ['processing'],
            'out-for-delivery' => ['ready'],
            'complete' => ['ready', 'out_for_delivery'],
        ];
        abort_unless(isset($allowed[$target]), 404);
        abort_unless(in_array($order->status, $allowed[$target], true), 422, 'Order cannot move to this status from its current state.');
        $statuses = ['receive' => 'received', 'process' => 'processing', 'ready' => 'ready', 'out-for-delivery' => 'out_for_delivery', 'complete' => 'completed'];
        $before = $order->status;
        $order->update(['status' => $statuses[$target]]);
        app(AuditService::class)->record(['user_id' => $request->user()->id, 'action' => 'order_status_changed', 'module' => 'orders', 'record_type' => 'order', 'record_id' => $order->id, 'before' => ['status' => $before], 'after' => ['status' => $order->status], 'ip_address' => $request->ip()]);
        return response()->json(['success' => true, 'message' => 'Order status updated.', 'data' => $order->fresh()]);
    }
}
