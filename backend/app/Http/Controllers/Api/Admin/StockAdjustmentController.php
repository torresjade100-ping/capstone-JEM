<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\InventoryService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class StockAdjustmentController extends Controller
{
    public function store(Request $request, InventoryService $inventoryService): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'product_variant_id' => ['nullable', 'integer', 'exists:product_variants,id'],
            'quantity_change' => ['required', 'integer'],
            'reason' => ['required', 'string', 'max:1000'],
            'adjustment_type' => ['required', 'in:damaged,expired,return_to_supplier,miscount,restock,other'],
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $user = Auth::user();

        try {
            $result = $inventoryService->adjustStock($user, $request->product_id, $request->product_variant_id, (int) $request->quantity_change, $request->reason, $request->adjustment_type);

            return response()->json(['success' => true, 'message' => 'Stock adjusted', 'data' => $result]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }
}
