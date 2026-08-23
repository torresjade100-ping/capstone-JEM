<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Feedback;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class FeedbackController extends Controller
{
    public function store(Request $request)
    {
        $request->validate(['subject' => 'required|string', 'message' => 'required|string', 'type' => 'nullable|string']);
        $user = Auth::user();
        $feedback = Feedback::create(['customer_id' => $user->customer->id, 'subject' => $request->subject, 'message' => $request->message, 'type' => $request->type]);
        return response()->json(['success' => true, 'data' => $feedback]);
    }

    public function index()
    {
        $user = Auth::user();
        $items = Feedback::where('customer_id', $user->customer->id)->orderBy('created_at', 'desc')->paginate(20);
        return response()->json(['success' => true, 'data' => $items]);
    }

    // Admin endpoints
    public function adminIndex()
    {
        $items = Feedback::orderBy('created_at', 'desc')->paginate(20);
        return response()->json(['success' => true, 'data' => $items]);
    }

    public function respond(Request $request, $id)
    {
        $request->validate(['admin_response' => 'required|string', 'status' => 'nullable|string']);
        $fb = Feedback::findOrFail($id);
        $fb->admin_response = $request->admin_response;
        if ($request->filled('status')) $fb->status = $request->status;
        $fb->save();
        return response()->json(['success' => true, 'data' => $fb]);
    }
}
