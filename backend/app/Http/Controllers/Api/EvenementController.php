<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Evenement;
use App\Services\Mobiel\DeelnameGeweigerd;
use App\Services\Mobiel\DeelnameService;
use App\Services\Mobiel\EvenementOverzichtService;
use App\Services\Mobiel\Weergave;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class EvenementController extends Controller
{
    public function __construct(
        protected EvenementOverzichtService $overzichtService,
        protected DeelnameService $deelnameService,
        protected Weergave $weergave,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'evenementen' => $this->overzichtService->evenementen($request->user()),
        ]);
    }

    public function show(Request $request): JsonResponse
    {
        return response()->json(
            $this->overzichtService->overzicht($request->user(), $request->attributes->get('evenement'))
        );
    }

    public function transacties(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'filter' => ['nullable', 'string', Rule::in(EvenementOverzichtService::FILTERS)],
        ]);

        return response()->json([
            'transacties' => $this->overzichtService->transacties(
                $request->user(),
                $request->attributes->get('evenement'),
                $validated['filter'] ?? 'alles',
            ),
        ]);
    }

    /** Opening an evenement link (QR code): the evenement and my deelname status, without joining. */
    public function bekijk(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'size:15'],
        ]);

        try {
            return response()->json($this->deelnameService->bekijk($request->user(), $validated['code']));
        } catch (ModelNotFoundException) {
            return response()->json(['message' => 'Evenement niet gevonden.'], 404);
        } catch (DeelnameGeweigerd $e) {
            return response()->json($e->body(), 403);
        }
    }

    public function join(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'size:15'],
        ]);

        $evenement = Evenement::where('code', $validated['code'])->first();

        if (! $evenement) {
            return response()->json(['message' => 'Evenement niet gevonden.'], 404);
        }

        return $this->deelnemenAan($request, $evenement);
    }

    /** Joining from the tickets screen, once I have a ticket and the evenement has started. */
    public function deelnemen(Request $request): JsonResponse
    {
        return $this->deelnemenAan($request, $request->attributes->get('evenement'));
    }

    protected function deelnemenAan(Request $request, Evenement $evenement): JsonResponse
    {
        try {
            $this->deelnameService->deelnemen($request->user(), $evenement);
        } catch (DeelnameGeweigerd $e) {
            return response()->json($e->body(), 403);
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        }

        return response()->json(['evenement' => $this->weergave->evenementBasis($evenement)]);
    }
}
