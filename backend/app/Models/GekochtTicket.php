<?php

namespace App\Models;

use Hidehalo\Nanoid\Client;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One bought ticket (a row of gebruiker_ticket): its own QR code, and whether it was used at the entrance.
 *
 * `gebruiker_id` is the holder. The buyer (`gekocht_door`, null on rows from before ticket transfers) can put
 * the ticket on offer (`te_geven`); a friend taking it through the buyer's uitnodigingslink becomes the holder
 * (`overgedragen_op`) and gets a new code. `munten_uitgekeerd`: the included munten were credited to the holder.
 */
class GekochtTicket extends Model
{
    /** Start of the QR content, so scanners (and the app) can tell a ticket from a join link. */
    public const QR_VOORVOEGSEL = 'LAGAPAY-TICKET:';

    protected $table = 'gebruiker_ticket';

    protected $fillable = [
        'gebruiker_id',
        'ticket_id',
        'gekocht_door',
        'code',
        'gebruikt',
        'gebruikt_op',
        'te_geven',
        'munten_uitgekeerd',
        'overgedragen_op',
    ];

    protected function casts(): array
    {
        return [
            'gebruikt'          => 'boolean',
            'gebruikt_op'       => 'datetime',
            'te_geven'          => 'boolean',
            'munten_uitgekeerd' => 'boolean',
            'overgedragen_op'   => 'datetime',
        ];
    }

    public function gebruiker(): BelongsTo
    {
        return $this->belongsTo(Gebruiker::class, 'gebruiker_id');
    }

    /** Who paid for the ticket (the holder, unless it was given away). */
    public function gekochtDoor(): BelongsTo
    {
        return $this->belongsTo(Gebruiker::class, 'gekocht_door');
    }

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class, 'ticket_id');
    }

    /** The text in the QR code: "LAGAPAY-TICKET:{code}". */
    public function qr(): string
    {
        return self::QR_VOORVOEGSEL . $this->code;
    }

    /** A new unguessable ticket code (20 nanoid characters, about 120 bits). */
    public static function nieuweCode(): string
    {
        do {
            $code = (new Client())->generateId(20);
        } while (static::where('code', $code)->exists());

        return $code;
    }

    /** The code from scanned QR content ("LAGAPAY-TICKET:{code}") or a typed code. */
    public static function codeUit(string $gescand): string
    {
        $gescand = trim($gescand);

        return str_starts_with($gescand, self::QR_VOORVOEGSEL) ? substr($gescand, strlen(self::QR_VOORVOEGSEL)) : $gescand;
    }
}
