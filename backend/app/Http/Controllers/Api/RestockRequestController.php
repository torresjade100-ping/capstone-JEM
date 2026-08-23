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
        if ($request->user()->role === 'staff') $query->where('requested_by', $request->user()->id);
        return response()->json(['success' => true, 'data' => $query->paginate(20)]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'product_variant_id' => ['nullable', 'integer', 'exists:product_variants,id'],
            'requested_quantity' => ['required', 'integer', 'min:1'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);
        $data['requested_by'] = $request->user()->id;
        $requestModel = RestockRequest::create($data);
        return response()->json(['success' => true, 'message' => 'Restock request submitted.', 'data' => $requestModel->load('product')], 201);
    }

    public function update(Request $request, RestockRequest $restockRequest): JsonResponse
    {
        $data = $request->validate(['status' => ['required', 'in:pending,approved,rejected,fulfilled'], 'notes' => ['nullable', 'string', 'max:2000']]);
        $restockRequest->update($data);
        return response()->json(['success' => true, 'message' => 'Restock request updated.', 'data' => $restockRequest->fresh()->load('product', 'requester')]);
    }
}
