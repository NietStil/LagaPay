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
        ]);

        try {
            $this->ticketService->addTicket($evenement_id, $request->all());
            return back()->with('success', 'Ticket succesvol toegevoegd.');
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
