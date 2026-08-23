<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SalesTransaction extends Model
{
    use HasFactory;

    protected $fillable = ['user_id','transaction_number','type','subtotal','discount','total','payment_method','status','notes'];

    public function items()
    {
        return $this->hasMany(SaleItem::class, 'sales_transaction_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
