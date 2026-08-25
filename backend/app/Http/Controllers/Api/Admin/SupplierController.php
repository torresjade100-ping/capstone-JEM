<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use Illuminate\Http\Request;

class SupplierController extends Controller
{
    public function index()
    {
        return response()->json(['success' => true, 'data' => Supplier::paginate(20)]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'contact' => 'nullable|string|max:255',
            'email' => 'nullable|email',
            'phone' => 'nullable|string|max:50',
            'address' => 'nullable|string|max:1000',
            'status' => 'nullable|in:active,inactive',
        ]);
        if (isset($data['contact']) && !isset($data['contact_person'])) {
            $data['contact_person'] = $data['contact'];
        }
        $supplier = Supplier::create($data);
        return response()->json(['success' => true, 'data' => $supplier]);
    }

    public function update(Request $request, Supplier $supplier)
    {
        $data = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'contact' => 'nullable|string|max:255',
            'email' => 'nullable|email',
            'phone' => 'nullable|string|max:50',
            'address' => 'nullable|string|max:1000',
            'status' => 'nullable|in:active,inactive',
        ]);
        if (isset($data['contact']) && !isset($data['contact_person'])) {
            $data['contact_person'] = $data['contact'];
        }
        $supplier->update($data);
        return response()->json(['success' => true, 'data' => $supplier->fresh()]);
    }

    public function destroy(Supplier $supplier)
    {
        $supplier->delete();
        return response()->json(['success' => true, 'message' => 'Supplier deleted.']);
    }
}
