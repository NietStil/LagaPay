<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Groep extends Model
{
    use HasFactory;

    protected $table = 'Groepen';

    public $timestamps = false;

    protected $fillable = [
        'naam',
        'event_id',
        'code',
    ];

    public function evenement(): BelongsTo
    {
        return $this->belongsTo(Evenement::class, 'event_id');
    }

    public function gebruikers(): BelongsToMany
    {
        return $this->belongsToMany(Gebruiker::class, 'Gebruiker_Groep', 'groep_id', 'gebruiker_id');
    }

    public function transacties(): HasMany
    {
        return $this->hasMany(Transactie::class, 'groep_id');
    }

    public function munten(): HasMany
    {
        return $this->hasMany(Munt::class, 'groep_id');
    }
}
