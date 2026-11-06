<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LossDamageTheft extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'loss_damage_thefts';

    protected $fillable = [
        'reference_number',
        'product_id',
        'product_variant_id',
        'sku',
        'incident_type',
        'quantity',
        'incident_date',
        'reported_by',
        'reported_by_id',
        'reason',
        'status',
        'action_taken',
        'stock_adjusted',
        'stock_adjustment_id',
        'created_by',
        'updated_by',
        'notes',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'stock_adjusted' => 'boolean',
        'incident_date' => 'date:Y-m-d',
    ];

    protected $appends = [
        'product_name',
        'effective_sku',
        'estimated_cost',
    ];

    protected static function booted()
    {
        static::creating(function ($model) {
            if (empty($model->reference_number)) {
                $datePart = now()->format('Ymd');
                $randomPart = strtoupper(substr(uniqid(), -4));
                $model->reference_number = "LDT-{$datePart}-{$randomPart}";
            }
        });
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function stockAdjustment(): BelongsTo
    {
        return $this->belongsTo(StockAdjustment::class, 'stock_adjustment_id');
    }

    public function getProductNameAttribute(): string
    {
        return $this->product?->name ?? 'Unknown Product';
    }

    public function getEffectiveSkuAttribute(): string
    {
        if (!empty($this->sku)) {
            return $this->sku;
        }
        if ($this->variant && !empty($this->variant->sku)) {
            return $this->variant->sku;
        }
        return 'PRD-' . str_pad((string) $this->product_id, 4, '0', STR_PAD_LEFT);
    }

    public function getEstimatedCostAttribute(): float
    {
        $cost = (float) ($this->product?->cost_price ?? 0);
        return round($cost * (int) $this->quantity, 2);
    }
}
