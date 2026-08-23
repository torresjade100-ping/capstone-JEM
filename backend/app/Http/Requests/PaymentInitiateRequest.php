<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PaymentInitiateRequest extends FormRequest
{
    public function authorize()
    {
        return $this->user() !== null;
    }

    public function rules()
    {
        return [
            'order_id' => ['required','exists:orders,id'],
            'method' => ['required','string','in:gcash,maya,cod'],
        ];
    }
}
