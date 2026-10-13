<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Mobiel\KaartService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

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

    public function permanent(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'soort' => ['required', 'string', Rule::in(KaartService::SOORTEN)],
        ]);

        try {
            $kaarten = $this->kaartService->koppelPermanent(
                $request->user(),
                $request->attributes->get('evenement'),
                $validated['soort'],
            );
        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => $e->getMessage()], 404);
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        }

        return response()->json($kaarten);
    }
}
