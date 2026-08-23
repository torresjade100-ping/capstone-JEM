<?php

namespace App\Services\Payments;

class MockMayaPaymentService implements PaymentServiceInterface
{
    public function createPayment(array $payload): array
    {
        return [
            'gateway' => 'maya',
            'reference' => 'MAYA-'.time().rand(100,999),
            'checkout_url' => 'https://sandbox-maya.example/checkout/'.uniqid(),
        ];
    }

    public function verifyPayment(array $payload): array
    {
        $ok = isset($payload['reference']) && isset($payload['amount']);
        return [
            'ok' => $ok,
            'reference' => $payload['reference'] ?? null,
            'amount' => $payload['amount'] ?? null,
            'transaction_date' => $payload['transaction_date'] ?? now(),
            'gateway' => 'maya',
        ];
    }
}
