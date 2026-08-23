<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class BrandController extends Controller
{
    public function index(): JsonResponse
    {
        $brands = Brand::orderBy('name')->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $brands,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'status' => ['required', 'in:active,inactive'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $brand = Brand::create($request->only(['name', 'description', 'status']));

        return response()->json([
            'success' => true,
            'message' => 'Brand created successfully.',
            'data' => $brand,
        ], 201);
    }

    public function show(Brand $brand): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $brand,
        ]);
    }

    public function update(Request $request, Brand $brand): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'status' => ['sometimes', 'in:active,inactive'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $brand->update($request->only(['name', 'description', 'status']));

        return response()->json([
            'success' => true,
            'message' => 'Brand updated successfully.',
            'data' => $brand,
        ]);
    }

    public function destroy(Brand $brand): JsonResponse
    {
        $brand->delete();

        return response()->json([
            'success' => true,
            'message' => 'Brand deleted.',
        ]);
    }

    public function activate(Brand $brand): JsonResponse
    {
        $brand->update(['status' => 'active']);

        return response()->json([
            'success' => true,
            'message' => 'Brand activated.',
            'data' => $brand,
        ]);
    }

    public function deactivate(Brand $brand): JsonResponse
    {
        $brand->update(['status' => 'inactive']);

        return response()->json([
            'success' => true,
            'message' => 'Brand deactivated.',
            'data' => $brand,
        ]);
    }
}
