<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\InventoryService;
use App\Models\StockAdjustment;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class StockAdjustmentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = StockAdjustment::with(['product:id,name,unit,base_price,stock_quantity', 'user:id,name,email', 'supplier:id,name'])
            ->orderBy('created_at', 'desc')
            ->orderBy('id', 'desc');

        if ($request->filled('product_id')) {
            $query->where('product_id', $request->product_id);
        }

        $perPage = min(max((int) $request->input('per_page', 50), 1), 200);
        $adjustments = $query->paginate($perPage);

        return response()->json(['success' => true, 'data' => $adjustments]);
    }

    public function byProduct($productId): JsonResponse
    {
        $adjustments = StockAdjustment::with(['product:id,name,unit,base_price,stock_quantity', 'user:id,name,email', 'supplier:id,name'])
            ->where('product_id', $productId)
            ->orderBy('created_at', 'desc')
            ->orderBy('id', 'desc')
            ->limit(100)
            ->get();

        return response()->json(['success' => true, 'data' => $adjustments]);
    }

    public function store(Request $request, InventoryService $inventoryService): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'product_variant_id' => ['nullable', 'integer'],
            'quantity_change' => ['required', 'integer', 'not_in:0'],
            'reason' => ['required', 'string', 'max:1000'],
            'adjustment_type' => ['nullable', 'string', 'max:50'],
            'supplier_id' => ['nullable', 'integer', 'exists:suppliers,id'],
            'reference_number' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $user = Auth::user() ?? User::where('role', 'admin')->first() ?? User::first();
        $type = $request->input('adjustment_type', 'other');

        try {
            $result = $inventoryService->adjustStock(
                $user,
                (int) $request->product_id,
                $request->product_variant_id ? (int) $request->product_variant_id : null,
                (int) $request->quantity_change,
                (string) $request->reason,
                (string) $type,
                $request->supplier_id ? (int) $request->supplier_id : null,
                $request->reference_number ? (string) $request->reference_number : null,
                $request->notes ? (string) $request->notes : null
            );

            return response()->json(['success' => true, 'message' => 'Stock adjusted successfully', 'data' => $result]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }
}
