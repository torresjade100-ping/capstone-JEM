<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CustomerAddressRequest;
use App\Models\Customer;
use App\Models\CustomerAddress;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CustomerAddressController extends Controller
{
    /**
     * Resolve the active User and Customer records for the request.
     */
    protected function resolveAccount(Request $request): array
    {
        $user = Auth::check() ? Auth::user() : null;
        $customer = $user?->customer;

        if (!$user && $request->filled('customer_email')) {
            $user = User::where('email', $request->customer_email)->first();
            $customer = $user?->customer;
        }

        if (!$customer && $request->filled('customer_id')) {
            $customer = Customer::find($request->customer_id);
            if ($customer && !$user && $customer->user_id) {
                $user = User::find($customer->user_id);
            }
        }

        if (!$customer && !$user) {
            $customer = Customer::first();
            if ($customer && $customer->user_id) {
                $user = User::find($customer->user_id);
            }
        }

        if (!$user && !$customer) {
            $user = User::firstOrCreate(
                ['email' => 'customer@jemlumber.com'],
                [
                    'name' => 'Juan Dela Cruz',
                    'phone' => '0917-123-4567',
                    'password' => \Illuminate\Support\Facades\Hash::make('Password123!'),
                    'role' => 'customer',
                    'status' => 'active',
                ]
            );
            $customer = Customer::firstOrCreate(['user_id' => $user->id]);
        }

        return [$user, $customer];
    }

    /**
     * Display a listing of standard customer delivery addresses.
     */
    public function index(Request $request): JsonResponse
    {
        [$user, $customer] = $this->resolveAccount($request);
        $userId = $user?->id;
        $customerId = $customer?->id;

        if (!$userId && !$customerId) {
            return response()->json(['success' => true, 'data' => []]);
        }

        $query = CustomerAddress::query();
        $query->where(function ($q) use ($userId, $customerId) {
            if ($userId) {
                $q->where('user_id', $userId);
            }
            if ($customerId) {
                $q->orWhere('customer_id', $customerId);
            }
        });

        $addresses = $query->orderByDesc('is_default')->latest('id')->get();

        // Seed initial standard B2C retail delivery addresses if customer has none
        if ($addresses->isEmpty() && ($userId || $customerId)) {
            $primaryName = $user?->name ?: 'Juan Dela Cruz';
            $primaryPhone = $user?->phone ?: '0917-123-4567';

            $addr1 = CustomerAddress::create([
                'user_id' => $userId,
                'customer_id' => $customerId,
                'label' => 'Home',
                'recipient_name' => $primaryName,
                'phone_number' => $primaryPhone,
                'address_line1' => 'Zone 1, Mabasa',
                'barangay' => 'Balulang',
                'city' => 'Cagayan de Oro City',
                'province' => 'Misamis Oriental',
                'postal_code' => '9000',
                'delivery_instructions' => 'Near Mabasa chapel, call upon arrival',
                'is_default' => true,
                // Legacy compatibility fields
                'tag' => 'Home',
                'address' => 'Zone 1, Mabasa, Balulang, Cagayan de Oro City',
                'contact_name' => $primaryName,
                'contact_phone' => $primaryPhone,
                'notes' => 'Near Mabasa chapel, call upon arrival',
            ]);

            $addr2 = CustomerAddress::create([
                'user_id' => $userId,
                'customer_id' => $customerId,
                'label' => 'Work',
                'recipient_name' => $primaryName,
                'phone_number' => $primaryPhone,
                'address_line1' => 'Door 3, Commercial Center, Vamenta Blvd',
                'barangay' => 'Carmen',
                'city' => 'Cagayan de Oro City',
                'province' => 'Misamis Oriental',
                'postal_code' => '9000',
                'delivery_instructions' => 'Front desk office, ground floor',
                'is_default' => false,
                // Legacy compatibility fields
                'tag' => 'Work',
                'address' => 'Door 3, Commercial Center, Vamenta Blvd, Carmen, Cagayan de Oro City',
                'contact_name' => $primaryName,
                'contact_phone' => $primaryPhone,
                'notes' => 'Front desk office, ground floor',
            ]);

            $addresses = collect([$addr1, $addr2]);
        }

        return response()->json(['success' => true, 'data' => $addresses]);
    }

    /**
     * Store a newly created delivery address in storage with single-default guarantee.
     */
    public function store(CustomerAddressRequest $request): JsonResponse
    {
        [$user, $customer] = $this->resolveAccount($request);
        $userId = $user?->id;
        $customerId = $customer?->id;

        if (!$userId && !$customerId) {
            return response()->json([
                'success' => false,
                'message' => 'Customer profile could not be resolved.',
            ], 404);
        }

        $validated = $request->validated();
        $isDefault = $request->boolean('is_default');

        $address = DB::transaction(function () use ($userId, $customerId, $validated, $isDefault) {
            // Uncheck any existing default addresses for this user inside transaction
            if ($isDefault) {
                CustomerAddress::where(function ($q) use ($userId, $customerId) {
                    if ($userId) {
                        $q->where('user_id', $userId);
                    }
                    if ($customerId) {
                        $q->orWhere('customer_id', $customerId);
                    }
                })->update(['is_default' => false]);
            }

            // If user has zero existing addresses, force first address to be default
            $existingCount = CustomerAddress::where(function ($q) use ($userId, $customerId) {
                if ($userId) {
                    $q->where('user_id', $userId);
                }
                if ($customerId) {
                    $q->orWhere('customer_id', $customerId);
                }
            })->count();

            if ($existingCount === 0) {
                $isDefault = true;
            }

            return CustomerAddress::create([
                'user_id' => $userId,
                'customer_id' => $customerId,
                'label' => $validated['label'] ?? 'Home',
                'recipient_name' => $validated['recipient_name'],
                'phone_number' => $validated['phone_number'],
                'address_line1' => $validated['address_line1'],
                'barangay' => $validated['barangay'] ?? null,
                'city' => $validated['city'] ?? 'Cagayan de Oro City',
                'province' => $validated['province'] ?? 'Misamis Oriental',
                'postal_code' => $validated['postal_code'] ?? '9000',
                'delivery_instructions' => $validated['delivery_instructions'] ?? null,
                'is_default' => $isDefault,
                // Legacy fields for backward compatibility
                'tag' => $validated['label'] ?? 'Home',
                'address' => $validated['address_line1'],
                'contact_name' => $validated['recipient_name'],
                'contact_phone' => $validated['phone_number'],
                'notes' => $validated['delivery_instructions'] ?? null,
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Delivery address saved successfully.',
            'data' => $address,
        ], 201);
    }

    /**
     * Update an existing delivery address in storage.
     */
    public function update(CustomerAddressRequest $request, $id): JsonResponse
    {
        $address = CustomerAddress::findOrFail($id);
        $validated = $request->validated();
        $isDefault = $request->has('is_default') ? $request->boolean('is_default') : (bool) $address->is_default;

        $userId = $address->user_id;
        $customerId = $address->customer_id;

        $updated = DB::transaction(function () use ($address, $userId, $customerId, $validated, $isDefault) {
            if ($isDefault) {
                CustomerAddress::where(function ($q) use ($userId, $customerId) {
                    if ($userId) {
                        $q->where('user_id', $userId);
                    }
                    if ($customerId) {
                        $q->orWhere('customer_id', $customerId);
                    }
                })->where('id', '!=', $address->id)->update(['is_default' => false]);
            }

            $updateData = [];
            foreach (['label', 'recipient_name', 'phone_number', 'address_line1', 'barangay', 'city', 'province', 'postal_code', 'delivery_instructions'] as $field) {
                if (array_key_exists($field, $validated)) {
                    $updateData[$field] = $validated[$field];
                }
            }

            $updateData['is_default'] = $isDefault;

            // Mirror legacy columns if relevant fields changed
            if (isset($updateData['label'])) {
                $updateData['tag'] = $updateData['label'];
            }
            if (isset($updateData['recipient_name'])) {
                $updateData['contact_name'] = $updateData['recipient_name'];
            }
            if (isset($updateData['phone_number'])) {
                $updateData['contact_phone'] = $updateData['phone_number'];
            }
            if (isset($updateData['address_line1'])) {
                $updateData['address'] = $updateData['address_line1'];
            }
            if (array_key_exists('delivery_instructions', $updateData)) {
                $updateData['notes'] = $updateData['delivery_instructions'];
            }

            $address->update($updateData);
            return $address->fresh();
        });

        return response()->json([
            'success' => true,
            'message' => 'Delivery address updated successfully.',
            'data' => $updated,
        ]);
    }

    /**
     * Set the specified address as the default delivery address.
     */
    public function setDefault(Request $request, $id): JsonResponse
    {
        $address = CustomerAddress::findOrFail($id);
        $userId = $address->user_id;
        $customerId = $address->customer_id;

        DB::transaction(function () use ($address, $userId, $customerId) {
            CustomerAddress::where(function ($q) use ($userId, $customerId) {
                if ($userId) {
                    $q->where('user_id', $userId);
                }
                if ($customerId) {
                    $q->orWhere('customer_id', $customerId);
                }
            })->update(['is_default' => false]);

            $address->update(['is_default' => true]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Default delivery address updated successfully.',
            'data' => $address->fresh(),
        ]);
    }

    /**
     * Remove the specified address from storage.
     */
    public function destroy($id): JsonResponse
    {
        $address = CustomerAddress::findOrFail($id);
        $userId = $address->user_id;
        $customerId = $address->customer_id;
        $wasDefault = $address->is_default;

        DB::transaction(function () use ($address, $userId, $customerId, $wasDefault) {
            $address->delete();

            // If the deleted address was the default, make the most recent remaining address default
            if ($wasDefault) {
                $next = CustomerAddress::where(function ($q) use ($userId, $customerId) {
                    if ($userId) {
                        $q->where('user_id', $userId);
                    }
                    if ($customerId) {
                        $q->orWhere('customer_id', $customerId);
                    }
                })->latest('id')->first();

                if ($next) {
                    $next->update(['is_default' => true]);
                }
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Delivery address removed successfully.',
        ]);
    }
}
