<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class Gebruiker extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $table = 'Gebruikers';

    public $timestamps = false;

    protected $fillable = [
        'voornaam',
        'achternaam',
        'tussenvoegsels',
        'email',
        'wachtwoord',
        'google_id',
    ];

    protected $hidden = [
        'wachtwoord',
    ];

    public function getAuthPassword()
    {
        return $this->wachtwoord;
    }

    public function getNameAttribute(): string
    {
        $parts = array_filter([$this->voornaam, $this->tussenvoegsels, $this->achternaam]);
        return implode(' ', $parts);
    }

    public function kaarten(): HasMany
    {
        return $this->hasMany(Kaart::class, 'gebruiker_id');
    }

    public function groepen(): BelongsToMany
    {
        return $this->belongsToMany(Groep::class, 'Gebruiker_Groep', 'gebruiker_id', 'groep_id');
    }

    public function opwaarderingen(): HasMany
    {
        return $this->hasMany(Opwaardering::class, 'gebruiker_id');
    }

    public function transacties(): HasMany
    {
        return $this->hasMany(Transactie::class, 'gebruiker_id');
    }

    public function munten(): HasMany
    {
        return $this->hasMany(Munt::class, 'gebruiker_id');
    }
}
