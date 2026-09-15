<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'category_id',
        'brand_id',
        'name',
        'description',
        'base_price',
        'cost_price',
        'selling_price',
        'unit',
        'image',
        'stock_quantity',
        'low_stock_threshold',
        'status',
    ];

    protected $casts = [
        'base_price' => 'decimal:2',
        'cost_price' => 'decimal:2',
        'selling_price' => 'decimal:2',
        'stock_quantity' => 'integer',
        'low_stock_threshold' => 'integer',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class);
    }

    public function batches(): HasMany
    {
        return $this->hasMany(InventoryBatch::class)->orderBy('received_date', 'desc')->orderBy('id', 'desc');
    }

    public function activeBatches(): HasMany
    {
        return $this->hasMany(InventoryBatch::class)->where('status', 'active')->where('quantity', '>', 0)->orderBy('received_date', 'asc');
    }
}
