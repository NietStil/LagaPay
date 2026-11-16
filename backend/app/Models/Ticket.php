<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Ticket extends Model
{
    use HasFactory;

    protected $table = 'tickets';

    public $timestamps = false;

    protected $fillable = [
        'evenement_id',
        'prijs',
        'naam',
        'munten',
        'capaciteit',
    ];

    protected function casts(): array
    {
        return [
            'prijs' => 'decimal:2',
            'munten' => 'integer',
            'capaciteit' => 'integer',
        ];
    }

    /** How many are still for sale; null = onbeperkt. Pass $verkocht when already counted (e.g. withCount). */
    public function beschikbaar(?int $verkocht = null): ?int
    {
        if ($this->capaciteit === null) {
            return null;
        }

        $verkocht ??= $this->gebruikers()->count();

        return max(0, $this->capaciteit - $verkocht);
    }

    public function evenement(): BelongsTo
    {
        return $this->belongsTo(Evenement::class, 'evenement_id');
    }

    public function gebruikers()
    {
        return $this->belongsToMany(Gebruiker::class, 'gebruiker_ticket', 'ticket_id', 'gebruiker_id');
    }
}
