<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductCategorie extends Model
{
    use HasFactory;

    protected $table = 'product_categorieen';

    public $timestamps = false;

    protected $fillable = [
        'naam',
        'evenement_id',
    ];

    public function evenement(): BelongsTo
    {
        return $this->belongsTo(Evenement::class, 'evenement_id');
    }

    public function producten(): HasMany
    {
        return $this->hasMany(Product::class, 'categorie_id');
    }
}
