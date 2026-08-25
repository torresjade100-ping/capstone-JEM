<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Staff;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = User::with(['customer', 'staff'])->latest();
        if ($request->filled('role')) $query->where('role', $request->role);
        if ($request->filled('status')) $query->where('status', $request->status);
        if ($request->filled('search')) $query->where(fn ($q) => $q->where('name', 'like', '%'.$request->search.'%')->orWhere('email', 'like', '%'.$request->search.'%'));
        return response()->json(['success' => true, 'data' => $query->paginate(20)]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['required', 'string', 'max:25', 'unique:users,phone'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', Rule::in(['admin', 'staff', 'customer'])],
            'status' => ['nullable', Rule::in(['active', 'inactive'])],
        ]);
        $user = DB::transaction(function () use ($data) {
            $user = User::create([...$data, 'password' => Hash::make($data['password']), 'status' => $data['status'] ?? 'active']);
            if ($user->role === 'customer') Customer::create(['user_id' => $user->id]);
            if ($user->role === 'staff') Staff::create(['user_id' => $user->id, 'status' => 'active']);
            return $user;
        });
        return response()->json(['success' => true, 'data' => $user], 201);
    }

    public function show(User $user): JsonResponse { return response()->json(['success' => true, 'data' => $user->load(['customer', 'staff'])]); }

    public function update(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'phone' => ['sometimes', 'string', 'max:25', Rule::unique('users', 'phone')->ignore($user->id)],
            'password' => ['sometimes', 'string', 'min:8'],
            'status' => ['sometimes', Rule::in(['active', 'inactive'])],
        ]);
        if (isset($data['password'])) $data['password'] = Hash::make($data['password']);
        $user->update($data);
        return response()->json(['success' => true, 'data' => $user->fresh()]);
    }

    public function archive(User $user): JsonResponse { $user->update(['status' => 'inactive']); $user->tokens()->delete(); return response()->json(['success' => true, 'message' => 'User archived.']); }
    public function activate(User $user): JsonResponse { $user->update(['status' => 'active']); return response()->json(['success' => true, 'message' => 'User activated.', 'data' => $user->fresh()]); }
    public function changeRole(Request $request, User $user): JsonResponse { $data = $request->validate(['role' => [ 'required', Rule::in(['admin', 'staff', 'customer']) ]]); $user->update($data); return response()->json(['success' => true, 'data' => $user->fresh()]); }

    public function destroy(User $user): JsonResponse
    {
        if ($user->role === 'admin') {
            return response()->json(['success' => false, 'message' => 'Administrator accounts cannot be deleted.'], 403);
        }
        $user->tokens()->delete();
        $user->customer()?->delete();
        $user->staff()?->delete();
        $user->forceDelete();
        return response()->json(['success' => true, 'message' => 'User deleted successfully.']);
    }
}


