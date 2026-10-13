<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Gebruiker;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class AuthController extends Controller
{
    public function index()
    {
        return Inertia::render('Auth/Login');
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email'      => ['required', 'string', 'email'],
            'wachtwoord' => ['required', 'string'],
        ]);

        $email = strtolower(trim($credentials['email']));

        if (Auth::attempt(['email' => $email, 'password' => $credentials['wachtwoord']], $request->boolean('remember'))) {
            $request->session()->regenerate();

            return redirect()->intended('/dashboard/evenementen');
        }

        return back()->withErrors([
            'email' => 'De opgegeven inloggegevens zijn onjuist.',
        ])->onlyInput('email');
    }

    public function destroy(Request $request)
    {
        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }

    public function mobileLogin(Request $request) {
        $credentials = $request->validate([
            'email'       => ['required', 'string', 'email'],
            'wachtwoord'  => ['required', 'string'],
            'device_name' => ['required', 'string'],
        ]);

        $email = strtolower(trim($credentials['email']));

        if (! Auth::validate(['email' => $email, 'password' => $credentials['wachtwoord']])) {
            throw ValidationException::withMessages([
                'email' => ['De opgegeven inloggegevens zijn onjuist.'],
            ]);
        }

        $gebruiker = Gebruiker::where('email', $email)->first();

        $token = $gebruiker->createToken($credentials['device_name']);

        $expo_token = $request->input('expo_token', null);
        if ($expo_token && method_exists($gebruiker, 'expoTokens')) {
            $gebruiker->expoTokens()->firstOrCreate([
                'value' => $expo_token,
            ]);
        }

        return response()->json([
            'token' => $token->plainTextToken,
            'user'  => $gebruiker,
        ], 200);
    }

    public function mobileLogout(Request $request) {
        $request->user()->currentAccessToken()->delete();

        $expo_token = $request->input('expo_token', null);
        if ($expo_token && method_exists($request->user(), 'expoTokens')) {
            $request->user()->expoTokens()->where('value', $expo_token)->delete();
        }

        return response()->json([
            'message' => 'Succesvol uitgelogd.',
        ], 200);
    }
}
