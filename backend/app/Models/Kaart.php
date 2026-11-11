<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Every kaart (NFC kaart or polsband) of a gebruiker. It is linked to evenementen only via kaart_koppelingen.
 * The type only says which kaart can be my persoonlijke kaart (the one I can link to any evenement in the app);
 * once linked to an evenement every kaart works the same.
 */
class Kaart extends Model
{
    use HasFactory;

    public const TYPE_PERSOONLIJK = 'persoonlijk';
    public const TYPE_TIJDELIJK = 'tijdelijk';

    protected $table = 'kaarten';

    public $timestamps = false;

    protected $fillable = [
        'uid',
        'type',
        'gebruiker_id',
    ];

    public function gebruiker(): BelongsTo
    {
        return $this->belongsTo(Gebruiker::class, 'gebruiker_id');
    }

    public function koppelingen(): HasMany
    {
        return $this->hasMany(KaartKoppeling::class, 'kaart_id');
    }

    public function evenementen(): BelongsToMany
    {
        return $this->belongsToMany(Evenement::class, 'kaart_koppelingen', 'kaart_id', 'evenement_id')
            ->withPivot('gebruiker_id', 'actief')
            ->withTimestamps();
    }

    public function isPersoonlijk(): bool
    {
        return $this->type === self::TYPE_PERSOONLIJK;
    }
}
