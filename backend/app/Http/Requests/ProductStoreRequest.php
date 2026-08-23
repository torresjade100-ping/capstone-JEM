<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ProductStoreRequest extends FormRequest
{
    public function authorize()
    {
        return $this->user() && $this->user()->role === 'admin';
    }

    public function rules()
    {
        return [
            'category_id' => ['required','exists:categories,id'],
            'brand_id' => ['required','exists:brands,id'],
            'name' => ['required','string','max:255'],
            'description' => ['nullable','string'],
            'base_price' => ['required','numeric','min:0'],
            'unit' => ['nullable','string','max:50'],
            'stock_quantity' => ['required','integer','min:0'],
            'low_stock_threshold' => ['required','integer','min:0'],
            'status' => ['required','in:active,inactive'],
            'image' => ['nullable','image','max:10240'],
        ];
    }
}
