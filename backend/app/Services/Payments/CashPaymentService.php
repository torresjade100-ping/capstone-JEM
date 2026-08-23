<?php

namespace App\Services\Payments;

class CashPaymentService implements PaymentServiceInterface
{
    public function createPayment(array $payload): array
    {
        // Cash payments are immediate local records
        return [
            'gateway' => 'cash',
            'reference' => 'CASH-'.time().rand(100,999),
        ];
    }

    public function verifyPayment(array $payload): array
    {
        // Cash doesn't verify via gateway. Mark as manual.
        return [
            'ok' => true,
            'reference' => $payload['reference'] ?? null,
            'amount' => $payload['amount'] ?? null,
            'transaction_date' => $payload['transaction_date'] ?? now(),
            'gateway' => 'cash',
        ];
    }
}
