<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ValidateStockRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     * Publicly accessible for customer carts (with or without auth token).
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer'],
            'items.*.requested_qty' => ['required', 'integer', 'min:1'],
            'items.*.product_variant_id' => ['nullable', 'integer'],
        ];
    }

    /**
     * Custom attribute names for validation error messages.
     */
    public function attributes(): array
    {
        return [
            'items' => 'cart items',
            'items.*.product_id' => 'product ID',
            'items.*.requested_qty' => 'requested quantity',
            'items.*.product_variant_id' => 'product variant ID',
        ];
    }

    /**
     * Custom validation error messages.
     */
    public function messages(): array
    {
        return [
            'items.required' => 'At least one cart item is required for stock validation.',
            'items.min' => 'Cart items array cannot be empty.',
            'items.*.product_id.required' => 'Each item must have a valid product_id.',
            'items.*.requested_qty.required' => 'Each item must have a requested_qty.',
            'items.*.requested_qty.min' => 'Requested quantity must be at least 1.',
        ];
    }
}
