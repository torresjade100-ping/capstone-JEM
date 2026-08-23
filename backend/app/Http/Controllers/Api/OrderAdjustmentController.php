<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OrderAdjustment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrderAdjustmentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = OrderAdjustment::with(['order.customer.user', 'product', 'requester'])->latest();
        if ($request->user()->role === 'staff') $query->where('requested_by', $request->user()->id);
        return response()->json(['success' => true, 'data' => $query->paginate(20)]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'order_id' => ['required', 'integer', 'exists:orders,id'],
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'original_quantity' => ['required', 'integer', 'min:1'],
            'requested_quantity' => ['required', 'integer', 'min:1'],
            'reason' => ['required', 'string', 'max:2000'],
        ]);
        $data['requested_by'] = $request->user()->id;
        $adjustment = OrderAdjustment::create($data);
        return response()->json(['success' => true, 'message' => 'Order adjustment submitted.', 'data' => $adjustment->load('product', 'order')], 201);
    }

    public function show(Request $request, OrderAdjustment $orderAdjustment): JsonResponse
    {
        abort_if($request->user()->role === 'staff' && $orderAdjustment->requested_by !== $request->user()->id, 403);
        return response()->json(['success' => true, 'data' => $orderAdjustment->load(['order.customer.user', 'product', 'requester'])]);
    }

    public function review(Request $request, OrderAdjustment $orderAdjustment): JsonResponse
    {
        $data = $request->validate(['status' => ['required', 'in:approved,rejected']]);
        $orderAdjustment->update(['status' => $data['status'], 'reviewed_by' => $request->user()->id, 'reviewed_at' => now()]);
        return response()->json(['success' => true, 'message' => "Adjustment {$data['status']}.", 'data' => $orderAdjustment->fresh()]);
    }
}
