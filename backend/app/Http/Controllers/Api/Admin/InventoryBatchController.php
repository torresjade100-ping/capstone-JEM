<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\InventoryBatch;
use App\Models\Product;
use App\Models\StockAdjustment;
use App\Models\Supplier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class InventoryBatchController extends Controller
{
    /**
     * Get all current and previous inventory batches for a product.
     */
    public function index(Request $request, int $productId): JsonResponse
    {
        $product = Product::with(['category:id,name', 'brand:id,name'])->findOrFail($productId);

        $batches = InventoryBatch::with(['supplier:id,name,phone,email,contact_person', 'creator:id,name'])
            ->where('product_id', $productId)
            ->orderBy('received_date', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        $activeBatches = $batches->filter(fn ($b) => $b->status === 'active' && $b->quantity > 0)->values();
        $previousBatches = $batches->filter(fn ($b) => $b->status !== 'active' || $b->quantity <= 0)->values();

        // Summary calculations
        $totalQuantityInBatches = $batches->sum('quantity');
        $nearestExpiry = $activeBatches->whereNotNull('expiration_date')->sortBy('expiration_date')->first();

        return response()->json([
            'success' => true,
            'data' => [
                'product' => [
                    'id' => $product->id,
                    'name' => $product->name,
                    'unit' => $product->unit ?? 'piece',
                    'stock_quantity' => (int) $product->stock_quantity,
                    'low_stock_threshold' => (int) $product->low_stock_threshold,
                    'cost_price' => (float) $product->cost_price,
                    'selling_price' => (float) $product->selling_price,
                    'base_price' => (float) $product->base_price,
                    'category' => $product->category?->name,
                    'brand' => $product->brand?->name,
                ],
                'summary' => [
                    'total_batches' => $batches->count(),
                    'active_batches_count' => $activeBatches->count(),
                    'previous_batches_count' => $previousBatches->count(),
                    'total_batch_stock' => (int) $totalQuantityInBatches,
                    'nearest_expiration_date' => $nearestExpiry?->expiration_date ? $nearestExpiry->expiration_date->format('Y-m-d') : null,
                ],
                'batches' => $batches,
                'active_batches' => $activeBatches,
                'previous_batches' => $previousBatches,
            ],
        ]);
    }

    /**
     * Add a new inventory batch (restock) for a product.
     */
    public function store(Request $request, ?int $productId = null): JsonResponse
    {
        $targetProductId = $productId ?? $request->input('product_id');

        $validator = Validator::make(array_merge($request->all(), ['product_id' => $targetProductId]), [
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'cost_price' => ['nullable', 'numeric', 'min:0'],
            'selling_price' => ['nullable', 'numeric', 'min:0'],
            'quantity' => ['required', 'integer', 'min:1'],
            'supplier_id' => ['nullable', 'integer', 'exists:suppliers,id'],
            'supplier_name' => ['nullable', 'string', 'max:255'],
            'received_date' => ['nullable', 'date'],
            'expiration_date' => ['nullable', 'date', 'after_or_equal:received_date'],
            'batch_number' => ['nullable', 'string', 'max:100'],
            'reference_number' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        return DB::transaction(function () use ($request, $targetProductId) {
            $product = Product::lockForUpdate()->findOrFail($targetProductId);

            // Supplier resolution
            $supplierId = $request->input('supplier_id');
            $supplierName = $request->input('supplier_name');
            if ($supplierId && ! $supplierName) {
                $sup = Supplier::find($supplierId);
                $supplierName = $sup?->name;
            }

            // Reference number and batch number resolution
            $refNumber = trim((string) ($request->input('reference_number') ?? $request->input('purchase_order') ?? ''));
            $batchNumber = trim((string) $request->input('batch_number'));
            if (! $batchNumber) {
                $batchNumber = $refNumber ?: sprintf('BAT-%s-%04d-%03d', date('Ymd'), $product->id, rand(100, 999));
            }

            $qtyReceived = (int) $request->input('quantity');
            $costPrice = $request->filled('cost_price') ? (float) $request->input('cost_price') : (float) ($product->cost_price ?? 0);
            $sellingPrice = $request->filled('selling_price') ? (float) $request->input('selling_price') : (float) ($product->selling_price ?? $product->base_price ?? 0);
            $receivedDate = $request->input('received_date', date('Y-m-d'));
            $expirationDate = $request->input('expiration_date');
            $userId = Auth::id() ?? 1;

            // 1. Create the new batch record (never overwriting old ones)
            $batch = InventoryBatch::create([
                'product_id' => $product->id,
                'batch_number' => $batchNumber,
                'supplier_id' => $supplierId ?: null,
                'supplier_name' => $supplierName ?: 'Supplier Restock',
                'cost_price' => $costPrice,
                'selling_price' => $sellingPrice,
                'initial_quantity' => $qtyReceived,
                'quantity' => $qtyReceived,
                'received_date' => $receivedDate ?: date('Y-m-d'),
                'expiration_date' => $expirationDate ?: null,
                'status' => 'active',
                'notes' => $request->input('notes'),
                'created_by' => $userId,
            ]);

            // 2. Update the product's overall stock & latest pricing
            $qtyBefore = (int) $product->stock_quantity;
            $qtyAfter = $qtyBefore + $qtyReceived;

            $product->stock_quantity = $qtyAfter;
            if ($request->filled('cost_price')) {
                $product->cost_price = $costPrice;
            }
            if ($request->filled('selling_price')) {
                $product->selling_price = $sellingPrice;
                $product->base_price = $sellingPrice;
            }
            $product->save();

            // 3. Log stock adjustment audit trail
            try {
                StockAdjustment::create([
                    'product_id' => $product->id,
                    'product_variant_id' => null,
                    'user_id' => $userId,
                    'supplier_id' => $supplierId ?: null,
                    'adjustment_type' => 'restock',
                    'quantity_before' => $qtyBefore,
                    'quantity_changed' => $qtyReceived,
                    'quantity_after' => $qtyAfter,
                    'reference_number' => $refNumber ?: $batchNumber,
                    'reason' => "Restock delivery from " . ($supplierName ?: 'Supplier') . ($refNumber ? " (Ref/PO: {$refNumber})" : ""),
                    'notes' => $request->input('notes'),
                ]);
            } catch (\Throwable $e) {
                // non-blocking
            }

            // 4. Auto-allocate received batch stock to waiting backorders (FIFO)
            try {
                app(\App\Services\BackorderService::class)->allocateStock(
                    $product->id,
                    null,
                    $qtyReceived,
                    Auth::user()
                );
            } catch (\Throwable $boErr) {
                // non-blocking
            }

            $batch->load(['supplier', 'creator']);

            return response()->json([
                'success' => true,
                'message' => "New inventory batch #{$batchNumber} received successfully.",
                'data' => [
                    'batch' => $batch,
                    'product' => $product->fresh(['category', 'brand']),
                ],
            ], 201);
        });
    }
}
