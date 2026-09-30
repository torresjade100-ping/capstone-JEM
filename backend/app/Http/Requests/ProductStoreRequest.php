<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProductStoreRequest extends FormRequest
{
    public function authorize()
    {
        return $this->user() && $this->user()->role === 'admin';
    }

    public function rules()
    {
        return [
            'category_id' => ['required', Rule::exists('categories', 'id')->where('status', 'active')],
            'brand_id' => ['required', 'exists:brands,id'],
            'name' => ['required', 'string', 'max:255', 'unique:products,name'],
            'description' => ['nullable', 'string'],
            'base_price' => ['nullable', 'numeric', 'min:0'],
            'cost_price' => ['nullable', 'numeric', 'min:0'],
            'selling_price' => ['nullable', 'numeric', 'min:0'],
            'unit' => ['nullable', 'string', 'max:50'],
            'stock_quantity' => ['required', 'integer', 'min:0'],
            'low_stock_threshold' => ['required', 'integer', 'min:0'],
            'status' => ['required', 'in:active,inactive'],
            'image' => ['nullable', 'image', 'max:10240'],
            'supplier_id' => ['nullable', 'exists:suppliers,id'],
            'supplier_name' => ['nullable', 'string', 'max:255'],
            'received_date' => ['nullable', 'date'],
            'expiration_date' => ['nullable', 'date'],
        ];
    }

    public function messages()
    {
        return [
            'name.unique' => "A product named ':input' already exists in your catalog. Please select the existing product to add new stock batches instead of creating a duplicate.",
            'category_id.exists' => 'The selected category is inactive or does not exist. Only active categories can be assigned to new products.',
        ];
    }
}
