<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();
        $items = Notification::where('user_id', $user->id)->orderBy('created_at', 'desc')->paginate(20);
        return response()->json(['success' => true, 'data' => $items]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', 'string', 'max:100'],
            'data' => ['nullable', 'array'],
        ]);
        $notification = Notification::create([
            'user_id' => Auth::id(),
            'title' => $data['data']['title'] ?? ucfirst(str_replace('_', ' ', $data['type'])),
            'message' => $data['data']['message'] ?? 'You have a new staff notification.',
            'type' => $data['type'],
            'data' => $data['data'] ?? [],
            'channel' => 'database',
            'read' => false,
        ]);
        return response()->json(['success' => true, 'data' => $notification], 201);
    }

    public function markRead(Request $request, $id): JsonResponse
    {
        $n = Notification::where('user_id', Auth::id())->findOrFail($id);
        $n->read = true;
        $n->save();
        return response()->json(['success' => true, 'data' => $n]);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        Notification::where('user_id', Auth::id())->where('read', false)->update(['read' => true]);
        return response()->json(['success' => true, 'message' => 'All notifications marked as read.']);
    }

    public function clearAll(Request $request): JsonResponse
    {
        Notification::where('user_id', Auth::id())->delete();
        return response()->json(['success' => true, 'message' => 'All notifications cleared.']);
    }
}
