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
        $request->validate(['name' => 'required|string|max:255', 'contact' => 'nullable|string|max:255', 'email' => 'nullable|email', 'address' => 'nullable|string|max:1000']);
        $supplier = Supplier::create($request->only(['name','contact','email','address','notes']));
        return response()->json(['success' => true, 'data' => $supplier]);
    }

    public function update(Request $request, Supplier $supplier)
    {
        $data = $request->validate(['name' => 'required|string|max:255', 'contact' => 'nullable|string|max:255', 'email' => 'nullable|email', 'address' => 'nullable|string|max:1000', 'notes' => 'nullable|string|max:2000']);
        $supplier->update($data);
        return response()->json(['success' => true, 'data' => $supplier->fresh()]);
    }

    public function destroy(Supplier $supplier)
    {
        $supplier->delete();
        return response()->json(['success' => true, 'message' => 'Supplier deleted.']);
    }
}
