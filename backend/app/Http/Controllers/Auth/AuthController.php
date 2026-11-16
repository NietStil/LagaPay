<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\InloggenRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class AuthController extends Controller
{
    public function index()
    {
        return Inertia::render('Auth/Login');
    }

    public function login(InloggenRequest $request)
    {
        $gebruiker = $request->inloggen();

        // Correct password, but a normal account: log straight out again and answer 401 on the login page.
        if (! $gebruiker->heeftWebToegang()) {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return Inertia::render('Auth/Login', [
                'errors' => ['email' => 'Dit account heeft geen toegang tot het organisatordashboard.'],
            ])->toResponse($request)->setStatusCode(401);
        }

        return redirect()->intended('/dashboard/evenementen');
    }

    public function destroy(Request $request)
    {
        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }

    public function mobileLogin(InloggenRequest $request) {
        $credentials = $request->validate([
            'device_name' => ['required', 'string'],
        ]);

        $gebruiker = $request->gebruiker();

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
