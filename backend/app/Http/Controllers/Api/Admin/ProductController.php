<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use App\Services\AuditService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Request as RequestFacade;

class ProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Product::with(['category:id,name', 'brand:id,name', 'variants:id,product_id,sku,price,stock_quantity'])
            ->withCount('batches');

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

        if ($request->filled('brand_id')) {
            $query->where('brand_id', $request->brand_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $searchTerm = $request->search;
            $query->where(function ($search) use ($searchTerm) {
                $search->where('name', 'like', '%'.$searchTerm.'%')
                    ->orWhereHas('variants', fn ($v) => $v->where('sku', 'like', '%'.$searchTerm.'%'));
            });
        }

        $perPageInput = $request->input('per_page', 20);
        $perPage = ($perPageInput === 'all' || (int) $perPageInput > 100)
            ? min((int) ($perPageInput === 'all' ? 500 : $perPageInput), 1000)
            : min(max((int) $perPageInput, 1), 100);
        $products = $query->orderBy('name')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $products,
        ]);
    }


    public function store(\App\Http\Requests\ProductStoreRequest $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'category_id' => ['required', Rule::exists('categories', 'id')->where('status', 'active')],
            'brand_id' => ['required', 'exists:brands,id'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'base_price' => ['nullable', 'numeric', 'min:0'],
            'cost_price' => ['nullable', 'numeric', 'min:0'],
            'selling_price' => ['nullable', 'numeric', 'min:0'],
            'unit' => ['nullable', 'string', 'max:50'],
            'stock_quantity' => ['required', 'integer', 'min:0'],
            'low_stock_threshold' => ['required', 'integer', 'min:0'],
            'status' => ['required', 'in:active,inactive'],
            'image' => ['nullable', 'image', 'max:10240'],
            'supplier_id' => ['nullable', 'exists:suppliers,id'],
            'supplier_name' => ['nullable', 'string', 'max:255'],
            'received_date' => ['nullable', 'date'],
            'expiration_date' => ['nullable', 'date'],
        ], [
            'category_id.exists' => 'The selected category is inactive or does not exist. Only active categories can be assigned to new products.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Prevent duplicate products with the same name
        $trimmedName = trim((string) $request->input('name'));
        $existingProduct = Product::whereRaw('LOWER(TRIM(name)) = ?', [strtolower($trimmedName)])->first();
        if ($existingProduct) {
            return response()->json([
                'success' => false,
                'message' => "A product named '{$existingProduct->name}' already exists in your inventory catalog (ID #{$existingProduct->id}). Please select this existing product to add new stock batches instead of creating a duplicate.",
                'errors' => [
                    'name' => ["A product named '{$existingProduct->name}' already exists in the catalog."],
                ],
                'existing_product' => $existingProduct->load(['category', 'brand']),
            ], 422);
        }

        $data = $request->except(['image', 'supplier_id', 'supplier_name', 'received_date', 'expiration_date']);

        // Align base_price and selling_price
        $sellingPrice = (float) ($request->input('selling_price') ?? $request->input('base_price') ?? 0);
        $costPrice = (float) ($request->input('cost_price') ?? round($sellingPrice * 0.70, 2));

        $data['selling_price'] = $sellingPrice;
        $data['base_price'] = $sellingPrice;
        $data['cost_price'] = $costPrice;

        if ($request->hasFile('image')) {
            $data['image'] = $request->file('image')->store('product_images', 'public');
        }

        $product = Product::create($data);

        // Auto-create default variant so product always has at least 1 variant for Mobile & POS
        \App\Models\ProductVariant::create([
            'product_id' => $product->id,
            'sku' => $request->input('sku') ?: ('SKU-' . strtoupper(\Illuminate\Support\Str::random(8))),
            'price' => $sellingPrice,
            'stock_quantity' => (int) $product->stock_quantity,
            'status' => 'active',
        ]);

        // Auto-create initial inventory batch if stock > 0
        $stockQty = (int) $product->stock_quantity;
        if ($stockQty > 0) {
            $supplierName = $request->input('supplier_name');
            if ($request->filled('supplier_id') && ! $supplierName) {
                $sup = \App\Models\Supplier::find($request->input('supplier_id'));
                $supplierName = $sup?->name;
            }

            \App\Models\InventoryBatch::create([
                'product_id' => $product->id,
                'batch_number' => sprintf('BAT-%s-%04d', date('Ymd'), $product->id),
                'supplier_id' => $request->input('supplier_id'),
                'supplier_name' => $supplierName ?: 'Initial Supplier',
                'cost_price' => $costPrice,
                'selling_price' => $sellingPrice,
                'initial_quantity' => $stockQty,
                'quantity' => $stockQty,
                'received_date' => $request->input('received_date', date('Y-m-d')),
                'expiration_date' => $request->input('expiration_date'),
                'status' => 'active',
                'notes' => 'Initial stock batch on product creation',
                'created_by' => $request->user()->id ?? null,
            ]);
        }

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

        $product->load(['category', 'brand', 'batches']);

        return response()->json([
            'success' => true,
            'message' => 'Product created successfully.',
            'data' => $product,
        ], 201);
    }

    public function batchStore(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'category_id' => ['required', Rule::exists('categories', 'id')->where('status', 'active')],
            'products' => ['required', 'array', 'min:1'],
            'products.*.name' => ['required', 'string', 'max:255'],
            'products.*.base_price' => ['nullable', 'numeric', 'min:0'],
            'products.*.selling_price' => ['nullable', 'numeric', 'min:0'],
            'products.*.cost_price' => ['nullable', 'numeric', 'min:0'],
            'products.*.stock_quantity' => ['nullable', 'integer', 'min:0'],
            'products.*.low_stock_threshold' => ['nullable', 'integer', 'min:0'],
            'products.*.unit' => ['nullable', 'string', 'max:50'],
            'products.*.supplier_id' => ['nullable', 'exists:suppliers,id'],
            'products.*.supplier_name' => ['nullable', 'string', 'max:255'],
            'products.*.brand_id' => ['nullable', 'exists:brands,id'],
            'products.*.description' => ['nullable', 'string'],
        ], [
            'category_id.required' => 'Please select a category.',
            'category_id.exists' => 'The selected category is inactive or does not exist.',
            'products.required' => 'At least one product is required.',
            'products.min' => 'At least one product is required.',
            'products.*.name.required' => 'Product name is required for all rows.',
            'products.*.name.string' => 'Product name must be a valid string.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed. Please review the batch entries.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $categoryId = (int) $request->input('category_id');
        $category = \App\Models\Category::find($categoryId);
        if (!$category) {
            return response()->json([
                'success' => false,
                'message' => 'Category not found.',
            ], 404);
        }

        // Get default brand in case brand_id is not specified in row
        $defaultBrandId = \App\Models\Brand::whereRaw('LOWER(name) = ?', ['generic'])->value('id')
            ?? \App\Models\Brand::first()?->id;

        $productsData = $request->input('products');

        // Check for duplicates within the submitted batch itself
        $submittedNames = [];
        foreach ($productsData as $index => $row) {
            $normalizedName = strtolower(trim((string) ($row['name'] ?? '')));
            if (empty($normalizedName)) {
                return response()->json([
                    'success' => false,
                    'message' => "Row #" . ($index + 1) . " has an empty product name.",
                    'errors' => ["products.{$index}.name" => ["Product name cannot be empty."]],
                ], 422);
            }
            if (in_array($normalizedName, $submittedNames, true)) {
                return response()->json([
                    'success' => false,
                    'message' => "Duplicate product name '{$row['name']}' found multiple times in this batch. Each product name must be unique.",
                    'errors' => ["products.{$index}.name" => ["Duplicate product name in batch."]],
                ], 422);
            }
            $submittedNames[] = $normalizedName;
        }

        // Check for existing products in DB with matching names
        $existing = Product::whereIn(DB::raw('LOWER(TRIM(name))'), $submittedNames)->get(['id', 'name']);
        if ($existing->isNotEmpty()) {
            $existingNames = $existing->pluck('name')->implode(', ');
            return response()->json([
                'success' => false,
                'message' => "The following product(s) already exist in your inventory: {$existingNames}. Please use distinct names or restock existing items.",
                'errors' => [
                    'name' => ["Products already exist in catalog: {$existingNames}."],
                ],
            ], 422);
        }

        // Save all products within a database transaction
        $createdProducts = [];
        DB::beginTransaction();
        try {
            foreach ($productsData as $row) {
                $sellingPrice = (float) ($row['selling_price'] ?? $row['base_price'] ?? 0);
                $costPrice = isset($row['cost_price']) && is_numeric($row['cost_price']) && (float) $row['cost_price'] > 0
                    ? (float) $row['cost_price']
                    : (float) round($sellingPrice * 0.70, 2);
                $stockQty = isset($row['stock_quantity']) && is_numeric($row['stock_quantity'])
                    ? max(0, (int) $row['stock_quantity'])
                    : 0;
                $lowStock = isset($row['low_stock_threshold']) && is_numeric($row['low_stock_threshold'])
                    ? max(0, (int) $row['low_stock_threshold'])
                    : 10;
                $unit = !empty(trim($row['unit'] ?? '')) ? trim($row['unit']) : 'piece';
                $brandId = !empty($row['brand_id']) ? (int) $row['brand_id'] : $defaultBrandId;

                $product = Product::create([
                    'category_id' => $categoryId,
                    'brand_id' => $brandId,
                    'name' => trim((string) $row['name']),
                    'description' => trim((string) ($row['description'] ?? "Batch product added under {$category->name}")),
                    'base_price' => $sellingPrice,
                    'selling_price' => $sellingPrice,
                    'cost_price' => $costPrice,
                    'unit' => $unit,
                    'stock_quantity' => $stockQty,
                    'low_stock_threshold' => $lowStock,
                    'status' => 'active',
                ]);

                // Auto-create default variant for batch product
                \App\Models\ProductVariant::create([
                    'product_id' => $product->id,
                    'sku' => !empty($row['sku']) ? trim($row['sku']) : ('SKU-' . strtoupper(\Illuminate\Support\Str::random(8))),
                    'price' => $sellingPrice,
                    'stock_quantity' => $stockQty,
                    'status' => 'active',
                ]);

                // Create initial inventory batch if stock > 0
                if ($stockQty > 0) {
                    $supplierId = !empty($row['supplier_id']) ? (int) $row['supplier_id'] : null;
                    $supplierName = $row['supplier_name'] ?? null;
                    if ($supplierId && !$supplierName) {
                        $sup = \App\Models\Supplier::find($supplierId);
                        $supplierName = $sup?->name;
                    }

                    \App\Models\InventoryBatch::create([
                        'product_id' => $product->id,
                        'batch_number' => sprintf('BAT-%s-%04d', date('Ymd'), $product->id),
                        'supplier_id' => $supplierId,
                        'supplier_name' => $supplierName ?: 'Initial Supplier',
                        'cost_price' => $costPrice,
                        'selling_price' => $sellingPrice,
                        'initial_quantity' => $stockQty,
                        'quantity' => $stockQty,
                        'received_date' => date('Y-m-d'),
                        'status' => 'active',
                        'notes' => 'Batch creation initial stock',
                        'created_by' => $request->user()->id ?? null,
                    ]);
                }

                // Record audit
                try {
                    app(AuditService::class)->record([
                        'user_id' => $request->user()->id ?? null,
                        'action' => 'batch_create',
                        'module' => 'product',
                        'record_type' => 'product',
                        'record_id' => $product->id,
                        'before' => null,
                        'after' => $product->toArray(),
                        'ip_address' => RequestFacade::ip(),
                    ]);
                } catch (\Throwable $e) {
                }

                $product->load(['category', 'brand']);
                $createdProducts[] = $product;
            }

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to save batch products: ' . $e->getMessage(),
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => count($createdProducts) . " products successfully added under '{$category->name}'.",
            'count' => count($createdProducts),
            'data' => $createdProducts,
        ], 201);
    }

    public function show(Product $product): JsonResponse
    {
        $product->load(['category', 'brand', 'variants', 'batches.supplier']);

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
            'cost_price' => ['sometimes', 'numeric', 'min:0'],
            'selling_price' => ['sometimes', 'numeric', 'min:0'],
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

        if ($request->filled('name')) {
            $trimmedName = trim((string) $request->input('name'));
            $duplicate = Product::whereRaw('LOWER(TRIM(name)) = ?', [strtolower($trimmedName)])
                ->where('id', '!=', $product->id)
                ->first();
            if ($duplicate) {
                return response()->json([
                    'success' => false,
                    'message' => "Another product named '{$duplicate->name}' already exists in your inventory catalog.",
                    'errors' => [
                        'name' => ["Another product with this name already exists."],
                    ],
                ], 422);
            }
        }

        if ($request->filled('category_id') && (int) $request->category_id !== (int) $product->category_id) {
            $cat = \App\Models\Category::find($request->category_id);
            if (! $cat || $cat->status !== 'active') {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot reassign product to an inactive category. Please choose an active category or reactivate this category first.',
                    'errors' => [
                        'category_id' => ['The selected category is inactive. Products can only be assigned to active categories.'],
                    ],
                ], 422);
            }
        }

        $data = $request->except('image');

        if ($request->filled('selling_price')) {
            $data['selling_price'] = (float) $request->selling_price;
            $data['base_price'] = (float) $request->selling_price;
        } elseif ($request->filled('base_price')) {
            $data['selling_price'] = (float) $request->base_price;
            $data['base_price'] = (float) $request->base_price;
        }

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

        $product->load(['category', 'brand', 'batches']);

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
