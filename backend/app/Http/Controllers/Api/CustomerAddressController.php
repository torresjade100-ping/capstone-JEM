<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\CustomerAddress;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CustomerAddressController extends Controller
{
    protected function resolveCustomer(Request $request): ?Customer
    {
        if (Auth::check() && Auth::user()->customer) {
            return Auth::user()->customer;
        }

        if ($request->filled('customer_email')) {
            $user = User::where('email', $request->customer_email)->first();
            if ($user && $user->customer) {
                return $user->customer;
            }
        }

        if ($request->filled('customer_id')) {
            return Customer::find($request->customer_id);
        }

        $customer = Customer::first();
        if (!$customer) {
            $user = User::firstOrCreate(
                ['email' => 'customer@jemlumber.com'],
                [
                    'name' => 'Juan Dela Cruz',
                    'phone' => '+639191234567',
                    'password' => \Illuminate\Support\Facades\Hash::make('Password123!'),
                    'role' => 'customer',
                    'status' => 'active',
                ]
            );
            $customer = Customer::firstOrCreate(['user_id' => $user->id]);
        }

        return $customer;
    }

    public function index(Request $request): JsonResponse
    {
        $customer = $this->resolveCustomer($request);
        if (!$customer) {
            return response()->json(['success' => true, 'data' => []]);
        }

        $addresses = CustomerAddress::where('customer_id', $customer->id)->orderBy('is_default', 'desc')->latest()->get();

        // Seed default addresses if none exist yet
        if ($addresses->isEmpty()) {
            $addr1 = CustomerAddress::create([
                'customer_id' => $customer->id,
                'tag' => 'Primary Job Site',
                'address' => $customer->address_line1 ? "{$customer->address_line1}, {$customer->city}, {$customer->province}" : 'Block 12 Lot 8, Villa San Isidro, Santa Rosa, Laguna',
                'contact_name' => $customer->user?->name ?: 'Kuya Juan / Site Foreman',
                'contact_phone' => $customer->user?->phone ?: '0917-123-4567',
                'notes' => 'Access via Gate 2 for heavy delivery trucks',
                'is_default' => true,
            ]);

            $addr2 = CustomerAddress::create([
                'customer_id' => $customer->id,
                'tag' => 'Secondary Project Site',
                'address' => 'Lot 4 Phase 3, Greenbreeze Subdivision, Biñan, Laguna',
                'contact_name' => 'Engr. Ramos',
                'contact_phone' => '0918-555-6789',
                'notes' => 'Unloading area ready near structural framing',
                'is_default' => false,
            ]);

            $addresses = collect([$addr1, $addr2]);
        }

        return response()->json(['success' => true, 'data' => $addresses]);
    }

    public function store(Request $request): JsonResponse
    {
        $customer = $this->resolveCustomer($request);
        if (!$customer) {
            return response()->json(['success' => false, 'message' => 'Customer profile not found.'], 404);
        }

        $data = $request->validate([
            'tag' => 'required|string|max:100',
            'address' => 'required|string|max:500',
            'contact_name' => 'nullable|string|max:255',
            'contact_phone' => 'nullable|string|max:50',
            'notes' => 'nullable|string|max:500',
            'is_default' => 'nullable|boolean',
        ]);

        if (!empty($data['is_default'])) {
            CustomerAddress::where('customer_id', $customer->id)->update(['is_default' => false]);
        }

        $address = CustomerAddress::create([
            'customer_id' => $customer->id,
            'tag' => $data['tag'],
            'address' => $data['address'],
            'contact_name' => $data['contact_name'] ?? null,
            'contact_phone' => $data['contact_phone'] ?? null,
            'notes' => $data['notes'] ?? null,
            'is_default' => !empty($data['is_default']),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Delivery address saved successfully.',
            'data' => $address,
        ], 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $address = CustomerAddress::findOrFail($id);

        $data = $request->validate([
            'tag' => 'sometimes|string|max:100',
            'address' => 'sometimes|string|max:500',
            'contact_name' => 'nullable|string|max:255',
            'contact_phone' => 'nullable|string|max:50',
            'notes' => 'nullable|string|max:500',
            'is_default' => 'nullable|boolean',
        ]);

        if (!empty($data['is_default'])) {
            CustomerAddress::where('customer_id', $address->customer_id)->where('id', '!=', $id)->update(['is_default' => false]);
        }

        $address->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Address updated successfully.',
            'data' => $address->fresh(),
        ]);
    }

    public function setDefault(Request $request, $id): JsonResponse
    {
        $address = CustomerAddress::findOrFail($id);
        CustomerAddress::where('customer_id', $address->customer_id)->update(['is_default' => false]);
        $address->update(['is_default' => true]);

        return response()->json([
            'success' => true,
            'message' => 'Default address set.',
            'data' => $address->fresh(),
        ]);
    }

    public function destroy($id): JsonResponse
    {
        $address = CustomerAddress::findOrFail($id);
        $address->delete();

        return response()->json([
            'success' => true,
            'message' => 'Address removed successfully.',
        ]);
    }
}
