<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Mobiel\BetaalService;
use App\Services\Mobiel\TicketOverzichtService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

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

    /**
     * Buys several tickets in one go: { tickets: [{ id, aantal, voor_vrienden? }] }, where voor_vrienden of the
     * aantal are put on offer for friends. Responds with the tickets screen data (GET /evenementen/{id}/tickets),
     * so the app can show the new state.
     */
    public function ticketsKopen(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tickets'          => ['required', 'array', 'min:1', 'max:20'],
            'tickets.*.id'     => ['required', 'integer', 'distinct'],
            'tickets.*.aantal' => ['required', 'integer', 'min:1', 'max:10'],
            'tickets.*.voor_vrienden' => ['nullable', 'integer', 'min:0', 'max:10'],
        ]);

        $bestelling = [];
        foreach ($validated['tickets'] as $i => $regel) {
            $voorVrienden = (int) ($regel['voor_vrienden'] ?? 0);

            if ($voorVrienden > (int) $regel['aantal']) {
                throw ValidationException::withMessages([
                    "tickets.{$i}.voor_vrienden" => 'Je kunt niet meer tickets aan vrienden geven dan je koopt.',
                ]);
            }

            $bestelling[(int) $regel['id']] = ['aantal' => (int) $regel['aantal'], 'voor_vrienden' => $voorVrienden];
        }

        $evenement = $request->attributes->get('evenement');

        try {
            $this->betaalService->koopTickets($request->user(), $evenement, $bestelling);
        } catch (ModelNotFoundException) {
            return response()->json(['message' => 'Ticket niet gevonden.'], 404);
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        }

        return response()->json($this->ticketService->evenementTickets($request->user(), $evenement));
    }
}
