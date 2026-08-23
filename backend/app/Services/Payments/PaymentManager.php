<?php

namespace App\Services\Payments;

use InvalidArgumentException;

class PaymentManager
{
    protected array $map = [
        'gcash' => MockGCashPaymentService::class,
        'maya' => MockMayaPaymentService::class,
        'cod' => CashPaymentService::class,
        'cash' => CashPaymentService::class,
    ];

    public function getService(string $method): PaymentServiceInterface
    {
        $method = strtolower($method);
        if (! isset($this->map[$method])) {
            throw new InvalidArgumentException('Unsupported payment method: '.$method);
        }

        $class = $this->map[$method];
        return app($class);
    }

    public function create(string $method, array $payload): array
    {
        return $this->getService($method)->createPayment($payload);
    }

    public function verify(string $method, array $payload): array
    {
        return $this->getService($method)->verifyPayment($payload);
    }
}
