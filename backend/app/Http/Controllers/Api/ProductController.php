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
            ->whereHas('category', fn ($query) => $query->where('status', 'active'))
            ->whereHas('brand', fn ($query) => $query->where('status', 'active'));

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->filled('brand_id')) {
            $query->where('brand_id', $request->brand_id);
        }

        if ($request->filled('search')) {
            $query->where('name', 'like', '%'.$request->search.'%');
        }

        $products = $query->orderBy('name')->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $products,
        ]);
    }

    public function show(Product $product): JsonResponse
    {
        if ($product->status !== 'active' || $product->category->status !== 'active' || $product->brand->status !== 'active') {
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
