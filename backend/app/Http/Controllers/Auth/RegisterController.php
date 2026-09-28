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
}
