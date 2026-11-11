<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** One product line of a terminal sale (transactie of type uitgave). */
class TransactieProduct extends Model
{
    protected $table = 'transactie_producten';

    public $timestamps = false;

    protected $fillable = [
        'transactie',
        'product',
        'aantal',
    ];

    protected function casts(): array
    {
        return [
            'aantal' => 'integer',
        ];
    }

    // Named after the columns' targets with a suffix: the columns themselves are called transactie and product.
    public function transactieModel(): BelongsTo
    {
        return $this->belongsTo(Transactie::class, 'transactie');
    }

    public function productModel(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product');
    }
}
