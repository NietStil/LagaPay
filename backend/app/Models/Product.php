<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Product extends Model
{
    use HasFactory;

    protected $table = 'producten';

    public $timestamps = false;

    protected $fillable = [
        'categorie_id',
        'prijs',
        'naam',
    ];

    protected function casts(): array
    {
        return [
            'prijs' => 'integer',
        ];
    }

    public function categorie(): BelongsTo
    {
        return $this->belongsTo(ProductCategorie::class, 'categorie_id');
    }
}
