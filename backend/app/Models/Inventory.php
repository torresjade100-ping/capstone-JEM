<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Inventory extends Model
{
    use HasFactory;

    protected $table = 'inventory';

    protected $fillable = [
        'product_id',
        'product_variant_id',
        'current_quantity',
        'available_quantity',
        'reserved_quantity',
        'threshold',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function product_variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class);
    }
}
