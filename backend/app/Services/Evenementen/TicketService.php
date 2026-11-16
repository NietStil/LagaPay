<?php

namespace App\Services\Evenementen;

use App\Models\Evenement;
use App\Models\Gebruiker;
use App\Models\Ticket;
use Illuminate\Support\Facades\DB;

class TicketService {
    public function addTicket($evenementId, array $data) {
        $evenement = Evenement::findOrFail($evenementId);

        if (! $evenement->heeft_tickets) {
            throw new \DomainException('Tickets zijn niet ingeschakeld voor dit evenement.');
        }

        return Ticket::create([
            'evenement_id' => $evenementId,
            'naam'         => $data['naam'],
            'prijs'        => $data['prijs'] ?? 0.00,
            'munten'       => $data['munten'] ?? null,
            'capaciteit'   => $data['capaciteit'] ?? null,
        ]);
    }

    /**
     * Adds $extra tickets to the capaciteit of a limited ticket type of this evenement.
     *
     * @throws \DomainException the ticket type is onbeperkt
     */
    public function voegCapaciteitToe($evenementId, $ticketId, int $extra): Ticket {
        $ticket = Ticket::where('evenement_id', $evenementId)->findOrFail($ticketId);

        if ($ticket->capaciteit === null) {
            throw new \DomainException('Dit ticket type heeft geen maximum, je hoeft geen tickets toe te voegen.');
        }

        $ticket->increment('capaciteit', $extra);

        return $ticket;
    }

    public function koopTicket($ticketId, $gebruikerId) {
        DB::transaction(function () use ($ticketId, $gebruikerId) {
            $ticket = Ticket::findOrFail($ticketId);

            app(DeelnemersService::class)->deelnemerToevoegen($ticket->evenement_id, $gebruikerId);

            Gebruiker::findOrFail($gebruikerId)->tickets()->syncWithoutDetaching([$ticket->id]);
        });
    }

    public function removeTicket($ticketId) {
        $ticket = Ticket::findOrFail($ticketId);
        return $ticket->delete();
    }
}
