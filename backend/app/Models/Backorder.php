<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Backorder extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'order_item_id',
        'product_id',
        'product_variant_id',
        'quantity',
        'requested_quantity',
        'fulfilled_quantity',
        'remaining_quantity',
        'status',
        'expected_restock_date',
        'notes'
    ];

    protected $dates = ['expected_restock_date'];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function orderItem()
    {
        return $this->belongsTo(OrderItem::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function variant()
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }
}
