<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Transactie extends Model
{
    use HasFactory;

    protected $table = 'Transacties';

    public $timestamps = false;

    protected $fillable = [
        'gebruiker_id',
        'event_id',
        'groep_id',
        'hoeveelheid',
        'type',
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

    public function munten(): HasMany
    {
        return $this->hasMany(Munt::class, 'laatste_transactie');
    }
}
