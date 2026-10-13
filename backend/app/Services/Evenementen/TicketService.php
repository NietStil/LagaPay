<?php

namespace App\Services\Evenementen;

use App\Models\Ticket;

class TicketService {
    public function addTicket($evenementId, array $data) {
        return Ticket::create([
            'evenement_id' => $evenementId,
            'naam'         => $data['naam'],
            'prijs'        => $data['prijs'] ?? 0.00,
            'munten'       => $data['munten'] ?? null,
        ]);
    }

    public function removeTicket($ticketId) {
        $ticket = Ticket::findOrFail($ticketId);
        return $ticket->delete();
    }
}
