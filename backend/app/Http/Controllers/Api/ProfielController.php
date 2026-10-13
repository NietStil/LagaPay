<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Gebruiker;
use App\Services\Mobiel\ProfielService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProfielController extends Controller
{
    public function __construct(
        protected ProfielService $profielService,
    ) {}

    public function update(Request $request): JsonResponse
    {
        if (is_string($request->input('email'))) {
            $request->merge(['email' => strtolower(trim($request->input('email')))]);
        }

        $validated = $request->validate([
            'voornaam'       => ['required', 'string', 'max:255'],
            'tussenvoegsels' => ['nullable', 'string', 'max:255'],
            'achternaam'     => ['required', 'string', 'max:255'],
            'email'          => ['required', 'string', 'email', 'max:255', Rule::unique(Gebruiker::class, 'email')->ignore($request->user()->id)],
        ], [
            'email.unique' => 'Dit e-mailadres is al in gebruik.',
        ]);

        return response()->json([
            'user' => $this->profielService->updateProfiel($request->user(), $validated),
        ]);
    }

    public function wachtwoord(Request $request): JsonResponse
    {
        $gebruiker = $request->user();

        $validated = $request->validate([
            'huidig_wachtwoord' => [Rule::requiredIf(fn () => $this->profielService->heeftWachtwoord($gebruiker)), 'nullable', 'string'],
            'wachtwoord'        => ['required', 'string', 'min:8', 'confirmed'],
        ], [
            'huidig_wachtwoord.required' => 'Vul je huidige wachtwoord in.',
        ]);

        $this->profielService->updateWachtwoord($gebruiker, $validated['huidig_wachtwoord'] ?? null, $validated['wachtwoord']);

        return response()->json(['message' => 'Je wachtwoord is gewijzigd.']);
    }
}
