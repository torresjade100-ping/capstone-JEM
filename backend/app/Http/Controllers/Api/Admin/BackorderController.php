<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Backorder;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Services\AuditService;
use App\Services\BackorderService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BackorderController extends Controller
{
    protected BackorderService $backorderService;
    protected NotificationService $notificationService;
    protected AuditService $auditService;

    public function __construct(
        BackorderService $backorderService,
        NotificationService $notificationService,
        AuditService $auditService
    ) {
        $this->backorderService = $backorderService;
        $this->notificationService = $notificationService;
        $this->auditService = $auditService;
    }

    /**
     * Display a listing of backorders with filtering and metrics.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Backorder::with(['product', 'variant', 'order.customer.user', 'orderItem'])->orderBy('created_at', 'desc');

        // Status filtering
        if ($request->filled('status') && $request->status !== 'all') {
            if ($request->status === 'active') {
                $query->whereIn('status', ['pending', 'partially_fulfilled', 'partial']);
            } else {
                $query->where('status', $request->status);
            }
        }

        // Product filtering
        if ($request->filled('product_id')) {
            $query->where('product_id', $request->product_id);
        }

        // Search filtering (by order number, product name, or customer name)
        if ($request->filled('search')) {
            $search = trim($request->search);
            $query->where(function ($q) use ($search) {
                $q->whereHas('order', function ($oq) use ($search) {
                    $oq->where('order_number', 'like', "%{$search}%");
                })
                ->orWhereHas('product', function ($pq) use ($search) {
                    $pq->where('name', 'like', "%{$search}%");
                })
                ->orWhereHas('order.customer.user', function ($uq) use ($search) {
                    $uq->where('name', 'like', "%{$search}%")
                       ->orWhere('email', 'like', "%{$search}%");
                });
            });
        }

        // Aggregate metrics for summary cards
        $metrics = [
            'active_backorders_count' => Backorder::whereIn('status', ['pending', 'partially_fulfilled', 'partial'])->count(),
            'active_backorder_units' => (int) Backorder::whereIn('status', ['pending', 'partially_fulfilled', 'partial'])->sum('remaining_quantity'),
            'affected_orders_count' => Backorder::whereIn('status', ['pending', 'partially_fulfilled', 'partial'])->distinct('order_id')->count('order_id'),
            'fulfilled_backorders_count' => Backorder::where('status', 'fulfilled')->count(),
            'total_backorders_count' => Backorder::count(),
        ];

        $perPage = min(max((int) $request->input('per_page', 25), 1), 100);
        $items = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $items,
            'metrics' => $metrics,
        ]);
    }

    /**
     * Show a specific backorder.
     */
    public function show($id): JsonResponse
    {
        $item = Backorder::with(['product', 'variant', 'order.customer.user', 'orderItem'])->findOrFail($id);
        return response()->json(['success' => true, 'data' => $item]);
    }

    /**
     * Update backorder details (e.g. expected restock date or notes).
     */
    public function update(Request $request, $id): JsonResponse
    {
        $backorder = Backorder::findOrFail($id);
        $data = $request->only(['status', 'expected_restock_date', 'notes']);
        $before = $backorder->toArray();
        $backorder->update($data);

        try {
            $this->auditService->record([
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

        return response()->json([
            'success' => true,
            'message' => 'Backorder updated successfully.',
            'data' => $backorder->fresh(['product', 'variant', 'order', 'orderItem'])
        ]);
    }

    /**
     * Allocate stock manually to a backorder.
     */
    public function fulfillPartial(Request $request, $id): JsonResponse
    {
        $this->validate($request, [
            'quantity' => 'required|integer|min:1',
            'deduct_physical_stock' => 'nullable|boolean'
        ]);

        return DB::transaction(function () use ($request, $id) {
            $backorder = Backorder::with(['order.customer', 'orderItem', 'product'])->lockForUpdate()->findOrFail($id);
            $qty = min((int) $request->quantity, (int) $backorder->remaining_quantity);

            if ($qty <= 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Backorder already has 0 remaining quantity to fulfill.'
                ], 422);
            }

            // Check if user requested physical stock deduction or if physical stock has enough
            $deductPhysical = $request->boolean('deduct_physical_stock', true);
            $product = Product::lockForUpdate()->find($backorder->product_id);

            if ($deductPhysical && $product) {
                if ($product->stock_quantity < $qty) {
                    return response()->json([
                        'success' => false,
                        'message' => "Insufficient physical inventory on hand ({$product->stock_quantity} available) to allocate {$qty} units."
                    ], 422);
                }
                $product->decrement('stock_quantity', $qty);
                if ($backorder->product_variant_id) {
                    \App\Models\ProductVariant::where('id', $backorder->product_variant_id)->decrement('stock_quantity', $qty);
                }
            }

            $before = $backorder->toArray();
            $backorder->fulfilled_quantity += $qty;
            $backorder->remaining_quantity = max(0, $backorder->remaining_quantity - $qty);
            $backorder->status = ($backorder->remaining_quantity === 0) ? 'fulfilled' : 'partially_fulfilled';
            $backorder->save();

            // Sync with OrderItem
            $orderItem = $backorder->orderItem;
            if ($orderItem) {
                $orderItem->fulfilled_quantity += $qty;
                $orderItem->backordered_quantity = max(0, $orderItem->backordered_quantity - $qty);
                $orderItem->fulfillment_status = ($orderItem->backordered_quantity === 0) ? 'fulfilled' : 'partially_fulfilled';
                $orderItem->save();
            }

            // Check if entire order is now free of open backorders
            $order = $backorder->order;
            if ($order) {
                $hasOpen = Backorder::where('order_id', $order->id)
                    ->whereIn('status', ['pending', 'partially_fulfilled', 'partial'])
                    ->where('remaining_quantity', '>', 0)
                    ->exists();

                if (!$hasOpen && in_array($order->status, ['backordered', 'pending'])) {
                    $order->status = 'processing';
                    $order->save();

                    // Notify customer
                    if ($order->customer?->user_id) {
                        $this->notificationService->notify([
                            'user_id' => $order->customer->user_id,
                            'type' => 'backorder_fulfilled',
                            'title' => "Backorder Fulfilled! Order #{$order->order_number}",
                            'message' => "Great news! All items for Order #{$order->order_number} have been fulfilled and your order is now processing for dispatch.",
                            'data' => ['order_id' => $order->id, 'order_number' => $order->order_number]
                        ]);
                    }
                }
            }

            try {
                $this->auditService->record([
                    'user_id' => $request->user()->id ?? null,
                    'action' => 'backorder_allocated',
                    'module' => 'backorder',
                    'record_type' => 'backorder',
                    'record_id' => $backorder->id,
                    'before' => $before,
                    'after' => $backorder->toArray(),
                    'ip_address' => $request->ip(),
                ]);
            } catch (\Throwable $e) {}

            return response()->json([
                'success' => true,
                'message' => "Allocated {$qty} units to Backorder #{$backorder->id}.",
                'data' => $backorder->fresh(['product', 'variant', 'order', 'orderItem'])
            ]);
        });
    }

    /**
     * Cancel an active backorder.
     */
    public function cancel(Request $request, $id): JsonResponse
    {
        $reason = $request->input('reason', 'Cancelled by administrator');
        $bo = $this->backorderService->cancelBackorder((int) $id, $reason, $request->user());

        return response()->json([
            'success' => true,
            'message' => 'Backorder item cancelled successfully.',
            'data' => $bo->fresh(['product', 'variant', 'order', 'orderItem'])
        ]);
    }

    /**
     * Manual creation from an existing order.
     */
    public function createFromOrder(Request $request): JsonResponse
    {
        $this->validate($request, [
            'order_id' => 'required|exists:orders,id',
            'product_id' => 'required|exists:products,id',
            'product_variant_id' => 'nullable|exists:product_variants,id',
            'requested_quantity' => 'required|integer|min:1',
            'expected_restock_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        $data = $request->only(['order_id', 'product_id', 'product_variant_id', 'requested_quantity', 'expected_restock_date', 'notes']);
        $data['fulfilled_quantity'] = 0;
        $data['remaining_quantity'] = $data['requested_quantity'];
        $data['quantity'] = $data['requested_quantity'];
        $data['status'] = 'pending';

        $backorder = Backorder::create($data);

        // Update Order status to backordered if not already
        Order::where('id', $request->order_id)->where('status', '!=', 'cancelled')->update(['status' => 'backordered']);

        return response()->json([
            'success' => true,
            'message' => 'Backorder created successfully.',
            'data' => $backorder->load(['product', 'variant', 'order'])
        ]);
    }

    /**
     * Product demand summary for active backorders (used by Restock & Purchase Orders).
     */
    public function productDemandSummary(): JsonResponse
    {
        $demands = Backorder::whereIn('status', ['pending', 'partially_fulfilled', 'partial'])
            ->where('remaining_quantity', '>', 0)
            ->with('product')
            ->selectRaw('product_id, COUNT(*) as backorder_count, SUM(remaining_quantity) as total_units_needed')
            ->groupBy('product_id')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $demands
        ]);
    }
}
