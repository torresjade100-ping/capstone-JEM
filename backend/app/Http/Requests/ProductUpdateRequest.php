<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ProductUpdateRequest extends FormRequest
{
    public function authorize()
    {
        return $this->user() && in_array($this->user()->role, ['admin','staff']);
    }

    public function rules()
    {
        return [
            'category_id' => ['sometimes','exists:categories,id'],
            'brand_id' => ['sometimes','exists:brands,id'],
            'name' => ['sometimes','string','max:255'],
            'description' => ['nullable','string'],
            'base_price' => ['sometimes','numeric','min:0'],
            'unit' => ['nullable','string','max:50'],
            'stock_quantity' => ['sometimes','integer','min:0'],
            'low_stock_threshold' => ['sometimes','integer','min:0'],
            'status' => ['sometimes','in:active,inactive'],
            'image' => ['nullable','image','max:10240'],
        ];
    }
}
