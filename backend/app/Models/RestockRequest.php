<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RestockRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'product_variant_id',
        'user_id',
        'requested_by',
        'requested_quantity',
        'status',
        'notes',
    ];

    protected static function booted(): void
    {
        static::saving(function ($model) {
            if (empty($model->user_id) && !empty($model->requested_by)) {
                $model->user_id = $model->requested_by;
            }
            if (empty($model->requested_by) && !empty($model->user_id)) {
                $model->requested_by = $model->user_id;
            }
        });
    }

    public function product(): BelongsTo { return $this->belongsTo(Product::class); }
    public function requester(): BelongsTo { return $this->belongsTo(User::class, 'requested_by'); }
    public function user(): BelongsTo { return $this->belongsTo(User::class, 'user_id'); }
    public function variant(): BelongsTo { return $this->belongsTo(ProductVariant::class, 'product_variant_id'); }
}
