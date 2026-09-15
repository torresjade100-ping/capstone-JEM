<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryBatch extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'inventory_batches';

    protected $fillable = [
        'product_id',
        'batch_number',
        'supplier_id',
        'supplier_name',
        'cost_price',
        'selling_price',
        'initial_quantity',
        'quantity',
        'received_date',
        'expiration_date',
        'status',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'cost_price' => 'decimal:2',
        'selling_price' => 'decimal:2',
        'initial_quantity' => 'integer',
        'quantity' => 'integer',
        'received_date' => 'date:Y-m-d',
        'expiration_date' => 'date:Y-m-d',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
