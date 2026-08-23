<?php

namespace App\Services\Payments;

interface PaymentServiceInterface
{
    /**
     * Create a payment request/record at gateway level. Return gateway reference.
     */
    public function createPayment(array $payload): array;

    /**
     * Verify a gateway callback payload. Return standardized result.
     */
    public function verifyPayment(array $payload): array;
}
