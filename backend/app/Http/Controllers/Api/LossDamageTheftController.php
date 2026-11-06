<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LossDamageTheft;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\StockAdjustment;
use App\Models\User;
use App\Services\AuditService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Throwable;

class LossDamageTheftController extends Controller
{
    protected AuditService $auditService;

    public function __construct(AuditService $auditService)
    {
        $this->auditService = $auditService;
    }

    /**
     * Display a listing of loss, damage, and theft records.
     */
    public function index(Request $request): JsonResponse
    {
        $query = LossDamageTheft::with([
            'product:id,name,unit,cost_price,selling_price,stock_quantity,category_id,brand_id',
            'product.category:id,name',
            'product.brand:id,name',
            'variant:id,product_id,sku,size,color',
            'reporter:id,name,email,role',
            'creator:id,name,email,role',
            'updater:id,name,email,role',
            'stockAdjustment:id,reference_number,quantity_changed,quantity_before,quantity_after',
        ]);

        // Filter by incident type (lost, damaged, stolen)
        if ($request->filled('incident_type') && $request->incident_type !== 'all') {
            $query->where('incident_type', $request->incident_type);
        }

        // Filter by status (pending, investigating, resolved)
        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Filter by product_id
        if ($request->filled('product_id')) {
            $query->where('product_id', $request->product_id);
        }

        // Filter by date range or pre-set period
        if ($request->filled('period')) {
            $period = $request->period;
            $now = Carbon::now();
            if ($period === 'today') {
                $query->whereDate('incident_date', $now->toDateString());
            } elseif ($period === 'this_week') {
                $query->whereBetween('incident_date', [$now->copy()->startOfWeek()->toDateString(), $now->copy()->endOfWeek()->toDateString()]);
            } elseif ($period === 'this_month') {
                $query->whereBetween('incident_date', [$now->copy()->startOfMonth()->toDateString(), $now->copy()->endOfMonth()->toDateString()]);
            }
        } elseif ($request->filled('date_from') && $request->filled('date_to')) {
            $query->whereBetween('incident_date', [$request->date_from, $request->date_to]);
        } elseif ($request->filled('date_from')) {
            $query->whereDate('incident_date', '>=', $request->date_from);
        } elseif ($request->filled('date_to')) {
            $query->whereDate('incident_date', '<=', $request->date_to);
        }

        // Search by product name, SKU, reference number, reported_by, reason, action_taken
        if ($request->filled('search')) {
            $s = trim($request->search);
            $query->where(function ($q) use ($s) {
                $q->where('reference_number', 'like', "%{$s}%")
                    ->orWhere('reported_by', 'like', "%{$s}%")
                    ->orWhere('reason', 'like', "%{$s}%")
                    ->orWhere('action_taken', 'like', "%{$s}%")
                    ->orWhere('sku', 'like', "%{$s}%")
                    ->orWhereHas('product', function ($pq) use ($s) {
                        $pq->where('name', 'like', "%{$s}%");
                    });
            });
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'incident_date');
        $sortDir = strtolower($request->input('sort_direction', 'desc')) === 'asc' ? 'asc' : 'desc';

        if (in_array($sortBy, ['incident_date', 'created_at', 'quantity', 'status', 'incident_type', 'reference_number'])) {
            $query->orderBy($sortBy, $sortDir);
        } else {
            $query->orderBy('incident_date', 'desc')->orderBy('id', 'desc');
        }

        $perPage = min(max((int) $request->input('per_page', 25), 1), 200);
        $records = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $records,
        ]);
    }

    /**
     * Get summary metrics for loss, damage, and theft items.
     */
    public function summary(Request $request): JsonResponse
    {
        $query = LossDamageTheft::with('product:id,cost_price,selling_price');

        // Apply same date filters if requested
        if ($request->filled('date_from') && $request->filled('date_to')) {
            $query->whereBetween('incident_date', [$request->date_from, $request->date_to]);
        }

        $records = $query->get();

        $totalRecords = $records->count();
        $totalQuantity = (int) $records->sum('quantity');

        $byType = [
            'lost' => ['count' => 0, 'quantity' => 0, 'estimated_cost' => 0],
            'damaged' => ['count' => 0, 'quantity' => 0, 'estimated_cost' => 0],
            'stolen' => ['count' => 0, 'quantity' => 0, 'estimated_cost' => 0],
        ];

        $byStatus = [
            'pending' => 0,
            'investigating' => 0,
            'resolved' => 0,
        ];

        $totalEstimatedCost = 0.0;

        foreach ($records as $r) {
            $type = $r->incident_type;
            $qty = (int) $r->quantity;
            $cost = (float) ($r->product?->cost_price ?? 0) * $qty;

            if (isset($byType[$type])) {
                $byType[$type]['count']++;
                $byType[$type]['quantity'] += $qty;
                $byType[$type]['estimated_cost'] += $cost;
            }

            if (isset($byStatus[$r->status])) {
                $byStatus[$r->status]++;
            }

            $totalEstimatedCost += $cost;
        }

        return response()->json([
            'success' => true,
            'data' => [
                'total_incidents' => $totalRecords,
                'total_quantity_affected' => $totalQuantity,
                'total_estimated_loss' => round($totalEstimatedCost, 2),
                'by_type' => [
                    'lost' => [
                        'count' => $byType['lost']['count'],
                        'quantity' => $byType['lost']['quantity'],
                        'estimated_cost' => round($byType['lost']['estimated_cost'], 2),
                    ],
                    'damaged' => [
                        'count' => $byType['damaged']['count'],
                        'quantity' => $byType['damaged']['quantity'],
                        'estimated_cost' => round($byType['damaged']['estimated_cost'], 2),
                    ],
                    'stolen' => [
                        'count' => $byType['stolen']['count'],
                        'quantity' => $byType['stolen']['quantity'],
                        'estimated_cost' => round($byType['stolen']['estimated_cost'], 2),
                    ],
                ],
                'by_status' => $byStatus,
            ],
        ]);
    }

    /**
     * Store a newly created incident record in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'product_variant_id' => ['nullable', 'integer', 'exists:product_variants,id'],
            'sku' => ['nullable', 'string', 'max:100'],
            'incident_type' => ['required', 'in:lost,damaged,stolen'],
            'quantity' => ['required', 'integer', 'min:1'],
            'incident_date' => ['required', 'date'],
            'reported_by' => ['nullable', 'string', 'max:150'],
            'reason' => ['required', 'string', 'max:2000'],
            'status' => ['nullable', 'in:pending,investigating,resolved'],
            'action_taken' => ['nullable', 'string', 'max:2000'],
            'confirm_stock_deduction' => ['nullable', 'boolean'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = Auth::user() ?? User::where('role', 'admin')->first() ?? User::first();
        $productId = (int) $request->product_id;
        $variantId = $request->product_variant_id ? (int) $request->product_variant_id : null;
        $quantity = (int) $request->quantity;
        $incidentType = $request->incident_type;
        $status = $request->input('status', 'pending');
        $incidentDate = Carbon::parse($request->incident_date)->toDateString();
        $reportedBy = trim($request->input('reported_by') ?: ($user ? $user->name : 'Staff Member'));

        // Prevent duplicate submissions within last 3 minutes
        $duplicate = LossDamageTheft::where('product_id', $productId)
            ->where('incident_type', $incidentType)
            ->where('quantity', $quantity)
            ->whereDate('incident_date', $incidentDate)
            ->where('created_at', '>=', now()->subMinutes(3))
            ->first();

        if ($duplicate) {
            return response()->json([
                'success' => false,
                'message' => "A duplicate {$incidentType} incident for this product with quantity {$quantity} was already submitted recently (Ref: {$duplicate->reference_number}).",
            ], 422);
        }

        // Determine if stock deduction is confirmed
        $shouldDeductStock = (bool) $request->input('confirm_stock_deduction', false) || ($status === 'resolved');

        try {
            $record = DB::transaction(function () use (
                $user, $productId, $variantId, $quantity, $incidentType,
                $incidentDate, $reportedBy, $status, $shouldDeductStock, $request
            ) {
                $product = Product::lockForUpdate()->findOrFail($productId);
                $sku = $request->sku;

                if (empty($sku)) {
                    if ($variantId) {
                        $variant = ProductVariant::find($variantId);
                        $sku = $variant?->sku;
                    }
                    if (empty($sku)) {
                        $sku = 'PRD-' . str_pad((string) $productId, 4, '0', STR_PAD_LEFT);
                    }
                }

                $stockAdjusted = false;
                $stockAdjustmentId = null;

                if ($shouldDeductStock) {
                    // Validate available stock
                    if ($product->stock_quantity < $quantity) {
                        throw new \Exception("Insufficient available inventory stock ({$product->stock_quantity} available) to confirm deduction of {$quantity} units.");
                    }

                    if ($variantId) {
                        $variant = ProductVariant::lockForUpdate()->findOrFail($variantId);
                        if ($variant->stock_quantity < $quantity) {
                            throw new \Exception("Insufficient stock in variant ({$variant->stock_quantity} available).");
                        }
                        $variantBefore = $variant->stock_quantity;
                        $variant->stock_quantity = max(0, $variantBefore - $quantity);
                        $variant->save();
                    }

                    $productBefore = $product->stock_quantity;
                    $product->stock_quantity = max(0, $productBefore - $quantity);
                    $product->save();

                    // Generate reference number
                    $datePart = now()->format('Ymd');
                    $randomPart = strtoupper(substr(uniqid(), -4));
                    $refNumber = "LDT-{$datePart}-{$randomPart}";

                    // Create permanent stock adjustment record
                    $adj = StockAdjustment::create([
                        'product_id' => $productId,
                        'product_variant_id' => $variantId,
                        'user_id' => $user?->id,
                        'adjustment_type' => $incidentType, // lost, damaged, stolen
                        'quantity_before' => $productBefore,
                        'quantity_changed' => -$quantity,
                        'quantity_after' => $product->stock_quantity,
                        'reference_number' => $refNumber,
                        'reason' => ucfirst($incidentType) . " Incident: " . $request->reason,
                        'notes' => "Reported by: {$reportedBy}" . ($request->action_taken ? " | Action: " . $request->action_taken : ''),
                    ]);

                    $stockAdjusted = true;
                    $stockAdjustmentId = $adj->id;
                }

                $created = LossDamageTheft::create([
                    'product_id' => $productId,
                    'product_variant_id' => $variantId,
                    'sku' => $sku,
                    'incident_type' => $incidentType,
                    'quantity' => $quantity,
                    'incident_date' => $incidentDate,
                    'reported_by' => $reportedBy,
                    'reported_by_id' => $user?->id,
                    'reason' => $request->reason,
                    'status' => $status,
                    'action_taken' => $request->action_taken,
                    'stock_adjusted' => $stockAdjusted,
                    'stock_adjustment_id' => $stockAdjustmentId,
                    'created_by' => $user?->id,
                    'updated_by' => $user?->id,
                    'notes' => $request->notes,
                ]);

                // Audit log
                try {
                    $this->auditService->record([
                        'user_id' => $user?->id,
                        'action' => 'loss_damage_theft_created',
                        'module' => 'inventory',
                        'record_type' => 'loss_damage_theft',
                        'record_id' => $created->id,
                        'reason' => "Created {$incidentType} incident for {$product->name} (Qty: {$quantity})",
                        'details' => [
                            'reference_number' => $created->reference_number,
                            'incident_type' => $incidentType,
                            'quantity' => $quantity,
                            'status' => $status,
                            'stock_adjusted' => $stockAdjusted,
                        ],
                    ]);
                } catch (Throwable $e) {
                    // Non-blocking
                }

                return $created;
            });

            $record->load([
                'product:id,name,unit,cost_price,selling_price,stock_quantity',
                'variant',
                'reporter:id,name,email',
                'creator:id,name,email',
                'stockAdjustment',
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Incident record saved successfully.' . ($record->stock_adjusted ? ' Stock has been updated.' : ''),
                'data' => $record,
            ], 201);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Display the specified incident record.
     */
    public function show($id): JsonResponse
    {
        $record = LossDamageTheft::with([
            'product:id,name,unit,cost_price,selling_price,stock_quantity,category_id,brand_id',
            'product.category:id,name',
            'product.brand:id,name',
            'variant',
            'reporter:id,name,email,role',
            'creator:id,name,email,role',
            'updater:id,name,email,role',
            'stockAdjustment',
        ])->find($id);

        if (!$record) {
            return response()->json([
                'success' => false,
                'message' => 'Record not found.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $record,
        ]);
    }

    /**
     * Update the specified incident record in storage.
     */
    public function update(Request $request, $id): JsonResponse
    {
        $record = LossDamageTheft::findOrFail($id);
        $user = Auth::user() ?? User::where('role', 'admin')->first() ?? User::first();

        // Role authorization check: Admin only for editing sensitive fields
        if ($user && !in_array($user->role, ['admin', 'manager'])) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Only administrators can edit loss, damage, and theft records.',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'quantity' => ['nullable', 'integer', 'min:1'],
            'incident_type' => ['nullable', 'in:lost,damaged,stolen'],
            'incident_date' => ['nullable', 'date'],
            'reported_by' => ['nullable', 'string', 'max:150'],
            'reason' => ['nullable', 'string', 'max:2000'],
            'status' => ['nullable', 'in:pending,investigating,resolved'],
            'action_taken' => ['nullable', 'string', 'max:2000'],
            'confirm_stock_deduction' => ['nullable', 'boolean'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            DB::transaction(function () use ($record, $request, $user) {
                $oldQuantity = (int) $record->quantity;
                $newQuantity = $request->filled('quantity') ? (int) $request->quantity : $oldQuantity;
                $oldStatus = $record->status;
                $newStatus = $request->input('status', $oldStatus);
                $wasStockAdjusted = $record->stock_adjusted;

                $shouldDeductNow = (!$wasStockAdjusted) && (
                    (bool) $request->input('confirm_stock_deduction', false) ||
                    ($newStatus === 'resolved')
                );

                $product = Product::lockForUpdate()->findOrFail($record->product_id);

                if ($shouldDeductNow) {
                    // Deduct for the first time
                    if ($product->stock_quantity < $newQuantity) {
                        throw new \Exception("Insufficient stock ({$product->stock_quantity} available) to confirm deduction of {$newQuantity} units.");
                    }

                    $before = $product->stock_quantity;
                    $product->stock_quantity = max(0, $before - $newQuantity);
                    $product->save();

                    $adj = StockAdjustment::create([
                        'product_id' => $record->product_id,
                        'product_variant_id' => $record->product_variant_id,
                        'user_id' => $user?->id,
                        'adjustment_type' => $request->input('incident_type', $record->incident_type),
                        'quantity_before' => $before,
                        'quantity_changed' => -$newQuantity,
                        'quantity_after' => $product->stock_quantity,
                        'reference_number' => $record->reference_number,
                        'reason' => ucfirst($record->incident_type) . " Confirmed: " . ($request->reason ?? $record->reason),
                        'notes' => "Action taken: " . ($request->action_taken ?? $record->action_taken),
                    ]);

                    $record->stock_adjusted = true;
                    $record->stock_adjustment_id = $adj->id;
                } elseif ($wasStockAdjusted && $newQuantity !== $oldQuantity) {
                    // Quantity was modified on already deducted incident
                    $delta = $newQuantity - $oldQuantity; // positive = deduct more, negative = return stock
                    if ($delta > 0 && $product->stock_quantity < $delta) {
                        throw new \Exception("Insufficient stock ({$product->stock_quantity} available) for the quantity increase of {$delta} units.");
                    }

                    $before = $product->stock_quantity;
                    $product->stock_quantity = max(0, $before - $delta);
                    $product->save();

                    StockAdjustment::create([
                        'product_id' => $record->product_id,
                        'product_variant_id' => $record->product_variant_id,
                        'user_id' => $user?->id,
                        'adjustment_type' => $record->incident_type,
                        'quantity_before' => $before,
                        'quantity_changed' => -$delta,
                        'quantity_after' => $product->stock_quantity,
                        'reference_number' => $record->reference_number . "-REV",
                        'reason' => "Adjustment updated for {$record->reference_number}: qty changed from {$oldQuantity} to {$newQuantity}",
                    ]);
                }

                // Update fields
                if ($request->filled('quantity')) $record->quantity = $newQuantity;
                if ($request->filled('incident_type')) $record->incident_type = $request->incident_type;
                if ($request->filled('incident_date')) $record->incident_date = Carbon::parse($request->incident_date)->toDateString();
                if ($request->filled('reported_by')) $record->reported_by = trim($request->reported_by);
                if ($request->filled('reason')) $record->reason = $request->reason;
                if ($request->filled('status')) $record->status = $newStatus;
                if ($request->has('action_taken')) $record->action_taken = $request->action_taken;
                if ($request->has('notes')) $record->notes = $request->notes;

                $record->updated_by = $user?->id;
                $record->save();

                // Audit log
                try {
                    $this->auditService->record([
                        'user_id' => $user?->id,
                        'action' => 'loss_damage_theft_updated',
                        'module' => 'inventory',
                        'record_type' => 'loss_damage_theft',
                        'record_id' => $record->id,
                        'reason' => "Updated incident record {$record->reference_number}",
                        'details' => [
                            'reference_number' => $record->reference_number,
                            'status_before' => $oldStatus,
                            'status_after' => $newStatus,
                            'stock_adjusted' => $record->stock_adjusted,
                        ],
                    ]);
                } catch (Throwable $e) {}
            });

            $record->load([
                'product:id,name,unit,cost_price,selling_price,stock_quantity',
                'variant',
                'reporter:id,name,email',
                'creator:id,name,email',
                'updater:id,name,email',
                'stockAdjustment',
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Incident record updated successfully.' . ($record->stock_adjusted ? ' Stock reflects updated quantity.' : ''),
                'data' => $record,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Update incident status (e.g., Pending -> Investigating -> Resolved).
     */
    public function updateStatus(Request $request, $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'status' => ['required', 'in:pending,investigating,resolved'],
            'action_taken' => ['nullable', 'string', 'max:2000'],
            'confirm_stock_deduction' => ['nullable', 'boolean'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $record = LossDamageTheft::findOrFail($id);
        $user = Auth::user() ?? User::where('role', 'admin')->first() ?? User::first();

        // Staff can advance status to investigating or report details; resolving requires admin or staff
        $newStatus = $request->status;
        $shouldDeduct = (!$record->stock_adjusted) && (
            (bool) $request->input('confirm_stock_deduction', false) ||
            ($newStatus === 'resolved')
        );

        try {
            DB::transaction(function () use ($record, $newStatus, $shouldDeduct, $request, $user) {
                if ($shouldDeduct) {
                    $product = Product::lockForUpdate()->findOrFail($record->product_id);
                    $qty = (int) $record->quantity;

                    if ($product->stock_quantity < $qty) {
                        throw new \Exception("Cannot resolve incident: insufficient stock ({$product->stock_quantity} available) to deduct {$qty} units.");
                    }

                    $before = $product->stock_quantity;
                    $product->stock_quantity = max(0, $before - $qty);
                    $product->save();

                    $adj = StockAdjustment::create([
                        'product_id' => $record->product_id,
                        'product_variant_id' => $record->product_variant_id,
                        'user_id' => $user?->id,
                        'adjustment_type' => $record->incident_type,
                        'quantity_before' => $before,
                        'quantity_changed' => -$qty,
                        'quantity_after' => $product->stock_quantity,
                        'reference_number' => $record->reference_number,
                        'reason' => ucfirst($record->incident_type) . " Incident Resolved: " . $record->reason,
                        'notes' => "Action taken: " . ($request->action_taken ?: ($record->action_taken ?: 'Incident resolved and inventory adjusted.')),
                    ]);

                    $record->stock_adjusted = true;
                    $record->stock_adjustment_id = $adj->id;
                }

                $record->status = $newStatus;
                if ($request->filled('action_taken')) {
                    $record->action_taken = $request->action_taken;
                }
                $record->updated_by = $user?->id;
                $record->save();

                try {
                    $this->auditService->record([
                        'user_id' => $user?->id,
                        'action' => 'loss_damage_theft_status_updated',
                        'module' => 'inventory',
                        'record_type' => 'loss_damage_theft',
                        'record_id' => $record->id,
                        'reason' => "Status changed to {$newStatus} for {$record->reference_number}",
                        'details' => [
                            'new_status' => $newStatus,
                            'stock_adjusted' => $record->stock_adjusted,
                        ],
                    ]);
                } catch (Throwable $e) {}
            });

            $record->load([
                'product:id,name,unit,cost_price,selling_price,stock_quantity',
                'reporter:id,name,email',
                'updater:id,name,email',
                'stockAdjustment',
            ]);

            return response()->json([
                'success' => true,
                'message' => "Incident status updated to '{$newStatus}'." . ($record->stock_adjusted ? ' Stock deducted.' : ''),
                'data' => $record,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Remove or cancel the specified record.
     */
    public function destroy(Request $request, $id): JsonResponse
    {
        $user = Auth::user() ?? User::where('role', 'admin')->first() ?? User::first();
        if ($user && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Only administrators can delete or cancel incident records.',
            ], 403);
        }

        $record = LossDamageTheft::findOrFail($id);

        try {
            DB::transaction(function () use ($record, $request, $user) {
                // If stock was adjusted, revert stock back if requested (default true)
                $revertStock = $request->boolean('revert_stock', true);
                if ($record->stock_adjusted && $revertStock) {
                    $product = Product::lockForUpdate()->find($record->product_id);
                    if ($product) {
                        $qty = (int) $record->quantity;
                        $before = $product->stock_quantity;
                        $product->stock_quantity = $before + $qty;
                        $product->save();

                        StockAdjustment::create([
                            'product_id' => $record->product_id,
                            'product_variant_id' => $record->product_variant_id,
                            'user_id' => $user?->id,
                            'adjustment_type' => 'adjustment',
                            'quantity_before' => $before,
                            'quantity_changed' => $qty,
                            'quantity_after' => $product->stock_quantity,
                            'reference_number' => $record->reference_number . "-VOID",
                            'reason' => "Incident {$record->reference_number} cancelled/deleted, reverting {$qty} units back to inventory.",
                        ]);
                    }
                }

                $record->updated_by = $user?->id;
                $record->save();
                $record->delete();

                try {
                    $this->auditService->record([
                        'user_id' => $user?->id,
                        'action' => 'loss_damage_theft_deleted',
                        'module' => 'inventory',
                        'record_type' => 'loss_damage_theft',
                        'record_id' => $record->id,
                        'reason' => "Incident record {$record->reference_number} cancelled",
                    ]);
                } catch (Throwable $e) {}
            });

            return response()->json([
                'success' => true,
                'message' => 'Incident record successfully archived/cancelled.',
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }
}
