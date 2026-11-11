<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** A gebruiker's device as bar terminal of an evenement. One row per gebruiker per evenement; `actief` = joined now. */
class Terminal extends Model
{
    protected $table = 'terminals';

    public $timestamps = true;

    protected $fillable = [
        'evenement_id',
        'user_id',
        'actief',
    ];

    protected function casts(): array
    {
        return [
            'actief' => 'boolean',
        ];
    }

    public function evenement(): BelongsTo
    {
        return $this->belongsTo(Evenement::class, 'evenement_id');
    }

    public function gebruiker(): BelongsTo
    {
        return $this->belongsTo(Gebruiker::class, 'user_id');
    }
}
