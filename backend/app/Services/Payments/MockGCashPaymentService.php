<?php

namespace App\Services\Payments;

class MockGCashPaymentService implements PaymentServiceInterface
{
    public function createPayment(array $payload): array
    {
        // Return a fake checkout url and reference
        return [
            'gateway' => 'gcash',
            'reference' => 'GCASH-'.time().rand(100,999),
            'checkout_url' => 'https://sandbox-gcash.example/checkout/'.uniqid(),
        ];
    }

    public function verifyPayment(array $payload): array
    {
        // In sandbox, accept if amount and reference exist
        $ok = isset($payload['reference']) && isset($payload['amount']);
        return [
            'ok' => $ok,
            'reference' => $payload['reference'] ?? null,
            'amount' => $payload['amount'] ?? null,
            'transaction_date' => $payload['transaction_date'] ?? now(),
            'gateway' => 'gcash',
        ];
    }
}
