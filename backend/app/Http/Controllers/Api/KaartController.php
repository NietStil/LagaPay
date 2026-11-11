<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Mobiel\KaartService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class KaartController extends Controller
{
    public function __construct(
        protected KaartService $kaartService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json($this->kaartService->profielKaarten($request->user()));
    }

    public function evenement(Request $request): JsonResponse
    {
        return response()->json(
            $this->kaartService->evenementKaarten($request->user(), $request->attributes->get('evenement'))
        );
    }

    /** { kaart_id } (one of my persoonlijke kaarten) → the kaarten of this evenement, see evenement(). */
    public function permanent(Request $request): JsonResponse
    {
        $validated = $request->validate(['kaart_id' => ['required', 'integer']]);

        try {
            $kaarten = $this->kaartService->koppelPersoonlijk(
                $request->user(),
                $request->attributes->get('evenement'),
                (int) $validated['kaart_id'],
            );
        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => $e->getMessage()], 404);
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        }

        return response()->json($kaarten);
    }
}
