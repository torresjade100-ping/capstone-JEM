<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class CategoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Category::withCount('products')->orderBy('name');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $term = $request->search;
            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', "%{$term}%")
                  ->orWhere('description', 'like', "%{$term}%");
            });
        }

        if ($request->boolean('all', false) || $request->input('per_page') === 'all') {
            $categories = $query->get();
        } else {
            $perPage = min(max((int) $request->input('per_page', 50), 1), 100);
            $categories = $query->paginate($perPage);
        }

        return response()->json([
            'success' => true,
            'data' => $categories,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('categories', 'name')->whereNull('deleted_at')
            ],
            'description' => ['nullable', 'string'],
            'status' => ['required', 'in:active,inactive'],
        ], [
            'name.unique' => "A category named ':input' already exists. Please choose a different name or use the existing category.",
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $category = Category::create($request->only(['name', 'description', 'status']));
        $category->products_count = 0;

        return response()->json([
            'success' => true,
            'message' => 'Category created successfully.',
            'data' => $category,
        ], 201);
    }

    public function show(Category $category): JsonResponse
    {
        $category->loadCount('products');
        $category->load(['products' => function ($q) {
            $q->with(['brand:id,name', 'variants:id,product_id,sku,price,stock_quantity'])->orderBy('name');
        }]);

        return response()->json([
            'success' => true,
            'data' => $category,
        ]);
    }

    public function products(Category $category): JsonResponse
    {
        $products = $category->products()
            ->with(['brand:id,name', 'variants:id,product_id,sku,price,stock_quantity'])
            ->withCount('batches')
            ->orderBy('name')
            ->get();

        return response()->json([
            'success' => true,
            'category' => [
                'id' => $category->id,
                'name' => $category->name,
                'description' => $category->description,
                'status' => $category->status,
                'products_count' => $products->count(),
            ],
            'data' => $products,
        ]);
    }

    public function update(Request $request, Category $category): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => [
                'sometimes',
                'string',
                'max:255',
                Rule::unique('categories', 'name')->ignore($category->id)->whereNull('deleted_at')
            ],
            'description' => ['nullable', 'string'],
            'status' => ['sometimes', 'in:active,inactive'],
        ], [
            'name.unique' => "Another category named ':input' already exists.",
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $category->update($request->only(['name', 'description', 'status']));
        $category->loadCount('products');

        return response()->json([
            'success' => true,
            'message' => 'Category updated successfully.',
            'data' => $category,
        ]);
    }

    public function destroy(Category $category): JsonResponse
    {
        $productCount = $category->products()->count();
        if ($productCount > 0) {
            return response()->json([
                'success' => false,
                'message' => "Cannot delete category '{$category->name}' because it currently contains {$productCount} product(s). Please reassign or remove these products before deleting this category.",
                'products_count' => $productCount,
            ], 422);
        }

        $category->delete();

        return response()->json([
            'success' => true,
            'message' => 'Category deleted successfully.',
        ]);
    }

    public function activate(Category $category): JsonResponse
    {
        $category->update(['status' => 'active']);
        $category->loadCount('products');

        return response()->json([
            'success' => true,
            'message' => 'Category activated.',
            'data' => $category,
        ]);
    }

    public function deactivate(Category $category): JsonResponse
    {
        $category->update(['status' => 'inactive']);
        $category->loadCount('products');

        return response()->json([
            'success' => true,
            'message' => 'Category deactivated.',
            'data' => $category,
        ]);
    }
}
