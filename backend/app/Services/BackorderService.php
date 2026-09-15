<?php

namespace App\Services;

use App\Models\Backorder;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class BackorderService
{
    protected NotificationService $notificationService;
    protected AuditService $auditService;

    public function __construct(NotificationService $notificationService, AuditService $auditService)
    {
        $this->notificationService = $notificationService;
        $this->auditService = $auditService;
    }

    /**
     * Process order items, detect shortages, allocate available stock,
     * generate backorder records for shortages, and set order status.
     *
     * @param Order $order
     * @param array $items
     * @param User|null $user
     * @return array
     */
    public function processOrderItems(Order $order, array $items, ?User $user = null): array
    {
        return DB::transaction(function () use ($order, $items, $user) {
            $createdItems = [];
            $createdBackorders = [];
            $totalBackorderedCount = 0;

            foreach ($items as $itemData) {
                $productId = (int) ($itemData['product_id'] ?? $itemData['id'] ?? 1);
                $variantId = !empty($itemData['product_variant_id']) ? (int) $itemData['product_variant_id'] : null;
                $requestedQty = max((int) ($itemData['quantity'] ?? $itemData['qty'] ?? 1), 1);

                // Lock product for atomic stock check
                $product = Product::lockForUpdate()->find($productId);
                if (!$product) {
                    $product = Product::firstOrCreate(
                        ['name' => $itemData['name'] ?? 'Hardware Item'],
                        [
                            'category_id' => 1,
                            'brand_id' => 1,
                            'base_price' => (float) ($itemData['unit_price'] ?? $itemData['price'] ?? 100),
                            'unit' => 'piece',
                            'stock_quantity' => 0,
                            'status' => 'active',
                        ]
                    );
                }

                $variant = null;
                if ($variantId) {
                    $variant = ProductVariant::lockForUpdate()->find($variantId);
                }

                $unitPrice = (float) ($itemData['unit_price'] ?? $itemData['price'] ?? $variant?->price ?? $product->selling_price ?? $product->base_price ?? 0);

                // Check physical stock quantity
                $physicalStock = $variant ? (int) $variant->stock_quantity : (int) $product->stock_quantity;
                $availableStock = max(0, $physicalStock);

                // Calculate fulfillable vs backordered
                if ($availableStock >= $requestedQty) {
                    // Full stock available
                    $fulfillableQty = $requestedQty;
                    $backorderQty = 0;
                    $fulfillmentStatus = 'fulfilled';

                    // Deduct from physical stock
                    $product->decrement('stock_quantity', $fulfillableQty);
                    if ($variant) {
                        $variant->decrement('stock_quantity', $fulfillableQty);
                    }
                } else {
                    // Shortage detected!
                    $fulfillableQty = $availableStock; // fulfill whatever physical units are currently on hand (e.g. 12 out of 20)
                    $backorderQty = $requestedQty - $fulfillableQty; // shortage (e.g. 8 pcs)
                    $fulfillmentStatus = $fulfillableQty > 0 ? 'partially_fulfilled' : 'backordered';

                    // Deduct the partial units that are currently physically available
                    if ($fulfillableQty > 0) {
                        $product->decrement('stock_quantity', $fulfillableQty);
                        if ($variant) {
                            $variant->decrement('stock_quantity', $fulfillableQty);
                        }
                    }
                }

                // Create OrderItem with granular fulfillment columns
                $orderItem = OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $product->id,
                    'product_variant_id' => $variant?->id,
                    'quantity' => $requestedQty,
                    'ordered_quantity' => $requestedQty,
                    'fulfilled_quantity' => $fulfillableQty,
                    'backordered_quantity' => $backorderQty,
                    'available_quantity_at_order' => $availableStock,
                    'fulfillment_status' => $fulfillmentStatus,
                    'unit_price' => $unitPrice,
                    'total_price' => $requestedQty * $unitPrice,
                ]);

                // Create Backorder record if shortage exists
                if ($backorderQty > 0) {
                    $backorder = Backorder::create([
                        'order_id' => $order->id,
                        'order_item_id' => $orderItem->id,
                        'product_id' => $product->id,
                        'product_variant_id' => $variant?->id,
                        'quantity' => $backorderQty,
                        'requested_quantity' => $requestedQty,
                        'fulfilled_quantity' => $fulfillableQty,
                        'remaining_quantity' => $backorderQty,
                        'status' => 'pending',
                        'notes' => "Auto-detected shortage for Order #{$order->order_number}. Customer ordered {$requestedQty}, physically fulfilled {$fulfillableQty}, backordered {$backorderQty}.",
                    ]);

                    $createdBackorders[] = $backorder;
                    $totalBackorderedCount += $backorderQty;
                }

                $createdItems[] = $orderItem;
            }

            // Determine order overall status
            if (count($createdBackorders) > 0) {
                // At least one item has shortages -> Order is placed in Backordered status
                $order->status = 'backordered';
                $order->save();

                // 1. Notify Admin and Staff
                $staffUsers = User::whereIn('role', ['admin', 'staff'])->get();
                $itemsSummary = collect($createdBackorders)->map(function ($bo) {
                    return ($bo->product?->name ?? 'Item') . " (Shortage: {$bo->remaining_quantity} pcs)";
                })->join(', ');

                foreach ($staffUsers as $staff) {
                    $this->notificationService->notify([
                        'user_id' => $staff->id,
                        'type' => 'backorder_created',
                        'title' => "Backorder Created: Order #{$order->order_number}",
                        'message' => "Order #{$order->order_number} has {$totalBackorderedCount} unit(s) on backorder: {$itemsSummary}. Supplier restock required.",
                        'data' => [
                            'order_id' => $order->id,
                            'order_number' => $order->order_number,
                            'backordered_items_count' => count($createdBackorders),
                            'total_backordered_units' => $totalBackorderedCount,
                        ],
                    ]);
                }

                // 2. Notify Customer (Friendly notification)
                if ($order->customer?->user_id) {
                    $this->notificationService->notify([
                        'user_id' => $order->customer->user_id,
                        'type' => 'order_backordered',
                        'title' => "Order #{$order->order_number} Received (Backordered)",
                        'message' => "Your order has been confirmed. Some item(s) are currently on backorder and will be prioritized as incoming shipments arrive.",
                        'data' => [
                            'order_id' => $order->id,
                            'order_number' => $order->order_number,
                            'status' => 'backordered',
                        ],
                    ]);
                }
            } else {
                // All items fulfilled
                $order->status = 'pending';
                $order->save();

                // Standard notification to customer
                if ($order->customer?->user_id) {
                    $this->notificationService->notify([
                        'user_id' => $order->customer->user_id,
                        'type' => 'order_placed',
                        'title' => "Order #{$order->order_number} Placed",
                        'message' => "Your order #{$order->order_number} has been placed successfully and is pending review.",
                        'data' => ['order_id' => $order->id, 'order_number' => $order->order_number],
                    ]);
                }
            }

            return [
                'order' => $order->fresh(['items.product', 'backorders.product']),
                'created_items' => $createdItems,
                'created_backorders' => $createdBackorders,
                'is_backordered' => count($createdBackorders) > 0,
            ];
        });
    }

    /**
     * Automatically allocate newly received stock to waiting backorders in FIFO order.
     *
     * @param int $productId
     * @param int|null $variantId
     * @param int $receivedQuantity
     * @param User|null $user
     * @return array
     */
    public function allocateStock(int $productId, ?int $variantId, int $receivedQuantity, ?User $user = null): array
    {
        if ($receivedQuantity <= 0) {
            return [
                'allocated_total' => 0,
                'remaining_stock' => 0,
                'affected_backorders' => [],
            ];
        }

        return DB::transaction(function () use ($productId, $variantId, $receivedQuantity, $user) {
            // Find active backorders in FIFO order (earliest order first)
            $backorders = Backorder::with(['order.customer', 'orderItem', 'product'])
                ->where('product_id', $productId)
                ->when($variantId, fn ($q) => $q->where('product_variant_id', $variantId))
                ->whereIn('status', ['pending', 'partially_fulfilled', 'partial'])
                ->where('remaining_quantity', '>', 0)
                ->orderBy('created_at', 'asc') // FIFO
                ->lockForUpdate()
                ->get();

            if ($backorders->isEmpty()) {
                return [
                    'allocated_total' => 0,
                    'remaining_stock' => $receivedQuantity,
                    'affected_backorders' => [],
                ];
            }

            $product = Product::lockForUpdate()->find($productId);
            $variant = $variantId ? ProductVariant::lockForUpdate()->find($variantId) : null;

            $remainingStockToAllocate = $receivedQuantity;
            $allocatedTotal = 0;
            $affectedBackorders = [];
            $ordersToEvaluate = [];

            foreach ($backorders as $bo) {
                if ($remainingStockToAllocate <= 0) {
                    break;
                }

                $needed = (int) $bo->remaining_quantity;
                $allocating = min($remainingStockToAllocate, $needed);

                // Update Backorder
                $bo->fulfilled_quantity = (int) $bo->fulfilled_quantity + $allocating;
                $bo->remaining_quantity = max(0, (int) $bo->remaining_quantity - $allocating);
                $isBoFulfilled = ($bo->remaining_quantity === 0);
                $bo->status = $isBoFulfilled ? 'fulfilled' : 'partially_fulfilled';
                $bo->save();

                // Update OrderItem
                $orderItem = $bo->orderItem;
                if ($orderItem) {
                    $orderItem->fulfilled_quantity = (int) $orderItem->fulfilled_quantity + $allocating;
                    $orderItem->backordered_quantity = max(0, (int) $orderItem->backordered_quantity - $allocating);
                    $orderItem->fulfillment_status = ($orderItem->backordered_quantity === 0) ? 'fulfilled' : 'partially_fulfilled';
                    $orderItem->save();
                }

                // Since $receivedQuantity was added to product stock upon arrival,
                // claim and allocate this portion for this customer order:
                if ($product) {
                    $product->decrement('stock_quantity', $allocating);
                }
                if ($variant) {
                    $variant->decrement('stock_quantity', $allocating);
                }

                $allocatedTotal += $allocating;
                $remainingStockToAllocate -= $allocating;

                $affectedBackorders[] = [
                    'backorder_id' => $bo->id,
                    'order_id' => $bo->order_id,
                    'allocated' => $allocating,
                    'remaining' => $bo->remaining_quantity,
                    'status' => $bo->status,
                ];

                if ($bo->order_id) {
                    $ordersToEvaluate[$bo->order_id] = $bo->order;
                }
            }

            // Evaluate orders affected by backorder fulfillment
            foreach ($ordersToEvaluate as $orderId => $order) {
                if (!$order) {
                    $order = Order::with('customer')->find($orderId);
                }
                if (!$order) continue;

                // Check if this order still has any open backorders
                $hasOpenBackorders = Backorder::where('order_id', $orderId)
                    ->whereIn('status', ['pending', 'partially_fulfilled', 'partial'])
                    ->where('remaining_quantity', '>', 0)
                    ->exists();

                if (!$hasOpenBackorders) {
                    // All backordered items for this order are now completely fulfilled!
                    // Transition order status to 'processing' (Warehouse stage)
                    $previousStatus = $order->status;
                    $order->status = 'processing';
                    $order->save();

                    // Notify Customer
                    if ($order->customer?->user_id) {
                        $this->notificationService->notify([
                            'user_id' => $order->customer->user_id,
                            'type' => 'backorder_fulfilled',
                            'title' => "Backorder Fulfilled! Order #{$order->order_number}",
                            'message' => "All items for your Order #{$order->order_number} have arrived and the order is now processing for warehouse preparation!",
                            'data' => [
                                'order_id' => $order->id,
                                'order_number' => $order->order_number,
                                'status' => 'processing',
                            ],
                        ]);
                    }

                    // Notify Admin/Staff
                    $staffUsers = User::whereIn('role', ['admin', 'staff'])->get();
                    foreach ($staffUsers as $staff) {
                        $this->notificationService->notify([
                            'user_id' => $staff->id,
                            'type' => 'backorder_order_ready',
                            'title' => "Order #{$order->order_number} Fully Restocked",
                            'message' => "All backorders for Order #{$order->order_number} have been fulfilled from restock. Status transitioned to Processing.",
                            'data' => [
                                'order_id' => $order->id,
                                'order_number' => $order->order_number,
                            ],
                        ]);
                    }
                } else {
                    // Order still has partial shortages on other items
                    $remainingShortages = Backorder::where('order_id', $orderId)
                        ->whereIn('status', ['pending', 'partially_fulfilled', 'partial'])
                        ->sum('remaining_quantity');

                    // Notify Admin/Staff of partial progress
                    $staffUsers = User::whereIn('role', ['admin', 'staff'])->get();
                    foreach ($staffUsers as $staff) {
                        $this->notificationService->notify([
                            'user_id' => $staff->id,
                            'type' => 'backorder_partially_allocated',
                            'title' => "Partial Stock Allocated: Order #{$order->order_number}",
                            'message' => "Stock was allocated to Order #{$order->order_number}. {$remainingShortages} unit(s) still on backorder.",
                            'data' => [
                                'order_id' => $order->id,
                                'order_number' => $order->order_number,
                                'remaining_shortages' => $remainingShortages,
                            ],
                        ]);
                    }
                }
            }

            return [
                'allocated_total' => $allocatedTotal,
                'remaining_stock' => $remainingStockToAllocate,
                'affected_backorders' => $affectedBackorders,
            ];
        });
    }

    /**
     * Cancel an active backorder item.
     *
     * @param int $backorderId
     * @param string $reason
     * @param User|null $user
     * @return Backorder
     */
    public function cancelBackorder(int $backorderId, string $reason = 'Cancelled by admin', ?User $user = null): Backorder
    {
        return DB::transaction(function () use ($backorderId, $reason, $user) {
            $bo = Backorder::with(['order', 'orderItem'])->lockForUpdate()->findOrFail($backorderId);
            $bo->status = 'cancelled';
            $bo->notes = ($bo->notes ? $bo->notes . ' | ' : '') . "Cancelled: {$reason}";
            $bo->save();

            if ($bo->orderItem) {
                $bo->orderItem->backordered_quantity = 0;
                $bo->orderItem->fulfillment_status = $bo->orderItem->fulfilled_quantity > 0 ? 'partially_fulfilled' : 'cancelled';
                $bo->orderItem->save();
            }

            // Check if order still has any active backorders
            if ($bo->order_id) {
                $hasActiveBackorders = Backorder::where('order_id', $bo->order_id)
                    ->whereIn('status', ['pending', 'partially_fulfilled', 'partial'])
                    ->where('remaining_quantity', '>', 0)
                    ->exists();

                if (!$hasActiveBackorders) {
                    $order = Order::find($bo->order_id);
                    if ($order && $order->status === 'backordered') {
                        // Check if order has any fulfilled items
                        $totalFulfilled = OrderItem::where('order_id', $order->id)->sum('fulfilled_quantity');
                        $order->status = $totalFulfilled > 0 ? 'processing' : 'cancelled';
                        $order->save();
                    }
                }
            }

            return $bo;
        });
    }

    /**
     * Get active backorder demand for a product (or product variant).
     *
     * @param int $productId
     * @param int|null $variantId
     * @return int
     */
    public function getActiveBackorderDemand(int $productId, ?int $variantId = null): int
    {
        return (int) Backorder::where('product_id', $productId)
            ->when($variantId, fn ($q) => $q->where('product_variant_id', $variantId))
            ->whereIn('status', ['pending', 'partially_fulfilled', 'partial'])
            ->sum('remaining_quantity');
    }

    /**
     * Get aggregate backorder demand for multiple products in bulk.
     *
     * @param array $productIds
     * @return array [productId => totalShortageQuantity]
     */
    public function getBulkActiveDemand(array $productIds): array
    {
        if (empty($productIds)) {
            return [];
        }

        return Backorder::whereIn('product_id', $productIds)
            ->whereIn('status', ['pending', 'partially_fulfilled', 'partial'])
            ->groupBy('product_id')
            ->selectRaw('product_id, SUM(remaining_quantity) as total_demand')
            ->pluck('total_demand', 'product_id')
            ->map(fn ($val) => (int) $val)
            ->toArray();
    }
}
