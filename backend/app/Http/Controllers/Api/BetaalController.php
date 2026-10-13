<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ticket;
use App\Services\Mobiel\BetaalService;
use App\Services\Mobiel\TicketAlGekocht;
use App\Services\Mobiel\TicketOverzichtService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Opwaarderen and tickets kopen as test betalingen (no Mollie yet), see BetaalService. */
class BetaalController extends Controller
{
    public function __construct(
        protected BetaalService $betaalService,
        protected TicketOverzichtService $ticketService,
    ) {}

    public function opwaarderen(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'munten' => ['required', 'integer', 'min:1', 'max:500'],
            'voor'   => ['required', 'string', Rule::in(['persoonlijk', 'groep'])],
        ]);

        try {
            $saldo = $this->betaalService->opwaarderen(
                $request->user(),
                $request->attributes->get('evenement'),
                (int) $validated['munten'],
                $validated['voor'],
            );
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        }

        return response()->json(['saldo' => $saldo]);
    }

    /** Responds with the tickets screen data (GET /evenementen/{id}/tickets), so the app can show the new state. */
    public function ticketKopen(Request $request, int $id, int $ticket): JsonResponse
    {
        $evenement = $request->attributes->get('evenement');
        $ticket = Ticket::where('evenement_id', $evenement->id)->find($ticket);

        if (! $ticket) {
            return response()->json(['message' => 'Ticket niet gevonden.'], 404);
        }

        try {
            $this->betaalService->koopTicket($request->user(), $evenement, $ticket);
        } catch (TicketAlGekocht $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        }

        return response()->json($this->ticketService->evenementTickets($request->user(), $evenement));
    }
}
