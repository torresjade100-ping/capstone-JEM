<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CheckoutRequest extends FormRequest
{
    public function authorize()
    {
        return $this->user() !== null;
    }

    public function rules()
    {
        return [
            'payment_method' => ['required','in:gcash,maya,cod'],
            'delivery_address' => ['required','string'],
            'delivery_date' => ['nullable','date'],
            'idempotency_key' => ['nullable','string','max:255'],
        ];
    }
}
