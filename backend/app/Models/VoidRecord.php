<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VoidRecord extends Model
{
    use HasFactory;

    protected $table = 'voids';

    protected $fillable = [
        'transaction_id',
        'voided_by',
        'reason',
        'void_date',
        'items_restored',
    ];

    protected $casts = [
        'void_date' => 'datetime',
        'items_restored' => 'array',
    ];

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'voided_by');
    }
}
