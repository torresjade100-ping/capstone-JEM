<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Customer;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Http\Requests\ValidateStockRequest;
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

    /**
     * Pre-Checkout Stock Validation for Mobile App
     * Lightweight read-only query checking physical inventory & backorder thresholds.
     */
    public function validateStock(ValidateStockRequest $request): JsonResponse
    {
        $items = $request->validated()['items'];

        $productIds = collect($items)->pluck('product_id')->unique()->filter()->values()->all();
        $variantIds = collect($items)->pluck('product_variant_id')->filter()->unique()->values()->all();

        // Bulk read-only fetch to minimize database overhead (avoids N+1)
        $products = Product::whereIn('id', $productIds)
            ->select(['id', 'name', 'stock_quantity', 'low_stock_threshold', 'status'])
            ->get()
            ->keyBy('id');

        $variants = !empty($variantIds)
            ? ProductVariant::whereIn('id', $variantIds)
                ->select(['id', 'product_id', 'stock_quantity', 'status'])
                ->get()
                ->keyBy('id')
            : collect();

        $responseItems = [];
        $isValid = true;
        $hasModifications = false;

        foreach ($items as $item) {
            $productId = (int) $item['product_id'];
            $variantId = !empty($item['product_variant_id']) ? (int) $item['product_variant_id'] : null;
            $requestedQty = (int) $item['requested_qty'];

            $product = $products->get($productId);
            $variant = $variantId ? $variants->get($variantId) : null;

            if (!$product || $product->status !== 'active' || ($variant && $variant->status !== 'active')) {
                $isValid = false;
                $hasModifications = true;
                $responseItems[] = [
                    'product_id' => $productId,
                    'is_available' => false,
                    'current_stock' => 0,
                    'backorder_needed' => true,
                ];
                continue;
            }

            $currentStock = $variant ? (int) $variant->stock_quantity : (int) $product->stock_quantity;
            $availableStock = max(0, $currentStock);

            $isAvailable = $availableStock >= $requestedQty;
            $backorderNeeded = $availableStock < $requestedQty;

            if (!$isAvailable) {
                $isValid = false;
                $hasModifications = true;
            }

            $responseItems[] = [
                'product_id' => $productId,
                'is_available' => $isAvailable,
                'current_stock' => $availableStock,
                'backorder_needed' => $backorderNeeded,
            ];
        }

        $message = $isValid
            ? 'All items are in stock.'
            : 'Some items exceed available stock or require backorder.';

        return response()->json([
            'is_valid' => $isValid,
            'has_modifications' => $hasModifications,
            'items' => $responseItems,
            'message' => $message,
        ], 200);
    }
}
