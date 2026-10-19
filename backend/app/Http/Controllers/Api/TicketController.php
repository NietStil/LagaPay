<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Mobiel\DeelnameGeweigerd;
use App\Services\Mobiel\TicketOverdrachtFout;
use App\Services\Mobiel\TicketOverdrachtService;
use App\Services\Mobiel\TicketOverzichtService;
use App\Services\Mobiel\TicketScanFout;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use App\Services\Mobiel\TicketScanService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TicketController extends Controller
{
    public function __construct(
        protected TicketOverzichtService $ticketService,
        protected TicketScanService $scanService,
        protected TicketOverdrachtService $overdrachtService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json($this->ticketService->mijnTickets($request->user()));
    }

    public function evenement(Request $request): JsonResponse
    {
        try {
            $tickets = $this->ticketService->evenementTickets($request->user(), $request->attributes->get('evenement'));
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        }

        return response()->json($tickets);
    }

    /** My bought tickets of this evenement with their QR codes. */
    public function mijnTickets(Request $request): JsonResponse
    {
        return response()->json($this->ticketService->mijnEvenementTickets($request->user(), $request->attributes->get('evenement')));
    }

    /** Puts one of my tickets on offer for a friend (te_geven: true) or takes it back. Answers like mijn-tickets. */
    public function teGeven(Request $request, int $id, int $ticket): JsonResponse
    {
        $validated = $request->validate([
            'te_geven' => ['required', 'boolean'],
        ]);

        $evenement = $request->attributes->get('evenement');

        try {
            $this->overdrachtService->zetTeGeven($request->user(), $evenement, $ticket, (bool) $validated['te_geven']);
        } catch (ModelNotFoundException) {
            return response()->json(['message' => 'Ticket niet gevonden.'], 404);
        } catch (TicketOverdrachtFout $e) {
            return response()->json($e->body(), $e->status);
        }

        return response()->json($this->ticketService->mijnEvenementTickets($request->user(), $evenement));
    }

    /** Opening a buyer's uitnodigingslink: takes one of their tickets on offer (and joins the evenement when allowed). */
    public function accepteer(Request $request, string $code): JsonResponse
    {
        try {
            return response()->json($this->overdrachtService->accepteer($request->user(), $code));
        } catch (ModelNotFoundException) {
            return response()->json(['message' => 'Uitnodiging niet gevonden.'], 404);
        } catch (DeelnameGeweigerd $e) {
            return response()->json($e->body(), 403);
        } catch (TicketOverdrachtFout $e) {
            return response()->json($e->body(), $e->status);
        }
    }

    /** Development only (config lagapay.dev_scan): scans one of my own tickets. Answers like mijn-tickets. */
    public function devScan(Request $request, int $id, int $ticket): JsonResponse
    {
        if (! config('lagapay.dev_scan')) {
            return response()->json(['message' => 'Niet gevonden.'], 404);
        }

        $evenement = $request->attributes->get('evenement');

        try {
            $this->scanService->devScan($request->user(), $evenement, $ticket);
        } catch (ModelNotFoundException) {
            return response()->json(['message' => 'Ticket niet gevonden.'], 404);
        } catch (TicketScanFout $e) {
            return response()->json($e->body(), $e->status);
        }

        return response()->json($this->ticketService->mijnEvenementTickets($request->user(), $evenement));
    }

    /** Scanning a ticket at the entrance (organiser): { code, evenement_id? } → the ticket, now marked as used. */
    public function scan(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code'         => ['required', 'string', 'max:255'],
            'evenement_id' => ['nullable', 'integer'],
        ]);

        try {
            $ticket = $this->scanService->scan(
                $request->user(),
                $validated['code'],
                isset($validated['evenement_id']) ? (int) $validated['evenement_id'] : null,
            );
        } catch (TicketScanFout $e) {
            return response()->json($e->body(), $e->status);
        }

        return response()->json(['ticket' => $ticket]);
    }
}
