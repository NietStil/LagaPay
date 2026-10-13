<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Gebruiker;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class RegisterController extends Controller
{
    public function index()
    {
        return Inertia::render('Auth/Register');
    }

    public function create(Request $request)
    {
        $validated = $request->validate([
            'voornaam'       => ['required', 'string', 'max:255'],
            'achternaam'     => ['required', 'string', 'max:255'],
            'tussenvoegsels' => ['nullable', 'string', 'max:255'],
            'email'          => ['required', 'string', 'email', 'max:255', Rule::unique(Gebruiker::class, 'email')],
            'wachtwoord'     => ['required', 'string', 'min:8'],
        ]);

        $user = Gebruiker::create([
            'voornaam'       => $validated['voornaam'],
            'achternaam'     => $validated['achternaam'],
            'tussenvoegsels' => $validated['tussenvoegsels'] ?? null,
            'email'          => strtolower(trim($validated['email'])),
            'wachtwoord'     => Hash::make($validated['wachtwoord']),
        ]);

        Auth::login($user);
        $request->session()->regenerate();

        return redirect('/dashboard/evenementen');
    }

    public function mobileRegister(Request $request) {
        $request->validate([
            'voornaam'   => ['required', 'string', 'max:255'],
            'tussenvoegsels' => ['nullable', 'string', 'max:255'],
            'achternaam' => ['required', 'string', 'max:255'],
            'email'      => ['required', 'string', 'email', 'max:255', 'unique:gebruikers,email'],
            'wachtwoord' => ['required', 'string', 'min:8'],
            'device_name'=> ['required', 'string'],
        ]);

        $gebruiker = Gebruiker::create([
            'voornaam'   => $request->voornaam,
            'tussenvoegsels' => $request->tussenvoegsels,
            'achternaam' => $request->achternaam,
            'email'      => strtolower(trim($request->email)),
            'wachtwoord' => Hash::make($request->wachtwoord),
        ]);

        $token = $gebruiker->createToken($request->device_name);

        $expo_token = $request->input('expo_token', null);
        if ($expo_token && method_exists($gebruiker, 'expoTokens')) {
            $gebruiker->expoTokens()->create([
                'value' => $expo_token,
            ]);
        }

        return response()->json([
            'token' => $token->plainTextToken,
            'user'  => $gebruiker,
        ], 201);
    }
}
