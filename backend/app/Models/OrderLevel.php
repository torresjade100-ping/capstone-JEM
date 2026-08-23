<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OrderLevel extends Model
{
    use HasFactory;

    protected $fillable = ['order_id', 'level_number', 'status', 'delivery_date', 'tracking_number', 'notes'];

    protected $dates = ['delivery_date'];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function items()
    {
        return $this->hasMany(OrderLevelItem::class);
    }
}
