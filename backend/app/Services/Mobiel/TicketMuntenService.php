<?php

namespace App\Services\Mobiel;

use App\Models\Evenement;
use App\Models\Gebruiker;
use App\Models\GekochtTicket;
use Illuminate\Support\Facades\DB;

/**
 * The munten included with a ticket go to whoever holds it when it is scanned at the entrance (once they are a
 * deelnemer of the evenement), one ticket at a time: buying or receiving a ticket credits nothing.
 */
class TicketMuntenService {
    public function __construct(
        protected PortemonneeService $portemonnee,
    ) {}

    /**
     * Credits the included munten of my scanned tickets of this evenement that haven't been credited yet, as one
     * "ticket" transactie. Unscanned tickets wait for their scan. Does nothing when I'm not a (non-blocked)
     * deelnemer yet (a holder who joins later still gets them); safe to call any time. Returns the munten credited.
     */
    public function uitkeren(Gebruiker $gebruiker, Evenement $evenement): int {
        $isDeelnemer = DB::table('gebruiker_evenement')
            ->where('gebruiker_id', $gebruiker->id)
            ->where('evenement_id', $evenement->id)
            ->where('geblokkeerd', false)
            ->exists();

        if (! $isDeelnemer) {
            return 0;
        }

        return DB::transaction(function () use ($gebruiker, $evenement) {
            $tickets = GekochtTicket::query()
                ->select('gebruiker_ticket.*')
                ->with('ticket')
                ->join('tickets', 'tickets.id', '=', 'gebruiker_ticket.ticket_id')
                ->where('gebruiker_ticket.gebruiker_id', $gebruiker->id)
                ->where('tickets.evenement_id', $evenement->id)
                ->where('gebruiker_ticket.gebruikt', true)
                ->where('gebruiker_ticket.munten_uitgekeerd', false)
                ->lockForUpdate()
                ->get();

            if ($tickets->isEmpty()) {
                return 0;
            }

            GekochtTicket::whereIn('id', $tickets->pluck('id'))->update(['munten_uitgekeerd' => true]);

            $munten = (int) $tickets->sum(fn (GekochtTicket $gekocht) => (int) $gekocht->ticket->munten);

            if ($munten > 0) {
                $this->portemonnee->boek($gebruiker, $evenement, null, 'ticket', $munten);
            }

            return $munten;
        });
    }
}
