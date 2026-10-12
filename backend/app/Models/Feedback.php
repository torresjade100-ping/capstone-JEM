<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Feedback extends Model
{
    use HasFactory;

    protected $table = 'feedback';

    protected $fillable = [
        'customer_id',
        'subject',
        'message',
        'rating',
        'status',
        'admin_response',
        'responded_by',
        'responded_at',
    ];

    protected $casts = [
        'rating' => 'integer',
        'responded_at' => 'datetime',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }

    public function responder()
    {
        return $this->belongsTo(User::class, 'responded_by');
    }
}
