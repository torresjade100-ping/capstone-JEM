<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RestockRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RestockRequestController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = RestockRequest::with(['product', 'requester', 'variant'])->latest();
        if ($request->user()->role === 'staff') {
            $query->where('requested_by', $request->user()->id);
        }
        $perPage = min(max((int) $request->input('per_page', 100), 1), 500);
        return response()->json(['success' => true, 'data' => $query->paginate($perPage)]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'product_variant_id' => ['nullable', 'integer', 'exists:product_variants,id'],
            'requested_quantity' => ['required', 'integer', 'min:1'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $userId = $request->user()->id;
        $data['requested_by'] = $userId;

        // Idempotency & Duplicate Protection: Check if the exact same pending request was submitted within the last 15 seconds
        $existingRecent = RestockRequest::where('requested_by', $userId)
            ->where('product_id', $data['product_id'])
            ->where('requested_quantity', $data['requested_quantity'])
            ->where(function ($q) {
                $q->where('status', 'pending')->orWhereNull('status');
            })
            ->where('created_at', '>=', now()->subSeconds(15))
            ->first();

        if ($existingRecent) {
            $existingRecent->load(['product', 'requester']);
            return response()->json([
                'success' => true,
                'message' => 'Stock request already received.',
                'data' => $existingRecent,
                'is_duplicate' => true
            ], 200);
        }

        $requestModel = RestockRequest::create($data);
        $requestModel->load(['product', 'requester']);

        // Dispatch Notification to all Admin accounts (avoid duplicate notification for this request)
        $admins = \App\Models\User::where('role', 'admin')->get();
        $productName = $requestModel->product?->name ?? 'Product';
        $staffName = $request->user()->name ?? 'Staff';
        foreach ($admins as $admin) {
            $alreadyNotified = \App\Models\Notification::where('user_id', $admin->id)
                ->where('type', 'stock_request')
                ->where('data->request_id', $requestModel->id)
                ->exists();

            if (!$alreadyNotified) {
                \App\Models\Notification::create([
                    'user_id' => $admin->id,
                    'title' => 'New Stock Request',
                    'message' => "{$staffName} submitted a stock request for {$productName} (Qty: {$requestModel->requested_quantity}).",
                    'type' => 'stock_request',
                    'data' => [
                        'request_id' => $requestModel->id,
                        'product_id' => $requestModel->product_id,
                        'product_name' => $productName,
                        'quantity' => $requestModel->requested_quantity,
                        'staff_name' => $staffName,
                    ],
                    'channel' => 'database',
                    'read' => false,
                ]);
            }
        }

        return response()->json(['success' => true, 'message' => 'Stock request submitted successfully.', 'data' => $requestModel], 201);
    }

    public function update(Request $request, RestockRequest $restockRequest): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'in:pending,confirmed,approved,rejected,fulfilled'],
            'notes' => ['nullable', 'string', 'max:2000']
        ]);

        $previousStatus = $restockRequest->status;
        $restockRequest->update($data);
        $restockRequest->load(['product', 'requester']);

        $isNowApproved = in_array($restockRequest->status, ['confirmed', 'approved', 'fulfilled']);
        $wasPending = in_array($previousStatus, ['pending', null, '']);

        // Only update inventory stock when transitioning from pending to confirmed/approved
        if ($isNowApproved && $wasPending && $restockRequest->product_id) {
            $product = \App\Models\Product::find($restockRequest->product_id);
            if ($product) {
                $qtyBefore = (int) ($product->stock_quantity ?? 0);
                $qtyRequested = (int) ($restockRequest->requested_quantity ?? $restockRequest->quantity_requested ?? 0);
                $qtyAfter = $qtyBefore + $qtyRequested;

                // Update actual product stock
                $product->stock_quantity = $qtyAfter;
                $product->save();

                // If variant exists, update variant stock
                if ($restockRequest->product_variant_id) {
                    $variant = \App\Models\ProductVariant::find($restockRequest->product_variant_id);
                    if ($variant) {
                        $variant->increment('stock_quantity', $qtyRequested);
                    }
                }

                // Log Stock Adjustment Audit Trail
                try {
                    \App\Models\StockAdjustment::create([
                        'product_id' => $product->id,
                        'product_variant_id' => $restockRequest->product_variant_id,
                        'user_id' => $request->user()->id,
                        'adjustment_type' => 'add',
                        'quantity_before' => $qtyBefore,
                        'quantity_changed' => $qtyRequested,
                        'quantity_after' => $qtyAfter,
                        'reason' => "Stock request #{$restockRequest->id} confirmed & approved by " . $request->user()->name,
                    ]);
                } catch (\Throwable $e) {
                    // ignore if table structure differs
                }
            }
        }

        // Dispatch Notification back to the requesting Staff member (avoid duplicates)
        if ($restockRequest->requested_by) {
            $statusLabel = ucfirst($restockRequest->status);
            $productName = $restockRequest->product?->name ?? 'Product';
            $qty = $restockRequest->requested_quantity ?? $restockRequest->quantity_requested ?? 0;
            $notifTitle = $isNowApproved ? 'Stock Request Confirmed' : "Stock Request {$statusLabel}";
            $notifMessage = $isNowApproved
                ? "Your stock request for {$productName} ({$qty} units) has been confirmed and added to inventory stock."
                : "Your stock request for {$productName} ({$qty} units) has been {$restockRequest->status} by Admin.";

            $notifType = $isNowApproved ? 'stock_request_confirmed' : 'stock_request_update';
            $alreadyNotifiedStaff = \App\Models\Notification::where('user_id', $restockRequest->requested_by)
                ->where('type', $notifType)
                ->where('data->request_id', $restockRequest->id)
                ->where('data->status', $restockRequest->status)
                ->exists();

            if (!$alreadyNotifiedStaff) {
                \App\Models\Notification::create([
                    'user_id' => $restockRequest->requested_by,
                    'title' => $notifTitle,
                    'message' => $notifMessage,
                    'type' => $notifType,
                    'data' => [
                        'request_id' => $restockRequest->id,
                        'status' => $restockRequest->status,
                        'product_name' => $productName,
                        'quantity' => $qty,
                        'notes' => $restockRequest->notes,
                    ],
                    'channel' => 'database',
                    'read' => false,
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Stock request updated and inventory stock adjusted accordingly.',
            'data' => $restockRequest->fresh()->load('product', 'requester')
        ]);
    }


}
