<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerAddress extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'customer_addresses';

    protected $fillable = [
        'user_id',
        'customer_id',
        'label',
        'recipient_name',
        'phone_number',
        'address_line1',
        'barangay',
        'city',
        'province',
        'postal_code',
        'delivery_instructions',
        'is_default',
        // Legacy fields for backward compatibility:
        'tag',
        'address',
        'contact_name',
        'contact_phone',
        'notes',
    ];

    protected $casts = [
        'is_default' => 'boolean',
    ];

    protected $appends = [
        'formatted_address',
        'contact_person',
        'phone',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * Compute clean standardized B2C Philippine delivery address string.
     */
    public function getFormattedAddressAttribute(): string
    {
        $parts = array_filter([
            $this->address_line1 ?: $this->attributes['address'] ?? null,
            $this->barangay ? "Brgy. {$this->barangay}" : null,
            $this->city,
            $this->province,
            $this->postal_code,
        ]);

        return !empty($parts) ? implode(', ', $parts) : ($this->attributes['address'] ?? '');
    }

    /**
     * Backward-compatible accessor for contact_person
     */
    public function getContactPersonAttribute(): ?string
    {
        return $this->recipient_name ?: ($this->attributes['contact_name'] ?? null);
    }

    /**
     * Backward-compatible accessor for phone
     */
    public function getPhoneAttribute(): ?string
    {
        return $this->phone_number ?: ($this->attributes['contact_phone'] ?? null);
    }

    /**
     * Backward-compatible accessor for address attribute
     */
    public function getAddressAttribute($value): ?string
    {
        return $value ?: $this->formatted_address;
    }

    /**
     * Backward-compatible accessor for tag attribute
     */
    public function getTagAttribute($value): ?string
    {
        return $this->label ?: ($value ?: 'Home');
    }

    /**
     * Backward-compatible accessor for notes attribute
     */
    public function getNotesAttribute($value): ?string
    {
        return $this->delivery_instructions ?: $value;
    }
}
