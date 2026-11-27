<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Mobiel\Exceptions\DeelnameGeweigerd;
use App\Services\Mobiel\Exceptions\TicketOverdrachtFout;
use App\Services\Mobiel\Exceptions\TicketScanFout;
use App\Services\Mobiel\TicketOverdrachtService;
use App\Services\Mobiel\TicketOverzichtService;
use App\Services\Mobiel\TicketScanService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

class TicketController extends Controller
{
    /** Failed ticket link attempts per gebruiker before 429 (see beperkt()). */
    protected const MAX_MISLUKT = 3;

    /** How long that lasts, counted from the first failure. */
    protected const BLOKKADE_SECONDEN = 600;

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

    /** Opening a ticket link, before claiming: which ticket, from whom, and whether I can claim it. */
    public function uitnodiging(Request $request, string $code): JsonResponse
    {
        return $this->beperkt($request, function () use ($request, $code) {
            try {
                return response()->json($this->overdrachtService->voorbeeld($request->user(), $code));
            } catch (ModelNotFoundException) {
                return response()->json(['message' => 'Deze link werkt niet (meer).'], 404);
            }
        });
    }

    /** Claiming the ticket of a ticket link (and joining the evenement when allowed). */
    public function accepteer(Request $request, string $code): JsonResponse
    {
        return $this->beperkt($request, function () use ($request, $code) {
            try {
                return response()->json($this->overdrachtService->accepteer($request->user(), $code));
            } catch (ModelNotFoundException) {
                return response()->json(['message' => 'Deze link werkt niet (meer).'], 404);
            } catch (DeelnameGeweigerd $e) {
                return response()->json($e->body(), 403);
            } catch (TicketOverdrachtFout $e) {
                return response()->json($e->body(), $e->status);
            }
        });
    }

    /**
     * Ticket links are limited per gebruiker: after MAX_MISLUKT failed attempts (unknown link, refused claim) on the
     * preview or the claim, both answer 429 until BLOKKADE_SECONDEN after the first failure. A claim clears the count.
     *
     * @param  callable(): JsonResponse  $poging
     */
    protected function beperkt(Request $request, callable $poging): JsonResponse
    {
        $sleutel = 'ticket-link:' . $request->user()->id;

        if (RateLimiter::tooManyAttempts($sleutel, self::MAX_MISLUKT)) {
            $seconden = RateLimiter::availableIn($sleutel);
            $minuten = max(1, (int) ceil($seconden / 60));

            return response()
                ->json(['message' => 'Te veel mislukte pogingen. Probeer het over ' . $minuten . ' ' . ($minuten === 1 ? 'minuut' : 'minuten') . ' opnieuw.'], 429)
                ->header('Retry-After', (string) $seconden);
        }

        $response = $poging();

        if ($response->getStatusCode() >= 400) {
            RateLimiter::hit($sleutel, self::BLOKKADE_SECONDEN);
        } elseif (($response->getData(true)['resultaat'] ?? null) === 'gekregen') {
            RateLimiter::clear($sleutel);
        }

        return $response;
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
