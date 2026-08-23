<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class POSController extends Controller
{
    protected $orderService;

    public function __construct(OrderService $orderService)
    {
        $this->orderService = $orderService;
    }

    /**
     * Create a walk-in order from POS
     */
    public function createOrder(Request $request): JsonResponse
    {
        $data = $request->validate([
            'items' => ['required', 'array'],
            'items.*.product_id' => ['required', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.variant_id' => ['nullable', 'exists:product_variants,id'],
            'payment_method' => ['required', 'in:gcash,maya,cod'],
            'notes' => ['nullable', 'string'],
        ]);

        try {
            $result = $this->orderService->createWalkIn(
                user: $request->user(),
                items: $data['items'],
                paymentData: ['method' => $data['payment_method']]
            );

            return response()->json($result, 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Get POS statistics
     */
    public function stats(Request $request): JsonResponse
    {
        $today = now()->startOfDay();
        $tomorrow = now()->addDay()->startOfDay();

        $stats = [
            'transactions_today' => 0,
            'sales_today' => 0,
            'average_transaction' => 0,
            'top_products' => [],
        ];

        try {
            $orders = \App\Models\Order::where('customer_id', null)
                ->whereBetween('created_at', [$today, $tomorrow])
                ->with('items.product')
                ->get();

            $stats['transactions_today'] = $orders->count();
            $stats['sales_today'] = $orders->sum('total');
            $stats['average_transaction'] = $orders->count() > 0 ? $orders->sum('total') / $orders->count() : 0;

            // Top products
            $productCounts = [];
            foreach ($orders as $order) {
                foreach ($order->items as $item) {
                    $productName = $item->product->name;
                    if (!isset($productCounts[$productName])) {
                        $productCounts[$productName] = 0;
                    }
                    $productCounts[$productName] += $item->quantity;
                }
            }
            arsort($productCounts);
            $stats['top_products'] = array_slice($productCounts, 0, 5);
        } catch (\Exception $e) {
            Log::error('POS stats error: ' . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }
}
