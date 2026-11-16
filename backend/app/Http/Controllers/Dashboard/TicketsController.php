<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Controller;
use App\Services\Evenementen\TicketService;
use Illuminate\Http\Request;

class TicketsController extends Controller {
    public function __construct(
        protected TicketService $ticketService
    ) {}

    public function create(Request $request, $evenement_id) {
        $request->validate([
            'naam'   => 'required|string|max:255',
            'prijs'  => 'required|numeric|min:0',
            'munten' => 'required|integer|min:0',
            'capaciteit' => 'nullable|integer|min:1',
        ]);

        try {
            $this->ticketService->addTicket($evenement_id, $request->all());
            return back()->with('success', 'Ticket succesvol toegevoegd.');
        } catch (\Throwable $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    /** Raises the capaciteit of a limited ticket type: { extra }. */
    public function capaciteitToevoegen(Request $request, $evenement_id, $id) {
        $validated = $request->validate([
            'extra' => 'required|integer|min:1|max:100000',
        ]);

        try {
            $this->ticketService->voegCapaciteitToe($evenement_id, $id, (int) $validated['extra']);
            return back()->with('success', 'Tickets toegevoegd.');
        } catch (\Throwable $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function delete($evenement_id, $id) {
        try {
            $this->ticketService->removeTicket($id);
            return back()->with('success', 'Ticket succesvol verwijderd.');
        } catch (\Throwable $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }
}
