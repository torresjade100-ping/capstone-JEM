<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Transaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'transaction_number',
        'cashier_id',
        'cashier_name',
        'cashier_role',
        'customer_id',
        'customer_name',
        'order_source',
        'payment_method',
        'reference_number',
        'gross_subtotal',
        'discount',
        'total_net',
        'amount_tendered',
        'change_due',
        'status',
        'type',
        'date_time',
        'notes',
    ];

    protected $casts = [
        'gross_subtotal' => 'decimal:2',
        'discount' => 'decimal:2',
        'total_net' => 'decimal:2',
        'amount_tendered' => 'decimal:2',
        'change_due' => 'decimal:2',
        'date_time' => 'datetime',
    ];

    public function getOrderSourceAttribute($value): string
    {
        if (!empty($value)) {
            return $value;
        }
        if ($this->order_id || strtolower((string)$this->type) === 'online') {
            return 'Online';
        }
        return 'Walk-in';
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function cashier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cashier_id');
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(TransactionItem::class);
    }

    public function refunds(): HasMany
    {
        return $this->hasMany(Refund::class);
    }

    public function voidRecord(): HasOne
    {
        return $this->hasOne(VoidRecord::class);
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class, 'transaction_id');
    }
}
