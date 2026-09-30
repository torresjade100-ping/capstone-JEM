<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Services\BackorderService;
use App\Services\InventoryService;
use App\Http\Requests\CheckoutRequest as CheckoutRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use App\Services\AuditService;
use Illuminate\Support\Facades\Request as RequestFacade;

class OrderController extends Controller
{
    protected InventoryService $inventoryService;
    protected BackorderService $backorderService;

    public function __construct(InventoryService $inventoryService, BackorderService $backorderService)
    {
        $this->inventoryService = $inventoryService;
        $this->backorderService = $backorderService;
    }

    public function index(): JsonResponse
    {
        $user = Auth::user();
        $customer = $user->customer;
        $orders = Order::with(['items.product', 'backorders.product', 'payments'])
            ->where('customer_id', $customer->id)
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json(['success' => true, 'data' => $orders]);
    }

    public function show($id): JsonResponse
    {
        $user = Auth::user();
        $customer = $user->customer;
        $order = Order::with(['items.product', 'backorders.product', 'payments'])
            ->where('customer_id', $customer->id)
            ->findOrFail($id);

        return response()->json(['success' => true, 'data' => $order]);
    }

    public function checkout(CheckoutRequest $request): JsonResponse
    {
        $validator = validator($request->all(), [
            'payment_method' => ['required', 'in:gcash,maya,cod'],
            'delivery_address' => ['required', 'string'],
            'delivery_date' => ['nullable', 'date'],
            'idempotency_key' => ['nullable', 'string', 'max:255'],
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $user = Auth::user();
        $customer = $user->customer;
        if (! $customer) {
            return response()->json(['success' => false, 'message' => 'Customer profile not found.'], 404);
        }

        $cart = Cart::with('items')->firstWhere('customer_id', $customer->id);
        if (! $cart || $cart->items->isEmpty()) {
            return response()->json(['success' => false, 'message' => 'Cart is empty.'], 400);
        }

        // Idempotency check
        if ($request->filled('idempotency_key')) {
            $existing = Order::where('idempotency_key', $request->idempotency_key)->where('customer_id', $customer->id)->first();
            if ($existing) {
                return response()->json(['success' => true, 'message' => 'Duplicate request', 'data' => $existing]);
            }
        }

        return DB::transaction(function () use ($request, $customer, $cart, $user) {
            $subtotal = 0;
            $itemsData = [];
            foreach ($cart->items as $item) {
                $product = $item->product;
                $price = $item->product_variant_id ? $item->variant?->price : $product?->base_price;
                if (!$price) $price = $item->price;

                $lineTotal = $price * $item->quantity;
                $subtotal += $lineTotal;

                $itemsData[] = [
                    'product_id' => $item->product_id,
                    'product_variant_id' => $item->product_variant_id,
                    'quantity' => $item->quantity,
                    'unit_price' => $price,
                    'name' => $product?->name ?? 'Hardware Product',
                ];
            }

            $shipping = (float) config('app.default_delivery_fee', 50.00);
            $tax = 0.00;
            $total = $subtotal + $shipping + $tax;

            // Create order
            $order = Order::create([
                'customer_id' => $customer->id,
                'order_number' => 'JEM'.time().Str::random(4),
                'status' => 'pending',
                'payment_method' => $request->payment_method,
                'subtotal' => $subtotal,
                'shipping_fee' => $shipping,
                'tax' => $tax,
                'total' => $total,
                'amount_paid' => 0.00,
                'delivery_address' => $request->delivery_address,
                'delivery_date' => $request->delivery_date,
                'idempotency_key' => $request->idempotency_key,
            ]);

            try {
                app(AuditService::class)->record([
                    'user_id' => $user->id ?? null,
                    'action' => 'create',
                    'module' => 'order',
                    'record_type' => 'order',
                    'record_id' => $order->id,
                    'before' => null,
                    'after' => $order->toArray(),
                    'ip_address' => RequestFacade::ip(),
                ]);
            } catch (\Throwable $e) {
            }

            // Create order items & detect backorders automatically
            $this->backorderService->processOrderItems($order, $itemsData, $user);

            // Create payment record
            $paymentStatus = $request->payment_method === 'cod' ? 'Awaiting COD Collection' : 'Unpaid';

            $payment = Payment::create([
                'order_id' => $order->id,
                'method' => $request->payment_method,
                'status' => $paymentStatus,
                'amount' => $total,
            ]);

            // Clear cart
            $cart->items()->delete();

            return response()->json([
                'success' => true,
                'message' => 'Order created',
                'data' => $order->fresh(['items.product', 'backorders.product', 'payments'])
            ]);
        });
    }

    public function storeMobileOrder(\Illuminate\Http\Request $request): JsonResponse
    {
        $validator = validator($request->all(), [
            'items' => ['required', 'array', 'min:1'],
            'payment_method' => ['required', 'string'],
            'delivery_address' => ['nullable', 'string'],
            'customer_name' => ['nullable', 'string'],
            'customer_phone' => ['nullable', 'string'],
            'customer_email' => ['nullable', 'string'],
            'total' => ['nullable', 'numeric'],
            'subtotal' => ['nullable', 'numeric'],
            'shipping_fee' => ['nullable', 'numeric'],
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        try {
            return DB::transaction(function () use ($request) {
                // 1. Resolve Customer
                $customer = null;
                if (Auth::check() && Auth::user()->customer) {
                    $customer = Auth::user()->customer;
                } elseif ($request->filled('customer_email')) {
                    $user = \App\Models\User::where('email', $request->customer_email)->first();
                    if ($user && $user->customer) {
                        $customer = $user->customer;
                    }
                }
                if (! $customer) {
                    $customer = \App\Models\Customer::first();
                    if (! $customer) {
                        $defaultUser = \App\Models\User::firstOrCreate(
                            ['email' => 'customer@jemlumber.com'],
                            [
                                'name' => $request->customer_name ?: 'Juan Dela Cruz',
                                'phone' => $request->customer_phone ?: '+639191234567',
                                'password' => Hash::make('Password123!'),
                                'role' => 'customer',
                                'status' => 'active',
                            ]
                        );
                        $customer = \App\Models\Customer::firstOrCreate(
                            ['user_id' => $defaultUser->id],
                            [
                                'address_line1' => $request->delivery_address ?: 'Santa Rosa, Laguna',
                                'city' => 'Santa Rosa',
                                'province' => 'Laguna',
                                'postal_code' => '4026',
                                'country' => 'Philippines',
                            ]
                        );
                    }
                }

                $items = $request->input('items', []);

                $subtotal = 0;
                foreach ($items as $it) {
                    $qty = (int) ($it['quantity'] ?? $it['qty'] ?? 1);
                    $price = (float) ($it['unit_price'] ?? $it['price'] ?? 0);
                    $subtotal += ($qty * $price);
                }

                $deliveryType = strtolower($request->delivery_type ?? 'delivery');
                $shipping = $deliveryType === 'pickup' ? 0.00 : (float) ($request->shipping_fee ?? 200.00);
                $total = (float) ($request->total ?? ($subtotal + $shipping));
                $orderNumber = $request->order_number ?: ('JEM-'.date('Ymd').'-'.rand(1000, 9999));

                $validPaymentMethod = in_array(strtolower($request->payment_method), ['gcash', 'maya', 'bank_transfer', 'cod'], true)
                    ? strtolower($request->payment_method)
                    : 'cod';

                $deliveryDate = date('Y-m-d');
                if ($request->filled('delivery_date')) {
                    try {
                        $deliveryDate = \Carbon\Carbon::parse($request->delivery_date)->format('Y-m-d');
                    } catch (\Throwable $e) {
                        $deliveryDate = date('Y-m-d');
                    }
                }

                // 2. Create Order
                $order = Order::create([
                    'customer_id' => $customer->id,
                    'order_number' => $orderNumber,
                    'status' => 'pending',
                    'payment_method' => $validPaymentMethod,
                    'subtotal' => $subtotal,
                    'shipping_fee' => $shipping,
                    'tax' => 0.00,
                    'total' => $total,
                    'amount_paid' => $validPaymentMethod === 'cod' ? 0.00 : $total,
                    'delivery_address' => $deliveryType === 'pickup' ? 'Store Pickup: JEM Main Yard, National Highway, Santa Rosa' : ($request->delivery_address ?: 'Block 12 Lot 8, Villa San Isidro, Santa Rosa, Laguna'),
                    'delivery_date' => $deliveryDate,
                ]);

                // 3. Process items and auto-detect backorders
                $systemUser = Auth::user() ?? \App\Models\User::where('role', 'admin')->first() ?? $customer->user;
                $processResult = $this->backorderService->processOrderItems($order, $items, $systemUser);

                // 4. Create Payment record
                Payment::create([
                    'order_id' => $order->id,
                    'method' => $validPaymentMethod,
                    'status' => $validPaymentMethod === 'cod' ? 'pending' : 'completed',
                    'amount' => $total,
                    'reference_number' => $request->reference_number ?: ('REF-' . strtoupper(Str::random(8))),
                ]);

                // 5. Notify Admin & Staff of incoming order
                $notifTitle = $processResult['is_backordered'] ? 'Order with Backorder ⏳' : 'New Customer Mobile Order 🛒';
                $notifMsg = "Order #{$order->order_number} (₱".number_format($total, 2).') placed by '.($request->customer_name ?: 'Customer').' via '.strtoupper($validPaymentMethod) . ($processResult['is_backordered'] ? ' (Contains Backorders)' : '');
                $notifArray = [
                    'order_id' => $order->id,
                    'order_number' => $order->order_number,
                    'total' => $total,
                    'customer_name' => $request->customer_name ?: 'Customer',
                    'is_backordered' => $processResult['is_backordered'],
                ];

                $adminUsers = \App\Models\User::whereIn('role', ['admin', 'staff'])->get();
                foreach ($adminUsers as $u) {
                    \App\Models\Notification::create([
                        'user_id' => $u->id,
                        'title' => $notifTitle,
                        'message' => $notifMsg,
                        'type' => 'order',
                        'data' => $notifArray,
                        'channel' => 'database',
                        'read' => false,
                    ]);
                }

                return response()->json([
                    'success' => true,
                    'message' => $processResult['is_backordered'] 
                        ? 'Order placed! Some items are on backorder and will be fulfilled once restocked.' 
                        : 'Mobile order placed and synced with backend warehouse.',
                    'data' => $order->load(['items.product', 'payments', 'customer.user', 'backorders.product']),
                    'is_backordered' => $processResult['is_backordered'],
                ], 201);
            });
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to process order: '.$e->getMessage(),
            ], 422);
        }
    }

    public function cancelMobileOrder($id, ?\Illuminate\Http\Request $request = null): JsonResponse
    {
        $order = Order::with('items.product')->where('id', $id)->orWhere('order_number', $id)->first();

        if (! $order) {
            return response()->json(['success' => false, 'message' => 'Order not found.'], 404);
        }

        $cancellableStatuses = ['pending', 'unpaid', 'to pay', 'to_pay', 'to process', 'to_process', 'confirmed', 'backordered'];
        $currentStatus = strtolower($order->status);

        if (! in_array($currentStatus, $cancellableStatuses, true)) {
            return response()->json([
                'success' => false,
                'message' => "Order cannot be cancelled because it is already '{$order->status}'.",
            ], 400);
        }

        try {
            DB::transaction(function () use ($order) {
                $order->status = 'cancelled';
                $order->save();

                // Restore stock for physically fulfilled items only (backorders were not subtracted from physical stock)
                $systemUser = Auth::user() ?? \App\Models\User::where('role', 'admin')->first();
                foreach ($order->items as $item) {
                    $qty = (int) ($item->fulfilled_quantity ?? $item->quantity);
                    if ($qty <= 0) continue;

                    try {
                        $this->inventoryService->adjustStock(
                            $systemUser,
                            $item->product_id,
                            $item->product_variant_id,
                            $qty,
                            "Cancelled Order #{$order->order_number} Stock Restored",
                            'cancellation'
                        );
                    } catch (\Throwable $stockErr) {
                        \App\Models\Product::where('id', $item->product_id)->increment('stock_quantity', $qty);
                        if ($item->product_variant_id) {
                            \App\Models\ProductVariant::where('id', $item->product_variant_id)->increment('stock_quantity', $qty);
                        }
                    }
                }

                // Cancel open backorders for this order
                \App\Models\Backorder::where('order_id', $order->id)
                    ->whereIn('status', ['pending', 'partially_fulfilled', 'partial'])
                    ->update([
                        'status' => 'cancelled',
                        'notes' => DB::raw("CONCAT(COALESCE(notes, ''), ' | Order cancelled by customer')")
                    ]);

                // Update payment status
                Payment::where('order_id', $order->id)->update(['status' => 'refunded']);

                // Create cancellation notification
                if ($order->customer && $order->customer->user_id) {
                    \App\Models\Notification::create([
                        'user_id' => $order->customer->user_id,
                        'title' => "Order #{$order->order_number} Cancelled",
                        'message' => "Your order #{$order->order_number} has been cancelled.",
                        'type' => 'order',
                        'data' => ['order_id' => $order->id, 'order_number' => $order->order_number],
                        'channel' => 'database',
                        'read' => false,
                    ]);
                }
            });

            return response()->json([
                'success' => true,
                'message' => "Order #{$order->order_number} has been cancelled.",
                'data' => $order->fresh(['items.product', 'payments', 'backorders.product']),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to cancel order: ' . $e->getMessage(),
            ], 500);
        }
    }
}


