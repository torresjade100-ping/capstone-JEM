<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\InventoryService;
use App\Models\Inventory as InventoryModel;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class InventoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = InventoryModel::query()->with(['product', 'product_variant']);

        if ($request->filled('product_id')) {
            $query->where('product_id', $request->product_id);
        }

        $items = $query->orderBy('id')->paginate(50);

        return response()->json(['success' => true, 'data' => $items]);
    }

    public function lowStock(InventoryService $inventoryService): JsonResponse
    {
        $data = $inventoryService->getLowStock();

        return response()->json(['success' => true, 'data' => $data]);
    }
}
