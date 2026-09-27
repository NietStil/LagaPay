<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Munt extends Model
{
    use HasFactory;

    protected $table = 'Munten';

    public $timestamps = false;

    protected $fillable = [
        'gebruiker_id',
        'event_id',
        'groep_id',
        'hoeveelheid',
        'laatste_transactie',
    ];

    protected function casts(): array
    {
        return [
            'hoeveelheid' => 'integer',
        ];
    }

    public function gebruiker(): BelongsTo
    {
        return $this->belongsTo(Gebruiker::class, 'gebruiker_id');
    }

    public function evenement(): BelongsTo
    {
        return $this->belongsTo(Evenement::class, 'event_id');
    }

    public function groep(): BelongsTo
    {
        return $this->belongsTo(Groep::class, 'groep_id');
    }

    public function laatsteTransactie(): BelongsTo
    {
        return $this->belongsTo(Transactie::class, 'laatste_transactie');
    }
}
