<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Customer;
use App\Models\Product;
use App\Services\InventoryService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class CartController extends Controller
{
    protected InventoryService $inventoryService;

    public function __construct(InventoryService $inventoryService)
    {
        $this->inventoryService = $inventoryService;
    }

    protected function getOrCreateCart($customerId)
    {
        return Cart::firstOrCreate(['customer_id' => $customerId]);
    }

    public function add(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'product_variant_id' => ['nullable', 'integer', 'exists:product_variants,id'],
            'quantity' => ['required', 'integer', 'min:1'],
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $user = Auth::user();
        $customer = $user->customer;
        if (! $customer) {
            return response()->json(['success' => false, 'message' => 'Customer profile not found.'], 404);
        }

        $available = $this->inventoryService->getAvailableQuantity($request->product_id, $request->product_variant_id);
        if ($available < $request->quantity) {
            return response()->json(['success' => false, 'message' => 'Insufficient stock.'], 400);
        }

        $cart = $this->getOrCreateCart($customer->id);

        $price = $request->product_variant_id ? Product::find($request->product_id)->variants()->find($request->product_variant_id)->price : Product::find($request->product_id)->base_price;

        $item = CartItem::create([
            'cart_id' => $cart->id,
            'product_id' => $request->product_id,
            'product_variant_id' => $request->product_variant_id,
            'quantity' => $request->quantity,
            'price' => $price,
        ]);

        return response()->json(['success' => true, 'message' => 'Item added to cart', 'data' => $item], 201);
    }

    public function view(Request $request): JsonResponse
    {
        $user = Auth::user();
        $customer = $user->customer;
        if (! $customer) {
            return response()->json(['success' => false, 'message' => 'Customer profile not found.'], 404);
        }

        $cart = Cart::with('items.product', 'items.variant')->firstWhere('customer_id', $customer->id);
        if (! $cart) {
            return response()->json(['success' => true, 'data' => ['items' => [], 'subtotal' => 0.0, 'shipping_fee' => 0.0, 'total' => 0.0]]);
        }

        $subtotal = 0;
        foreach ($cart->items as $it) {
            $subtotal += $it->quantity * $it->price;
        }

        $shipping = (float) config('app.default_delivery_fee', 50.00);
        $total = $subtotal + $shipping;

        return response()->json(['success' => true, 'data' => ['items' => $cart->items, 'subtotal' => $subtotal, 'shipping_fee' => $shipping, 'total' => $total]]);
    }

    public function updateItem(Request $request, $id): JsonResponse
    {
        $validator = Validator::make($request->all(), ['quantity' => ['required', 'integer', 'min:1']]);
        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $item = CartItem::findOrFail($id);
        $available = $this->inventoryService->getAvailableQuantity($item->product_id, $item->product_variant_id);
        if ($available < $request->quantity) {
            return response()->json(['success' => false, 'message' => 'Insufficient stock.'], 400);
        }

        $item->update(['quantity' => $request->quantity]);

        return response()->json(['success' => true, 'message' => 'Cart item updated', 'data' => $item]);
    }

    public function deleteItem(Request $request, $id): JsonResponse
    {
        $item = CartItem::findOrFail($id);
        $item->delete();

        return response()->json(['success' => true, 'message' => 'Cart item removed']);
    }

    public function clear(Request $request): JsonResponse
    {
        $user = Auth::user();
        $customer = $user->customer;
        if (! $customer) {
            return response()->json(['success' => false, 'message' => 'Customer profile not found.'], 404);
        }

        $cart = Cart::firstWhere('customer_id', $customer->id);
        if ($cart) {
            $cart->items()->delete();
        }

        return response()->json(['success' => true, 'message' => 'Cart cleared']);
    }
}
