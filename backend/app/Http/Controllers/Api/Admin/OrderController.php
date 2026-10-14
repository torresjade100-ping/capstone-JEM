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
        $query = Order::with(['items.product', 'items.backorder', 'backorders.product', 'payments', 'customer.user'])
            ->select('orders.*')
            ->distinct('orders.id')
            ->orderBy('orders.created_at', 'desc');

        if ($request->filled('status')) {
            $query->where('orders.status', strtolower($request->status));
        }

        if ($request->filled('search')) {
            $query->where('orders.order_number', 'like', '%'.$request->search.'%');
        }

        $perPage = min(max((int) $request->input('per_page', 20), 1), 100);
        return response()->json(['success' => true, 'data' => $query->paginate($perPage)]);
    }

    public function show(Order $order): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $order->load(['items.product', 'items.backorder', 'backorders.product', 'payments', 'customer.user'])
        ]);
    }

    public function updateStatus(Request $request, $order): JsonResponse
    {
        $resolvedOrder = ($order instanceof Order)
            ? $order
            : (Order::where('id', $order)->orWhere('order_number', $order)->firstOrFail());

        $rawStatus = strtolower(trim((string) $request->input('status')));
        $statusAliases = [
            'in_process' => 'processing',
            'in process' => 'processing',
            'process' => 'processing',
            'deliver' => 'out_for_delivery',
            'delivery' => 'out_for_delivery',
            'out for delivery' => 'out_for_delivery',
            'pending review' => 'pending',
            'pending_review' => 'pending',
            'to_pay' => 'pending',
            'to pay' => 'pending',
            'to_process' => 'processing',
            'to process' => 'processing',
            'to_ship' => 'out_for_delivery',
            'to ship' => 'out_for_delivery',
            'to receive' => 'out_for_delivery',
            'to_receive' => 'out_for_delivery',
            'complete' => 'completed',
        ];
        if (isset($statusAliases[$rawStatus])) {
            $rawStatus = $statusAliases[$rawStatus];
        }

        $validStatuses = ['pending', 'confirmed', 'backordered', 'received', 'processing', 'ready', 'out_for_delivery', 'shipped', 'delivered', 'completed', 'cancelled', 'returned'];
        if (! in_array($rawStatus, $validStatuses, true)) {
            $rawStatus = 'pending';
        }

        $before = $resolvedOrder->status;
        $resolvedOrder->status = strtolower($rawStatus);
        $resolvedOrder->save();

        if ($request->user()) {
            try {
                app(AuditService::class)->record([
                    'user_id' => $request->user()->id,
                    'action' => 'order_status_changed',
                    'module' => 'orders',
                    'record_type' => 'order',
                    'record_id' => $resolvedOrder->id,
                    'before' => ['status' => $before],
                    'after' => ['status' => $resolvedOrder->status],
                    'ip_address' => $request->ip()
                ]);
            } catch (\Throwable $e) {}
        }

        $fresh = $resolvedOrder->fresh(['items.product', 'items.backorder', 'backorders.product', 'payments', 'customer.user']);

        return response()->json([
            'success' => true,
            'message' => "Order status updated from {$before} to {$resolvedOrder->status}.",
            'order' => $fresh,
            'data' => $fresh
        ]);
    }

    public function transition(Request $request, Order $order, string $target): JsonResponse
    {
        $allowed = [
            'receive' => ['pending', 'confirmed'],
            'process' => ['received', 'pending', 'confirmed'],
            'ready' => ['processing', 'received', 'pending', 'confirmed'],
            'out-for-delivery' => ['ready', 'processing'],
            'complete' => ['ready', 'out_for_delivery', 'processing'],
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
