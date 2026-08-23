<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StockAdjustment extends Model
{
    use HasFactory;

    protected $table = 'stock_adjustments';

    protected $fillable = [
        'product_id',
        'product_variant_id',
        'user_id',
        'adjustment_type',
        'quantity_before',
        'quantity_changed',
        'quantity_after',
        'reason',
    ];
}
