<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Evenement extends Model
{
    use HasFactory;

    protected $table = 'evenementen';

    public $timestamps = false;

    protected $fillable = [
        'naam',
        'gebruiker',
        'open',
        'start_datum',
        'eind_datum',
        'telefoon_betaling',
        'munten_terugstorten',
        'heeft_tickets',
        'munt_prijs',
        'code',
    ];

    protected function casts(): array
    {
        return [
            'open' => 'boolean',
            'telefoon_betaling' => 'boolean',
            'munten_terugstorten' => 'boolean',
            'heeft_tickets' => 'boolean',
            'munt_prijs' => 'decimal:2',
            'start_datum' => 'datetime',
            'eind_datum' => 'datetime',
        ];
    }

    public function deelnemers(): BelongsToMany
    {
        return $this->belongsToMany(Gebruiker::class, 'gebruiker_evenement', 'evenement_id', 'gebruiker_id')
            ->withPivot('geblokkeerd')
            ->withTimestamps();
    }

    public function groepen(): HasMany
    {
        return $this->hasMany(Groep::class, 'evenement_id');
    }

    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class, 'evenement_id');
    }

    public function producten(): HasMany
    {
        return $this->hasMany(Product::class, 'evenement_id');
    }

    public function kaarten(): HasMany
    {
        return $this->hasMany(Kaart::class, 'evenement_id');
    }

    public function opwaarderingen(): HasMany
    {
        return $this->hasMany(Opwaardering::class, 'evenement_id');
    }

    public function transacties(): HasMany
    {
        return $this->hasMany(Transactie::class, 'evenement_id');
    }

    public function munten(): HasMany
    {
        return $this->hasMany(Munt::class, 'evenement_id');
    }
}
