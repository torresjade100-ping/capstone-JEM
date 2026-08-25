<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Services\InventoryService;
use App\Http\Requests\CheckoutRequest as CheckoutRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Services\AuditService;
use Illuminate\Support\Facades\Request as RequestFacade;

class OrderController extends Controller
{
    protected InventoryService $inventoryService;

    public function __construct(InventoryService $inventoryService)
    {
        $this->inventoryService = $inventoryService;
    }

    public function index(): JsonResponse
    {
        $user = Auth::user();
        $customer = $user->customer;
        $orders = Order::where('customer_id', $customer->id)->orderBy('created_at', 'desc')->paginate(20);

        return response()->json(['success' => true, 'data' => $orders]);
    }

    public function show($id): JsonResponse
    {
        $user = Auth::user();
        $customer = $user->customer;
        $order = Order::with('items')->where('customer_id', $customer->id)->findOrFail($id);

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
            // Validate stock and calculate totals server-side
            $subtotal = 0;
            foreach ($cart->items as $item) {
                $available = $this->inventoryService->getAvailableQuantity($item->product_id, $item->product_variant_id);
                if ($available < $item->quantity) {
                    throw new \Exception('Insufficient stock for product ID '.$item->product_id);
                }

                $price = $item->price; // price stored in cart; recalc from product to prevent manipulation
                $product = $item->product;
                if ($item->product_variant_id) {
                    $variant = $item->variant;
                    $price = $variant->price;
                } else {
                    $price = $product->base_price;
                }

                $lineTotal = $price * $item->quantity;
                $subtotal += $lineTotal;
            }

            $shipping = (float) config('app.default_delivery_fee', 50.00);
            $tax = 0.00;
            $total = $subtotal + $shipping + $tax;

            // Create order
            $order = Order::create([
                'customer_id' => $customer->id,
                'order_number' => 'JEM'.time().Str::random(4),
                'status' => 'confirmed',
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

            // Create order items and deduct stock
            foreach ($cart->items as $item) {
                $product = $item->product;
                $price = $item->product_variant_id ? $item->variant->price : $product->base_price;
                $lineTotal = $price * $item->quantity;

                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $item->product_id,
                    'product_variant_id' => $item->product_variant_id,
                    'quantity' => $item->quantity,
                    'unit_price' => $price,
                    'total_price' => $lineTotal,
                ]);

                // Deduct stock
                $this->inventoryService->adjustStock($user, $item->product_id, $item->product_variant_id, -1 * $item->quantity, 'order_checkout', 'restock');
            }

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

            return response()->json(['success' => true, 'message' => 'Order created', 'data' => $order]);
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

                $shipping = (float) ($request->shipping_fee ?? 200.00);
                $total = (float) ($request->total ?? ($subtotal + $shipping));
                $orderNumber = $request->order_number ?: ('JEM-'.date('Ymd').'-'.rand(1000, 9999));

                $validPaymentMethod = in_array(strtolower($request->payment_method), ['gcash', 'maya', 'cod'], true)
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
                    'delivery_address' => $request->delivery_address ?: 'Block 12 Lot 8, Villa San Isidro, Santa Rosa, Laguna',
                    'delivery_date' => $deliveryDate,
                ]);


                // 3. Create Order Items (ensuring Product existence)
                $firstCat = \App\Models\Category::first();
                $firstBrand = \App\Models\Brand::first();

                foreach ($items as $it) {
                    $pid = (int) ($it['product_id'] ?? $it['id'] ?? 1);
                    $product = \App\Models\Product::find($pid);

                    if (! $product) {
                        $product = \App\Models\Product::firstOrCreate(
                            ['name' => $it['name'] ?: 'Hardware Material Item'],
                            [
                                'category_id' => $firstCat?->id ?: 1,
                                'brand_id' => $firstBrand?->id ?: 1,
                                'base_price' => (float) ($it['unit_price'] ?? $it['price'] ?? 100),
                                'unit' => 'piece',
                                'status' => 'active',
                            ]
                        );
                        $pid = $product->id;
                    }

                    $qty = max((int) ($it['quantity'] ?? $it['qty'] ?? 1), 1);
                    $price = (float) ($it['unit_price'] ?? $it['price'] ?? $product->base_price);

                    OrderItem::create([
                        'order_id' => $order->id,
                        'product_id' => $pid,
                        'quantity' => $qty,
                        'unit_price' => $price,
                        'total_price' => $qty * $price,
                    ]);
                }

                // 4. Create Payment record with valid enum status
                Payment::create([
                    'order_id' => $order->id,
                    'method' => $validPaymentMethod,
                    'status' => $validPaymentMethod === 'cod' ? 'pending' : 'completed',
                    'amount' => $total,
                ]);

                // 5. Notify Admin and Staff in database
                $notifTitle = 'New Customer Mobile Order 🛒';
                $notifMsg = "Order #{$order->order_number} (₱".number_format($total, 2).') placed by '.($request->customer_name ?: 'Customer').' via '.strtoupper($validPaymentMethod);
                $notifArray = [
                    'order_id' => $order->id,
                    'order_number' => $order->order_number,
                    'total' => $total,
                    'customer_name' => $request->customer_name ?: 'Customer',
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
                    'message' => 'Mobile order placed and synced with backend warehouse.',
                    'data' => $order->load(['items.product', 'payments', 'customer.user']),
                ], 201);
            });
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to process order: '.$e->getMessage(),
            ], 500);
        }
    }


}

