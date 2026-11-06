<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Product::with(['category', 'brand', 'variants'])
            ->where('status', 'active')
            ->where(function ($q) {
                $q->whereNull('category_id')
                  ->orWhereHas('category', fn ($c) => $c->where('status', 'active'));
            })
            ->where(function ($q) {
                $q->whereNull('brand_id')
                  ->orWhereHas('brand', fn ($b) => $b->where('status', 'active'));
            });

        if ($request->filled('category_id')) {
            $cat = $request->category_id;
            if (is_numeric($cat)) {
                $query->where('category_id', (int) $cat);
            } else {
                $query->whereHas('category', function ($q) use ($cat) {
                    $q->where('name', $cat);
                });
            }
        }

        if ($request->filled('brand_id')) {
            $query->where('brand_id', $request->brand_id);
        }

        if ($request->filled('search')) {
            $searchTerm = $request->search;
            $query->where(function ($search) use ($searchTerm) {
                $search->where('name', 'like', '%'.$searchTerm.'%')
                    ->orWhereHas('variants', fn ($v) => $v->where('sku', 'like', '%'.$searchTerm.'%'));
            });
        }

        $perPageInput = $request->input('per_page', 300);
        $perPage = ($perPageInput === 'all' || (int) $perPageInput > 200)
            ? min((int) ($perPageInput === 'all' ? 500 : $perPageInput), 500)
            : min(max((int) $perPageInput, 1), 300);

        $products = $query->orderBy('name')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $products,
        ]);
    }

    public function show(Product $product): JsonResponse
    {
        if ($product->status !== 'active'
            || ($product->category_id && $product->category?->status !== 'active')
            || ($product->brand_id && $product->brand?->status !== 'active')) {
            return response()->json([
                'success' => false,
                'message' => 'Product not found.',
            ], 404);
        }

        $product->load(['category', 'brand', 'variants']);

        return response()->json([
            'success' => true,
            'data' => $product,
        ]);
    }
}
