<?php

namespace App\Models;

use Hidehalo\Nanoid\Client;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * The link with which a buyer hands tickets they put on offer (gebruiker_ticket.te_geven) to friends:
 * {link_url}/t/{code}. One per buyer per evenement.
 */
class TicketUitnodiging extends Model
{
    protected $table = 'ticket_uitnodigingen';

    protected $fillable = [
        'gebruiker_id',
        'evenement_id',
        'code',
    ];

    public function gebruiker(): BelongsTo
    {
        return $this->belongsTo(Gebruiker::class, 'gebruiker_id');
    }

    public function evenement(): BelongsTo
    {
        return $this->belongsTo(Evenement::class, 'evenement_id');
    }

    /** The buyer's uitnodiging for this evenement, created on first use. */
    public static function voor(int $gebruikerId, int $evenementId): self
    {
        return static::firstOrCreate(
            ['gebruiker_id' => $gebruikerId, 'evenement_id' => $evenementId],
            ['code' => static::nieuweCode()],
        );
    }

    public function link(): string
    {
        return rtrim((string) config('lagapay.link_url'), '/') . '/t/' . $this->code;
    }

    /** 12 nanoid characters ([A-Za-z0-9_-]); the same alphabet as the other codes. */
    protected static function nieuweCode(): string
    {
        do {
            $code = (new Client())->generateId(12);
        } while (static::where('code', $code)->exists());

        return $code;
    }
}
