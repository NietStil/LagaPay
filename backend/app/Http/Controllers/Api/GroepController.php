<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Mobiel\DeelnameGeweigerd;
use App\Services\Mobiel\GroepConflictException;
use App\Services\Mobiel\GroepService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GroepController extends Controller
{
    public function __construct(
        protected GroepService $groepService,
    ) {}

    public function show(Request $request): JsonResponse
    {
        return response()->json([
            'groep' => $this->groepService->groepDetail($request->user(), $request->attributes->get('evenement')),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'naam' => ['required', 'string', 'max:50'],
        ], [
            'naam.required' => 'Geef je groep een naam.',
            'naam.max'      => 'De naam mag maximaal 50 tekens zijn.',
        ]);

        $evenement = $request->attributes->get('evenement');

        try {
            $this->groepService->maak($request->user(), $evenement, $validated['naam']);
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        } catch (GroepConflictException $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        }

        return response()->json([
            'groep' => $this->groepService->groepDetail($request->user(), $evenement),
        ], 201);
    }

    public function join(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:255'],
        ]);

        try {
            $groep = $this->groepService->join($request->user(), $validated['code']);
        } catch (ModelNotFoundException) {
            return response()->json(['message' => 'Groep niet gevonden.'], 404);
        } catch (DeelnameGeweigerd $e) {
            return response()->json($e->body(), 403);
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        } catch (GroepConflictException $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        }

        return response()->json([
            'groep'        => ['id' => $groep->id, 'naam' => $groep->naam],
            'evenement_id' => $groep->evenement_id,
        ]);
    }
}
