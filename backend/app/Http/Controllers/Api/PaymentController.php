<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Payment;
use App\Services\Payments\PaymentManager;
use App\Http\Requests\PaymentInitiateRequest as PaymentInitiateRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Services\AuditService;
use Illuminate\Support\Facades\Request as RequestFacade;
use Illuminate\Http\JsonResponse;

class PaymentController extends Controller
{
    protected PaymentManager $manager;

    public function __construct(PaymentManager $manager)
    {
        $this->manager = $manager;
    }

    public function initiate(PaymentInitiateRequest $request)
    {
        $request->validate([
            'order_id' => ['required', 'exists:orders,id'],
            'method' => ['required', 'in:gcash,maya,cod'],
        ]);
        $order = Order::findOrFail($request->order_id);

        $payload = [
            'order_id' => $order->id,
            'amount' => $order->total,
            'currency' => 'PHP',
        ];

        $method = $request->input('method');
        $result = $this->manager->create($method, $payload);

        // Create local payment record
        $payment = Payment::create([
            'order_id' => $order->id,
            'method' => $method,
            'status' => 'pending',
            'amount' => $order->total,
            'reference_number' => $result['reference'] ?? null,
        ]);

        try {
            app(AuditService::class)->record([
                'user_id' => $request->user()->id ?? null,
                'action' => 'create',
                'module' => 'payment',
                'record_type' => 'payment',
                'record_id' => $payment->id,
                'before' => null,
                'after' => $payment->toArray(),
                'ip_address' => RequestFacade::ip(),
            ]);
        } catch (\Throwable $e) {
        }

        return response()->json(['success' => true, 'data' => ['payment' => $payment, 'gateway' => $result]]);
    }

    public function index(Request $request): JsonResponse
    {
        $payments = Payment::with(['order.customer.user'])->latest()->paginate(20);
        return response()->json(['success' => true, 'data' => $payments]);
    }

    public function show(int $id): JsonResponse
    {
        return response()->json(['success' => true, 'data' => Payment::with(['order.customer.user'])->findOrFail($id)]);
    }

    public function webhook(Request $request, $gateway)
    {
        $payload = $request->all();
        $result = $this->manager->verify($gateway, $payload);

        if (! $result['ok']) {
            return response()->json(['success' => false], 400);
        }

        // Find payment by reference
        $payment = Payment::where('reference_number', $result['reference'])->first();
        if (! $payment) {
            return response()->json(['success' => false, 'message' => 'Payment not found'], 404);
        }

        $payment->status = 'completed';
        $payment->transaction_date = $result['transaction_date'] ?? now();
        $payment->save();

        try {
            app(AuditService::class)->record([
                'user_id' => null,
                'action' => 'update',
                'module' => 'payment',
                'record_type' => 'payment',
                'record_id' => $payment->id,
                'before' => null,
                'after' => $payment->toArray(),
                'ip_address' => RequestFacade::ip(),
            ]);
        } catch (\Throwable $e) {
        }

        // Update order
        $order = $payment->order;
        $order->amount_paid += $payment->amount;
        if ($order->amount_paid >= $order->total) {
            $order->status = 'paid';
        }
        $order->save();

        return response()->json(['success' => true]);
    }
}
