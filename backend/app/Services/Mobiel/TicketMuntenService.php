<?php

namespace App\Services\Mobiel;

use App\Models\Evenement;
use App\Models\Gebruiker;
use App\Models\GekochtTicket;
use Illuminate\Support\Facades\DB;

/**
 * The munten included with a ticket go to whoever holds it, once they are a deelnemer of the evenement.
 * A ticket that is on offer for a friend (te_geven) credits nobody until a friend takes it.
 */
class TicketMuntenService {
    public function __construct(
        protected PortemonneeService $portemonnee,
    ) {}

    /**
     * Credits the included munten of my tickets of this evenement that haven't been credited yet, as one
     * "ticket" transactie. Does nothing when I'm not a (non-blocked) deelnemer yet; safe to call any time.
     * Returns the munten credited.
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
                ->where('gebruiker_ticket.te_geven', false)
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
