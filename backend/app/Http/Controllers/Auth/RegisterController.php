<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\Account\RegistratieService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class RegisterController extends Controller
{
    public function __construct(
        protected RegistratieService $registratie,
    ) {}

    public function index()
    {
        return Inertia::render('Auth/Register');
    }

    public function create(Request $request)
    {
        $user = $this->registratie->registreer($request->validate(RegistratieService::regels()));

        Auth::login($user);
        $request->session()->regenerate();

        return redirect('/dashboard/evenementen');
    }

    public function mobileRegister(Request $request) {
        $validated = $request->validate([
            ...RegistratieService::regels(),
            'device_name' => ['required', 'string'],
        ]);

        $gebruiker = $this->registratie->registreer($validated);

        $token = $gebruiker->createToken($validated['device_name']);

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
