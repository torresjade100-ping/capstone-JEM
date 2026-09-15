<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\InventoryService;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class InventoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Product::with(['category', 'brand', 'variants', 'batches.supplier'])
            ->withCount('batches')
            ->orderBy('name');

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                  ->orWhereHas('category', fn ($c) => $c->where('name', 'like', "%{$s}%"))
                  ->orWhereHas('brand', fn ($b) => $b->where('name', 'like', "%{$s}%"));
            });
        }

        if ($request->filled('category_id')) {
            $cat = $request->category_id;
            if (is_numeric($cat)) {
                $query->where('category_id', (int) $cat);
            } else {
                $query->whereHas('category', function ($q) use ($cat) {
                    $q->where('name', $cat);
                });
            }
        } elseif ($request->filled('category')) {
            $cat = $request->category;
            if (is_numeric($cat)) {
                $query->where('category_id', (int) $cat);
            } else {
                $query->whereHas('category', function ($q) use ($cat) {
                    $q->where('name', $cat);
                });
            }
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $products = $query->get();

        $items = $products->map(function ($p) {
            $qty = (int) $p->stock_quantity;
            $threshold = (int) ($p->low_stock_threshold ?? 10);
            $stockStatus = $qty <= 0 ? 'out_of_stock' : ($qty <= $threshold ? 'low_stock' : 'in_stock');
            $prodStatus = $p->status ?? 'active';
            $costPrice = (float) ($p->cost_price ?? 0);
            $sellingPrice = (float) ($p->selling_price ?? $p->base_price ?? 0);
            $margin = $sellingPrice > 0 ? round((($sellingPrice - $costPrice) / $sellingPrice) * 100, 1) : 0;
            $latestBatch = $p->batches->first();

            return [
                'id' => $p->id,
                'product_id' => $p->id,
                'product_name' => $p->name,
                'name' => $p->name,
                'category' => $p->category?->name ?? 'General Construction',
                'category_id' => $p->category_id,
                'brand' => $p->brand?->name ?? '—',
                'brand_id' => $p->brand_id,
                'supplier' => $latestBatch?->supplier_name ?? $latestBatch?->supplier?->name ?? $p->brand?->name ?? '—',
                'unit' => $p->unit ?? 'piece',
                'cost_price' => $costPrice,
                'selling_price' => $sellingPrice,
                'unit_price' => $sellingPrice,
                'price' => $sellingPrice,
                'margin_percent' => $margin,
                'quantity' => $qty,
                'current_quantity' => $qty,
                'stock_quantity' => $qty,
                'low_stock_threshold' => $threshold,
                'threshold' => $threshold,
                'stock_status' => $stockStatus,
                'status' => $prodStatus,
                'is_active' => $prodStatus === 'active',
                'batches_count' => (int) ($p->batches_count ?? $p->batches->count()),
                'latest_batch' => $latestBatch,
                'created_at' => $p->created_at,
                'updated_at' => $p->updated_at,
                'product' => [
                    'id' => $p->id,
                    'name' => $p->name,
                    'unit' => $p->unit ?? 'piece',
                    'cost_price' => $costPrice,
                    'selling_price' => $sellingPrice,
                    'base_price' => $sellingPrice,
                    'stock_quantity' => $qty,
                    'low_stock_threshold' => $threshold,
                    'status' => $prodStatus,
                    'category' => $p->category,
                    'brand' => $p->brand,
                ],
            ];
        });

        return response()->json(['success' => true, 'data' => $items]);
    }

    public function lowStock(InventoryService $inventoryService): JsonResponse
    {
        $data = $inventoryService->getLowStock();

        return response()->json(['success' => true, 'data' => $data]);
    }
}
