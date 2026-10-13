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
        ]);
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
