<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Mobiel\Exceptions\TerminalFout;
use App\Services\Mobiel\Exceptions\TicketScanFout;
use App\Services\Mobiel\TerminalService;
use App\Services\Mobiel\TicketScanService;
use App\Services\Mobiel\Weergave;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Bar terminal of an evenement: joining with the terminal_code, producten, afrekenen and the sales. */
class TerminalController extends Controller
{
    public function __construct(
        protected TerminalService $terminalService,
        protected TicketScanService $scanService,
        protected Weergave $weergave,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json(['terminals' => $this->terminalService->mijnTerminals($request->user())]);
    }

    public function koppelen(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'size:15'],
        ]);

        try {
            $evenement = $this->terminalService->koppel($request->user(), $validated['code']);
        } catch (ModelNotFoundException) {
            return response()->json(['message' => 'Terminalcode niet gevonden.'], 404);
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        }

        return response()->json(['evenement' => $this->weergave->evenementBasis($evenement)]);
    }

    public function show(Request $request): JsonResponse
    {
        return response()->json($this->terminalService->overzicht($request->attributes->get('evenement')));
    }

    public function verlaten(Request $request): JsonResponse
    {
        $this->terminalService->verlaat($request->user(), $request->attributes->get('evenement'));

        return response()->json(['message' => 'Terminal verlaten.']);
    }

    /** { kaart_uid, producten: [{ id, aantal }] } → { transactie, saldo } (saldo left on the paying wallet). */
    public function afrekenen(Request $request): JsonResponse
    {
        $validated = $request->validate(['kaart_uid' => ['required', 'string', 'max:64']]);
        $bestelling = $this->bestelling($request);
        $evenement = $request->attributes->get('evenement');

        return $this->reken(fn () => $this->terminalService->afrekenen($evenement, trim($validated['kaart_uid']), $bestelling));
    }

    /**
     * Development only (config lagapay.dev_scan, otherwise 404): { producten } → like afrekenen, paid by the
     * logged-in account (from its betaalbron); the saldo isn't checked (see TerminalService::devAfrekenen).
     */
    public function devAfrekenen(Request $request): JsonResponse
    {
        if (! config('lagapay.dev_scan')) {
            return response()->json(['message' => 'Niet gevonden.'], 404);
        }

        $bestelling = $this->bestelling($request);
        $evenement = $request->attributes->get('evenement');

        return $this->reken(fn () => $this->terminalService->devAfrekenen($evenement, $request->user(), $bestelling));
    }

    /** producten: [{ id, aantal }] → [product id => aantal]. */
    protected function bestelling(Request $request): array
    {
        $validated = $request->validate([
            'producten'          => ['required', 'array', 'min:1', 'max:50'],
            'producten.*.id'     => ['required', 'integer', 'distinct'],
            'producten.*.aantal' => ['required', 'integer', 'min:1', 'max:99'],
        ]);

        $bestelling = [];
        foreach ($validated['producten'] as $regel) {
            $bestelling[(int) $regel['id']] = (int) $regel['aantal'];
        }

        return $bestelling;
    }

    /** Runs an afrekening and turns its refusals into responses. */
    protected function reken(callable $afrekening): JsonResponse
    {
        try {
            return response()->json($afrekening());
        } catch (ModelNotFoundException) {
            return response()->json(['message' => 'Product niet gevonden.'], 404);
        } catch (TerminalFout $e) {
            return response()->json(['message' => $e->getMessage()], $e->status);
        }
    }

    public function transacties(Request $request): JsonResponse
    {
        return response()->json([
            'transacties' => $this->terminalService->transacties($request->attributes->get('evenement')),
        ]);
    }

    /** Scan tab: a ticket QR code of this evenement at the entrance, like POST /tickets/scan. */
    public function scan(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:255'],
        ]);

        try {
            $ticket = $this->scanService->scan(
                $request->user(),
                $validated['code'],
                $request->attributes->get('evenement')->id,
            );
        } catch (TicketScanFout $e) {
            return response()->json($e->body(), $e->status);
        }

        return response()->json(['ticket' => $ticket]);
    }
}
