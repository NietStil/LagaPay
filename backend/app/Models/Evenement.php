<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Evenement extends Model
{
    use HasFactory;

    protected $table = 'Evenementen';

    public $timestamps = false;

    protected $fillable = [
        'naam',
        'open',
        'start_datum',
        'eind_datum',
        'telefoon_betaling',
        'munten_terugstorten',
        'code',
    ];

    protected function casts(): array
    {
        return [
            'open' => 'boolean',
            'telefoon_betaling' => 'boolean',
            'munten_terugstorten' => 'boolean',
            'start_datum' => 'datetime',
            'eind_datum' => 'datetime',
        ];
    }

    public function groepen(): HasMany
    {
        return $this->hasMany(Groep::class, 'event_id');
    }

    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class, 'event_id');
    }

    public function producten(): HasMany
    {
        return $this->hasMany(Product::class, 'event_id');
    }

    public function kaarten(): HasMany
    {
        return $this->hasMany(Kaart::class, 'event_id');
    }

    public function opwaarderingen(): HasMany
    {
        return $this->hasMany(Opwaardering::class, 'event_id');
    }

    public function transacties(): HasMany
    {
        return $this->hasMany(Transactie::class, 'event_id');
    }

    public function munten(): HasMany
    {
        return $this->hasMany(Munt::class, 'event_id');
    }
}
