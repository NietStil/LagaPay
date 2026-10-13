<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Controller;
use App\Models\Evenement;
use App\Services\Evenementen\ProductenService;
use App\Services\Evenementen\EvenementService;
use App\Services\Evenementen\GroepenService;
use App\Services\Evenementen\DeelnemersService;
use App\Services\Evenementen\TicketService;
use App\Services\Evenementen\TransactieService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
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

    public function create(Request $request) {
        $validated = $request->validate([
            'naam'                => 'required|string|max:255',
            'start_datum'         => 'required|date',
            'eind_datum'          => 'required|date|after_or_equal:start_datum',
            'telefoon_betaling'   => 'required|boolean',
            'munten_terugstorten' => 'required|boolean',
            'heeft_tickets'       => 'required|boolean',
            'munt_prijs'          => 'required|numeric|min:0|max:99999999.99',
        ]);

        try {
            $evenement = $this->evenementService->createEvenement(Auth::id(), $validated);
            return redirect()->route('show', $evenement->id)->with('success', 'Evenement succesvol aangemaakt.');
        } catch (\Throwable $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

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

    public function destroy($id) {
        $evenement = Evenement::findOrFail($id);
        $gebruiker = Auth::user();

        if ($evenement->gebruiker !== $gebruiker->id && $gebruiker->rol !== 'admin') {
            abort(403, 'Je mag dit evenement niet verwijderen.');
        }

        try {
            $this->evenementService->deleteEvenement($evenement->id);
            return redirect('/dashboard/evenementen')->with('success', 'Evenement succesvol verwijderd.');
        } catch (\Throwable $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
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
