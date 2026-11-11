<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Pivot kaart × evenement × gebruiker: the kaart of a gebruiker in an evenement (at most one per gebruiker per
 * evenement). actief = the kaart works at this evenement (the dashboard deactivates it here); it is the only
 * actief flag of a kaart.
 * The wallet it pays from is the gebruiker's betaalbron in that evenement, see ToegangService::betaalGroep.
 */
class KaartKoppeling extends Model
{
    protected $table = 'kaart_koppelingen';

    public $timestamps = true;

    protected $fillable = [
        'kaart_id',
        'gebruiker_id',
        'evenement_id',
        'actief',
    ];

    protected $attributes = [
        'actief' => true,
    ];

    protected function casts(): array
    {
        return [
            'actief' => 'boolean',
        ];
    }

    public function kaart(): BelongsTo
    {
        return $this->belongsTo(Kaart::class, 'kaart_id');
    }

    public function gebruiker(): BelongsTo
    {
        return $this->belongsTo(Gebruiker::class, 'gebruiker_id');
    }

    public function evenement(): BelongsTo
    {
        return $this->belongsTo(Evenement::class, 'evenement_id');
    }
}
