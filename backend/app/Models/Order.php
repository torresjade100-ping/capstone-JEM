<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    use HasFactory;

    protected $fillable = [
        'customer_id',
        'order_number',
        'status',
        'payment_method',
        'subtotal',
        'shipping_fee',
        'tax',
        'total',
        'amount_paid',
        'delivery_address',
        'delivery_date',
        'idempotency_key',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function backorders(): HasMany
    {
        return $this->hasMany(Backorder::class);
    }

    /**
     * Retrieve the model for a bound value (resolving by ID or order_number).
     */
    public function resolveRouteBinding($value, $field = null)
    {
        return $this->where('id', $value)
            ->orWhere('order_number', $value)
            ->first() ?? abort(404, "No order found matching identifier '{$value}'");
    }
}
