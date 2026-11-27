<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** One claim of a ticket through its link: from whom (`van`) to whom (`naar`), and when (`created_at`). */
class TicketOverdracht extends Model
{
    protected $table = 'ticket_overdrachten';

    public const UPDATED_AT = null;

    protected $fillable = [
        'gekocht_ticket_id',
        'van_gebruiker_id',
        'naar_gebruiker_id',
    ];

    public function gekochtTicket(): BelongsTo
    {
        return $this->belongsTo(GekochtTicket::class, 'gekocht_ticket_id');
    }

    public function van(): BelongsTo
    {
        return $this->belongsTo(Gebruiker::class, 'van_gebruiker_id');
    }

    public function naar(): BelongsTo
    {
        return $this->belongsTo(Gebruiker::class, 'naar_gebruiker_id');
    }
}
