<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Controller;
use App\Services\Evenementen\ProductenService;
use App\Services\Evenementen\EvenementService;
use App\Services\Evenementen\GroepenService;
use App\Services\Evenementen\DeelnemersService;
use App\Services\Evenementen\TicketService;
use App\Services\Evenementen\TransactieService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class EvenementController extends Controller {

    public function __construct(
        protected ProductenService $productService,
        protected EvenementService $evenementService,
        protected GroepenService $groepenService,
        protected DeelnemersService $deelnemersService,
        protected TicketService $ticketService,
        protected TransactieService $transactieService,
    ) {}

    public function show(Request $request, $id) {
        $evenement = $this->evenementService->getEvenementen($id);

        $tab = $request->query('tab', 'evenement');

        $groepen = $tab === 'groepen'
            ? $this->groepenService->getGroepen($id, $request)
            : null;

        $groep_transacties = $tab === 'groepen'
            ? $this->transactieService->evenementGroepTransacties($evenement->id)
            : null;

        $deelnemers = $tab === 'deelnemers'
            ? $this->deelnemersService->getDeelnemers($id, $request)
            : null;

        $deelnemer_transacties = $tab === 'deelnemers'
            ? $this->transactieService->evenementGebruikerTransacties($id, $deelnemers)
            : null;

        $producten_verkoop = ($tab === 'evenement' || $tab === 'producten')
            ? $this->productService->getProductVerkoopPerUur($evenement->id)
            : null;

        return Inertia::render('Layouts/EvenementenLayout', [
            'evenement'  => $evenement,
            'groepen'    => $groepen,
            'deelnemers' => $deelnemers,
            'deelnemer_transacties' => $deelnemer_transacties,
            'groep_transacties' => $groep_transacties,
            'producten_verkoop' => $producten_verkoop,
        ]);
    }

    public function addTicket(Request $request, $evenement_id) {
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

    public function removeTicket($evenement_id, $id) {
        try {
            $this->ticketService->removeTicket($id);
            return back()->with('success', 'Ticket succesvol verwijderd.');
        } catch (\Throwable $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }
}
