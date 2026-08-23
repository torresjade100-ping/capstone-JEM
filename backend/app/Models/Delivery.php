<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Delivery extends Model
{
    use HasFactory;

    protected $fillable = ['order_level_id','order_id','contact_number','delivery_address','delivery_lead_time_days','courier','tracking_number','status','delivery_date','notes'];

    protected $dates = ['delivery_date'];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function orderLevel()
    {
        return $this->belongsTo(OrderLevel::class, 'order_level_id');
    }
}
