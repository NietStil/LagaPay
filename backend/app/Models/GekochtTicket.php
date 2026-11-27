<?php

namespace App\Models;

use App\Services\CodeService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * One bought ticket (a row of gebruiker_ticket): its own QR code, and whether it was used at the entrance.
 *
 * `gebruiker_id` is the holder, `gekocht_door` the buyer (who paid; null on rows added without it, which then
 * count as bought by the holder). Every ticket has a `deel_code`: its own link ({link_url}/t/{deel_code}) that
 * gives exactly this ticket to a friend. The holder can send it while the ticket is unused (kanDelen()), also when
 * they got it from someone else. A friend claiming it becomes the holder and the ticket gets a new QR code and a
 * new deel_code, so the old link stops working and the new holder can pass it on. Every claim is logged in
 * `overdrachten` (from whom, to whom, when). `munten_uitgekeerd`: the included munten were credited.
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
        'deel_code',
        'gebruikt',
        'gebruikt_op',
        'munten_uitgekeerd',
    ];

    protected function casts(): array
    {
        return [
            'gebruikt'          => 'boolean',
            'gebruikt_op'       => 'datetime',
            'munten_uitgekeerd' => 'boolean',
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

    /** Who bought it: `gekocht_door`, or the holder on rows added without it. */
    public function koperId(): int
    {
        return (int) ($this->gekocht_door ?? $this->gebruiker_id);
    }

    /** Can be given to a friend with its link: it wasn't used. */
    public function kanDelen(): bool
    {
        return $this->deel_code !== null && ! $this->gebruikt;
    }

    /** Every claim of this ticket through its link, oldest first. */
    public function overdrachten(): HasMany
    {
        return $this->hasMany(TicketOverdracht::class, 'gekocht_ticket_id')->orderBy('id');
    }

    /** The last claim: who the holder got it from. */
    public function laatsteOverdracht(): HasOne
    {
        return $this->hasOne(TicketOverdracht::class, 'gekocht_ticket_id')->latestOfMany('id');
    }

    /** The link that gives this ticket to a friend. */
    public function deelLink(): ?string
    {
        return $this->deel_code === null ? null : rtrim((string) config('lagapay.link_url'), '/') . '/t/' . $this->deel_code;
    }

    /** A new unguessable code for a ticket link (20 nanoid characters, about 120 bits, like the QR code). */
    public static function nieuweDeelCode(): string
    {
        return CodeService::uniekeCode(static::class, 20, 'deel_code');
    }

    /** The text in the QR code: "LAGAPAY-TICKET:{code}". */
    public function qr(): string
    {
        return self::QR_VOORVOEGSEL . $this->code;
    }

    /** A new unguessable ticket code (20 nanoid characters, about 120 bits). */
    public static function nieuweCode(): string
    {
        return CodeService::uniekeCode(static::class, 20);
    }

    /** The code from scanned QR content ("LAGAPAY-TICKET:{code}") or a typed code. */
    public static function codeUit(string $gescand): string
    {
        $gescand = trim($gescand);

        return str_starts_with($gescand, self::QR_VOORVOEGSEL) ? substr($gescand, strlen(self::QR_VOORVOEGSEL)) : $gescand;
    }
}
