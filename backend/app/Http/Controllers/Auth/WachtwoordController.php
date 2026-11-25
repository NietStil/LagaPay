<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\Account\WachtwoordService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class WachtwoordController extends Controller
{
    public function __construct(
        protected WachtwoordService $wachtwoordService
    ) {}

    public function wachtwoordVergeten()
    {
        return Inertia::render('Auth/WachtwoordVergeten');
    }

    /** The page behind the link in the reset mail: /wachtwoord-veranderen/{token}?email=... */
    public function wachtwoordVeranderen(Request $request, string $token)
    {
        return Inertia::render('Auth/WachtwoordVeranderen', [
            'token' => $token,
            'email' => (string) $request->query('email', ''),
        ]);
    }

    public function wachtwoordVeranderenAanvraag(Request $request)
    {
        $request->validate(['email' => 'required|email']);

        // The link points at the domain the request came from (main site or organisator.*).
        $this->wachtwoordService->stuurResetMail($request->input('email'), $request->root());

        return back();
    }

    public function wachtwoordVeranderenOpslaan(Request $request)
    {
        $gegevens = $request->validate([
            'token'      => ['required', 'string'],
            'email'      => ['required', 'email'],
            'wachtwoord' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        if (! $this->wachtwoordService->resetWachtwoord($gegevens['email'], $gegevens['token'], $gegevens['wachtwoord'])) {
            return back()->withErrors(['email' => 'Deze link is ongeldig of verlopen.']);
        }

        return redirect('/login')->with('status', 'Je wachtwoord is veranderd. Je kunt nu inloggen.');
    }
}
