<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CustomerAddressRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        // Support backward compatibility with legacy aliases
        $merge = [];

        if (!$this->has('label') && $this->has('tag')) {
            $merge['label'] = $this->input('tag');
        }

        if (!$this->has('recipient_name') && ($this->has('contact_person') || $this->has('contact_name'))) {
            $merge['recipient_name'] = $this->input('recipient_name') ?: ($this->input('contact_person') ?: $this->input('contact_name'));
        }

        if (!$this->has('phone_number') && ($this->has('contact_phone') || $this->has('phone'))) {
            $merge['phone_number'] = $this->input('phone_number') ?: ($this->input('contact_phone') ?: $this->input('phone'));
        }

        if (!$this->has('address_line1') && $this->has('address')) {
            $merge['address_line1'] = $this->input('address');
        }

        if (!$this->has('delivery_instructions') && $this->has('notes')) {
            $merge['delivery_instructions'] = $this->input('notes');
        }

        // Default label if missing
        if (empty($this->input('label')) && empty($merge['label'])) {
            $merge['label'] = 'Home';
        }

        // Default city/province strictly restricted to Cagayan de Oro City
        if (empty($this->input('city'))) {
            $merge['city'] = 'Cagayan de Oro City';
        }
        if (empty($this->input('province'))) {
            $merge['province'] = 'Misamis Oriental';
        }
        if (empty($this->input('postal_code'))) {
            $merge['postal_code'] = '9000';
        }

        if ($this->has('phone_number')) {
            $raw = (string) $this->input('phone_number');
            $digits = preg_replace('/[^0-9]/', '', $raw);
            if (!empty($digits)) {
                $merge['phone_number'] = $digits;
            }
        }

        if (!empty($merge)) {
            $this->merge($merge);
        }
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        $rules = [
            'label' => ['string', 'max:50'],
            'recipient_name' => ['string', 'max:100'],
            'phone_number' => ['string', 'regex:/^09[0-9]{9}$/'],
            'address_line1' => ['string', 'max:255'],
            'barangay' => ['nullable', 'string', 'max:100'],
            'city' => ['string', 'max:100', 'regex:/cagayan de oro|cdo/i'],
            'province' => ['string', 'max:100'],
            'postal_code' => ['nullable', 'string', 'max:20'],
            'delivery_instructions' => ['nullable', 'string', 'max:500'],
            'is_default' => ['nullable', 'boolean'],
            'customer_email' => ['nullable', 'email'],
        ];

        if ($this->isMethod('post')) {
            array_unshift($rules['label'], 'required');
            array_unshift($rules['recipient_name'], 'required');
            array_unshift($rules['phone_number'], 'required');
            array_unshift($rules['address_line1'], 'required');
            array_unshift($rules['city'], 'required');
            array_unshift($rules['province'], 'required');
        } else {
            array_unshift($rules['label'], 'sometimes', 'required');
            array_unshift($rules['recipient_name'], 'sometimes', 'required');
            array_unshift($rules['phone_number'], 'sometimes', 'required');
            array_unshift($rules['address_line1'], 'sometimes', 'required');
            array_unshift($rules['city'], 'sometimes', 'required');
            array_unshift($rules['province'], 'sometimes', 'required');
        }

        return $rules;
    }

    /**
     * Get custom error messages for validation failures.
     */
    public function messages(): array
    {
        return [
            'label.required' => 'Please select an address label (Home, Work, or Other).',
            'recipient_name.required' => 'Please enter the recipient full name / contact person.',
            'recipient_name.max' => 'Recipient name cannot exceed 100 characters.',
            'phone_number.required' => 'Contact number must be exactly 11 digits.',
            'phone_number.regex' => 'Contact number must be exactly 11 digits.',
            'address_line1.required' => 'House / Unit No., Street, and Building details are required.',
            'city.required' => 'City / Municipality is required.',
            'city.regex' => 'Delivery is currently restricted to Cagayan de Oro City addresses only.',
            'province.required' => 'Province is required.',
        ];
    }
}
