<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KaartKoppeling extends Model
{
    public const SOORT_PERSOONLIJK = 'persoonlijk';
    public const SOORT_GROEP = 'groep';

    protected $table = 'kaart_koppelingen';

    public $timestamps = true;

    protected $fillable = [
        'kaart_id',
        'gebruiker_id',
        'evenement_id',
        'groep_id',
        'soort',
    ];

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

    public function groep(): BelongsTo
    {
        return $this->belongsTo(Groep::class, 'groep_id');
    }
}
