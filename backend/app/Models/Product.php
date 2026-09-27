<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Product extends Model
{
    use HasFactory;

    protected $table = 'Producten';

    public $timestamps = false;

    protected $fillable = [
        'event_id',
        'prijs',
        'naam',
    ];

    protected function casts(): array
    {
        return [
            'prijs' => 'integer',
        ];
    }

    public function evenement(): BelongsTo
    {
        return $this->belongsTo(Evenement::class, 'event_id');
    }
}
