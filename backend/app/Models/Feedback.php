<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Feedback extends Model
{
    use HasFactory;

    protected $fillable = ['customer_id','subject','message','type','status','admin_response'];

    public function customer()
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }
}
