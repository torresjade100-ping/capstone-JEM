<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Cart;
use App\Models\Product;
use App\Models\Inventory;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class OrderService
{
    protected $inventoryService;
    protected $auditService;

    public function __construct(InventoryService $inventoryService, AuditService $auditService)
    {
        $this->inventoryService = $inventoryService;
        $this->auditService = $auditService;
    }

    /**
     * Create an order from a customer's cart
     */
    public function createFromCart($user, $checkoutData): array
    {
        return DB::transaction(function () use ($user, $checkoutData) {
            // Get cart items
            $cart = Cart::where('user_id', $user->id)->with('items.product')->firstOrFail();
            $cartItems = $cart->items;

            if ($cartItems->isEmpty()) {
                throw new \Exception('Cart is empty');
            }

            // Validate stock availability
            foreach ($cartItems as $item) {
                $product = $item->product;
                if ($product->stock_quantity < $item->quantity) {
                    throw new \Exception("Insufficient stock for {$product->name}");
                }
            }

            // Calculate totals
            $subtotal = $cartItems->sum(fn ($item) => $item->quantity * $item->price);
            $taxRate = 0.12; // 12% VAT
            $tax = $subtotal * $taxRate;
            $total = $subtotal + $tax;

            // Create order
            $order = Order::create([
                'customer_id' => $user->customer->id,
                'order_number' => $this->generateOrderNumber(),
                'subtotal' => $subtotal,
                'tax' => $tax,
                'total' => $total,
                'status' => 'pending',
                'payment_status' => 'unpaid',
                'delivery_address' => $checkoutData['delivery_address'] ?? $user->customer->default_address,
                'delivery_phone' => $checkoutData['delivery_phone'] ?? $user->customer->phone,
                'notes' => $checkoutData['notes'] ?? null,
            ]);

            // Create order items and deduct inventory
            foreach ($cartItems as $cartItem) {
                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $cartItem->product_id,
                    'product_variant_id' => $cartItem->product_variant_id,
                    'quantity' => $cartItem->quantity,
                    'unit_price' => $cartItem->price,
                    'subtotal' => $cartItem->quantity * $cartItem->price,
                ]);

                // Deduct from inventory
                try {
                    $this->inventoryService->adjustStock(
                        user: $user,
                        productId: $cartItem->product_id,
                        variantId: $cartItem->product_variant_id,
                        quantityChange: -$cartItem->quantity,
                        reason: "Order #{$order->order_number}",
                        type: 'order'
                    );
                } catch (\Exception $e) {
                    throw new \Exception("Failed to deduct inventory: {$e->getMessage()}");
                }
            }

            // Clear cart
            $cart->items()->delete();

            // Audit log
            $this->auditService->record([
                'user_id' => $user->id,
                'action' => 'order_created',
                'module' => 'orders',
                'record_type' => 'order',
                'record_id' => $order->id,
                'before' => null,
                'after' => $order->toArray(),
                'ip_address' => request()->ip(),
            ]);

            return [
                'success' => true,
                'order' => $order,
                'message' => "Order #{$order->order_number} created successfully",
            ];
        });
    }

    /**
     * Create a walk-in order (from POS)
     */
    public function createWalkIn($user, $items, $paymentData): array
    {
        return DB::transaction(function () use ($user, $items, $paymentData) {
            // Validate stock for all items
            foreach ($items as $item) {
                $product = Product::findOrFail($item['product_id']);
                if ($product->stock_quantity < $item['quantity']) {
                    throw new \Exception("Insufficient stock for {$product->name}");
                }
            }

            // Calculate totals
            $subtotal = 0;
            foreach ($items as $item) {
                $product = Product::findOrFail($item['product_id']);
                $subtotal += $product->base_price * $item['quantity'];
            }
            $tax = $subtotal * 0.12;
            $total = $subtotal + $tax;

            // Create order
            $order = Order::create([
                'customer_id' => null, // Walk-in has no customer
                'order_number' => $this->generateOrderNumber(),
                'subtotal' => $subtotal,
                'tax' => $tax,
                'total' => $total,
                'status' => 'received', // Walk-in orders are immediately received
                'payment_status' => 'paid', // Assume cash payment
                'delivery_address' => null,
                'delivery_phone' => null,
                'notes' => 'Walk-in order - Staff: ' . $user->name,
            ]);

            // Create order items and deduct inventory
            foreach ($items as $item) {
                $product = Product::findOrFail($item['product_id']);
                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $product->id,
                    'product_variant_id' => $item['variant_id'] ?? null,
                    'quantity' => $item['quantity'],
                    'unit_price' => $product->base_price,
                    'subtotal' => $product->base_price * $item['quantity'],
                ]);

                // Deduct inventory
                $this->inventoryService->adjustStock(
                    user: $user,
                    productId: $product->id,
                    variantId: $item['variant_id'] ?? null,
                    quantityChange: -$item['quantity'],
                    reason: "Walk-in Order #{$order->order_number}",
                    type: 'pos'
                );
            }

            // Record payment
            $order->payments()->create([
                'amount' => $total,
                'method' => $paymentData['method'] ?? 'cash',
                'status' => 'completed',
                'reference' => $paymentData['reference'] ?? null,
            ]);

            // Audit log
            $this->auditService->record([
                'user_id' => $user->id,
                'action' => 'walk_in_order_created',
                'module' => 'pos',
                'record_type' => 'order',
                'record_id' => $order->id,
                'before' => null,
                'after' => $order->toArray(),
                'ip_address' => request()->ip(),
            ]);

            return [
                'success' => true,
                'order' => $order,
                'message' => "Walk-in Order #{$order->order_number} processed",
            ];
        });
    }

    /**
     * Transition order status through workflow
     */
    public function transitionStatus($order, $targetStatus, $user): array
    {
        $allowedTransitions = [
            'pending' => ['confirmed'],
            'confirmed' => ['processing'],
            'processing' => ['ready'],
            'ready' => ['out_for_delivery'],
            'out_for_delivery' => ['completed'],
            'completed' => [],
        ];

        if (!isset($allowedTransitions[$order->status]) || !in_array($targetStatus, $allowedTransitions[$order->status])) {
            throw new \Exception("Cannot transition from {$order->status} to {$targetStatus}");
        }

        $before = $order->status;
        $order->update(['status' => $targetStatus]);

        $this->auditService->record([
            'user_id' => $user->id,
            'action' => 'order_status_changed',
            'module' => 'orders',
            'record_type' => 'order',
            'record_id' => $order->id,
            'before' => ['status' => $before],
            'after' => ['status' => $targetStatus],
            'ip_address' => request()->ip(),
        ]);

        return [
            'success' => true,
            'message' => "Order status changed from {$before} to {$targetStatus}",
            'order' => $order->fresh(),
        ];
    }

    /**
     * Generate unique order number
     */
    private function generateOrderNumber(): string
    {
        $prefix = 'JEM-';
        $count = Order::count() + 1;
        return $prefix . str_pad($count, 6, '0', STR_PAD_LEFT);
    }

    /**
     * Get order statistics for dashboard
     */
    public function getOrderStats(): array
    {
        return [
            'total_orders' => Order::count(),
            'pending_orders' => Order::where('status', 'pending')->count(),
            'processing_orders' => Order::where('status', 'processing')->count(),
            'completed_orders' => Order::where('status', 'completed')->count(),
            'unpaid_orders' => Order::where('payment_status', 'unpaid')->count(),
            'total_revenue' => Order::sum('total'),
            'average_order_value' => Order::avg('total'),
        ];
    }
}
