<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Feedback;
use App\Models\User;
use App\Models\Customer;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class FeedbackController extends Controller
{
    public function store(Request $request)
    {
        $request->validate(['subject' => 'required|string', 'message' => 'required|string', 'rating' => 'nullable|numeric']);
        $user = Auth::user();
        $feedback = Feedback::create([
            'customer_id' => $user->customer->id,
            'subject' => $request->subject,
            'message' => $request->message,
            'rating' => $request->rating ?? 5,
            'status' => 'new',
        ]);
        return response()->json(['success' => true, 'data' => $feedback]);
    }

    public function storeMobileFeedback(Request $request)
    {
        $request->validate([
            'message' => 'nullable|string',
            'comment' => 'nullable|string',
            'subject' => 'nullable|string',
            'order_number' => 'nullable|string',
            'rating' => 'nullable|numeric',
            'customer_name' => 'nullable|string',
            'customer_email' => 'nullable|string',
        ]);

        $customer = null;
        if (Auth::check() && Auth::user()->customer) {
            $customer = Auth::user()->customer;
        } elseif ($request->filled('customer_email')) {
            $user = User::where('email', $request->customer_email)->first();
            if ($user && $user->customer) {
                $customer = $user->customer;
            }
        }
        if (! $customer) {
            $customer = Customer::first();
        }

        $ratingStars = max(1, min((int) ($request->rating ?? 5), 5));
        $orderNumber = $request->order_number ?: 'Delivery';
        $subject = $request->subject ?: ("Order #{$orderNumber} - {$ratingStars} Stars Delivery Review");
        $feedbackMsg = $request->message ?: ($request->comment ?: "Customer gave a {$ratingStars}-star rating for Order #{$orderNumber}.");

        $fb = Feedback::create([
            'customer_id' => $customer?->id ?? 1,
            'subject' => $subject,
            'message' => $feedbackMsg,
            'rating' => $ratingStars,
            'status' => 'new',
        ]);

        // Dispatch notifications to Admin and Staff
        $notifTitle = "New ⭐ {$ratingStars}-Star Delivery Feedback!";
        $notifMsg = "Customer " . ($request->customer_name ?: 'Juan Dela Cruz') . " submitted a {$ratingStars}-star review for Order #{$orderNumber}: \"{$feedbackMsg}\"";

        $adminUsers = User::whereIn('role', ['admin', 'staff'])->get();
        foreach ($adminUsers as $u) {
            try {
                Notification::create([
                    'user_id' => $u->id,
                    'title' => $notifTitle,
                    'message' => $notifMsg,
                    'type' => 'feedback',
                    'data' => [
                        'feedback_id' => $fb->id,
                        'order_number' => $orderNumber,
                        'rating' => $ratingStars,
                        'customer_name' => $request->customer_name ?: 'Juan Dela Cruz',
                    ],
                    'channel' => 'database',
                    'read' => false,
                ]);
            } catch (\Throwable $e) {}
        }

        return response()->json([
            'success' => true,
            'message' => 'Thank you! Your feedback has been received.',
            'data' => $fb->load('customer.user'),
        ], 201);
    }

    public function index()
    {
        $user = Auth::user();
        $items = Feedback::where('customer_id', $user->customer->id)->orderBy('created_at', 'desc')->paginate(20);
        return response()->json(['success' => true, 'data' => $items]);
    }

    public function adminIndex()
    {
        $items = Feedback::with('customer.user')->orderBy('created_at', 'desc')->paginate(50);
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
