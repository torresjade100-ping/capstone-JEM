<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VoidSecuritySetting extends Model
{
    use HasFactory;

    protected $table = 'void_security_settings';

    protected $fillable = [
        'void_pin_hash',
        'configured_by',
        'configured_at',
    ];

    protected $hidden = [
        'void_pin_hash',
    ];

    protected $casts = [
        'configured_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'configured_by');
    }
}
