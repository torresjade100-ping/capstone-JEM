<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use App\Services\AuditService;
use Illuminate\Support\Facades\Request as RequestFacade;

class ProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Product::with(['category', 'brand', 'variants']);

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->filled('brand_id')) {
            $query->where('brand_id', $request->brand_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $query->where(function ($search) use ($request) {
                $search->where('name', 'like', '%'.$request->search.'%')
                    ->orWhere('sku', 'like', '%'.$request->search.'%');
            });
        }

        $products = $query->orderBy('name')->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $products,
        ]);
    }

    public function store(\App\Http\Requests\ProductStoreRequest $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'category_id' => ['required', 'exists:categories,id'],
            'brand_id' => ['required', 'exists:brands,id'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'base_price' => ['required', 'numeric', 'min:0'],
            'unit' => ['nullable', 'string', 'max:50'],
            'stock_quantity' => ['required', 'integer', 'min:0'],
            'low_stock_threshold' => ['required', 'integer', 'min:0'],
            'status' => ['required', 'in:active,inactive'],
            'image' => ['nullable', 'image', 'max:10240'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $request->except('image');

        if ($request->hasFile('image')) {
            $data['image'] = $request->file('image')->store('product_images', 'public');
        }

        $product = Product::create($data);

        // Audit
        try {
            app(AuditService::class)->record([
                'user_id' => $request->user()->id ?? null,
                'action' => 'create',
                'module' => 'product',
                'record_type' => 'product',
                'record_id' => $product->id,
                'before' => null,
                'after' => $product->toArray(),
                'ip_address' => RequestFacade::ip(),
            ]);
        } catch (\Throwable $e) {
            // swallow audit errors
        }

        return response()->json([
            'success' => true,
            'message' => 'Product created successfully.',
            'data' => $product,
        ], 201);
    }

    public function show(Product $product): JsonResponse
    {
        $product->load(['category', 'brand', 'variants']);

        return response()->json([
            'success' => true,
            'data' => $product,
        ]);
    }

    public function update(\App\Http\Requests\ProductUpdateRequest $request, Product $product): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'category_id' => ['sometimes', 'exists:categories,id'],
            'brand_id' => ['sometimes', 'exists:brands,id'],
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'base_price' => ['sometimes', 'numeric', 'min:0'],
            'unit' => ['nullable', 'string', 'max:50'],
            'stock_quantity' => ['sometimes', 'integer', 'min:0'],
            'low_stock_threshold' => ['sometimes', 'integer', 'min:0'],
            'status' => ['sometimes', 'in:active,inactive'],
            'image' => ['nullable', 'image', 'max:10240'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $request->except('image');

        if ($request->hasFile('image')) {
            Storage::disk('public')->delete($product->image);
            $data['image'] = $request->file('image')->store('product_images', 'public');
        }

        $before = $product->getOriginal();
        $product->update($data);

        try {
            app(AuditService::class)->record([
                'user_id' => $request->user()->id ?? null,
                'action' => 'update',
                'module' => 'product',
                'record_type' => 'product',
                'record_id' => $product->id,
                'before' => $before,
                'after' => $product->toArray(),
                'ip_address' => RequestFacade::ip(),
            ]);
        } catch (\Throwable $e) {
            // swallow
        }

        return response()->json([
            'success' => true,
            'message' => 'Product updated successfully.',
            'data' => $product,
        ]);
    }

    public function destroy(Product $product): JsonResponse
    {
        $before = $product->toArray();
        $product->delete();

        try {
            app(AuditService::class)->record([
                'user_id' => request()->user()->id ?? null,
                'action' => 'delete',
                'module' => 'product',
                'record_type' => 'product',
                'record_id' => $product->id,
                'before' => $before,
                'after' => null,
                'ip_address' => RequestFacade::ip(),
            ]);
        } catch (\Throwable $e) {
        }

        return response()->json([
            'success' => true,
            'message' => 'Product deleted.',
        ]);
    }

    public function restore(int $product): JsonResponse
    {
        $product = Product::withTrashed()->findOrFail($product);
        $product->restore();

        return response()->json([
            'success' => true,
            'message' => 'Product restored.',
            'data' => $product,
        ]);
    }

    public function activate(Product $product): JsonResponse
    {
        $before = $product->getOriginal();
        $product->update(['status' => 'active']);

        try {
            app(AuditService::class)->record([
                'user_id' => request()->user()->id ?? null,
                'action' => 'activate',
                'module' => 'product',
                'record_type' => 'product',
                'record_id' => $product->id,
                'before' => $before,
                'after' => $product->toArray(),
                'ip_address' => RequestFacade::ip(),
            ]);
        } catch (\Throwable $e) {
        }

        return response()->json([
            'success' => true,
            'message' => 'Product activated.',
            'data' => $product,
        ]);
    }

    public function deactivate(Product $product): JsonResponse
    {
        $before = $product->getOriginal();
        $product->update(['status' => 'inactive']);

        try {
            app(AuditService::class)->record([
                'user_id' => request()->user()->id ?? null,
                'action' => 'deactivate',
                'module' => 'product',
                'record_type' => 'product',
                'record_id' => $product->id,
                'before' => $before,
                'after' => $product->toArray(),
                'ip_address' => RequestFacade::ip(),
            ]);
        } catch (\Throwable $e) {
        }

        return response()->json([
            'success' => true,
            'message' => 'Product deactivated.',
            'data' => $product,
        ]);
    }
}
