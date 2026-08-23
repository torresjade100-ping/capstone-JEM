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
}
