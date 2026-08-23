<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OrderLevelItem extends Model
{
    use HasFactory;

    protected $fillable = ['order_level_id', 'order_item_id', 'quantity'];

    public function level()
    {
        return $this->belongsTo(OrderLevel::class, 'order_level_id');
    }

    public function orderItem()
    {
        return $this->belongsTo(OrderItem::class, 'order_item_id');
    }
}
