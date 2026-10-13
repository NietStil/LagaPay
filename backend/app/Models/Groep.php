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

    /**
     * @var \Illuminate\Support\HigherOrderCollectionProxy|mixed
     */
    protected $table = 'groepen';

    public $timestamps = true;

    protected $fillable = [
        'naam',
        'evenement_id',
        'code',
        'created_at',
        'updated_at',
    ];

    public function evenement(): BelongsTo
    {
        return $this->belongsTo(Evenement::class, 'evenement_id');
    }

    public function gebruikers(): BelongsToMany
    {
        return $this->belongsToMany(Gebruiker::class, 'gebruiker_groep', 'groep_id', 'gebruiker_id')
            ->withPivot('created_at')
            ->withTimestamps();
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
