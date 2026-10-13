<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Gebruiker;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Laravel\Socialite\Facades\Socialite;

class SocialiteController extends Controller
{
    public function redirectToGoogle()
    {
        return Socialite::driver('google')->redirect();
    }

    public function handleGoogleCallback(Request $request)
    {
        try {
            $googleUser = Socialite::driver('google')->user();
            $email = strtolower(trim($googleUser->email));

            $user = Gebruiker::where('google_id', $googleUser->id)
                ->orWhere('email', $email)
                ->first();

            if ($user) {
                if (!$user->google_id) {
                    $user->update(['google_id' => $googleUser->id]);
                }
            } else {
                $user = Gebruiker::create([
                    'voornaam'   => $googleUser->user['given_name'] ?? $googleUser->name ?? '',
                    'achternaam' => $googleUser->user['family_name'] ?? '',
                    'email'      => $email,
                    'google_id'  => $googleUser->id,
                ]);
            }

            Auth::login($user);
            $request->session()->regenerate();

            return redirect('/dashboard/evenementen');
        } catch (\Exception $e) {
            return redirect('/login')->withErrors([
                'email' => 'Inloggen via Google is mislukt. Probeer het opnieuw.',
            ]);
        }
    }

    public function redirectToMobileGoogle()
    {
        return Socialite::driver('google')
            ->stateless()
            ->redirect();
    }

    public function handleMobileGoogleCallback(Request $request)
    {
        try {
            // Use stateless() for mobile apps since they don't use cookies/sessions
            $googleUser = Socialite::driver('google')->stateless()->user();
            $email = strtolower(trim($googleUser->email));

            $user = Gebruiker::where('google_id', $googleUser->id)
                ->orWhere('email', $email)
                ->first();

            if ($user) {
                if (!$user->google_id) {
                    $user->update(['google_id' => $googleUser->id]);
                }
            } else {
                $user = Gebruiker::create([
                    'voornaam'   => $googleUser->user['given_name'] ?? $googleUser->name ?? '',
                    'achternaam' => $googleUser->user['family_name'] ?? '',
                    'email'      => $email,
                    'google_id'  => $googleUser->id,
                ]);
            }

            // Generate a Laravel Sanctum API token for mobile
            $token = $user->createToken('expo-mobile-app')->plainTextToken;

            // Redirect back to your mobile app via deep link
            return redirect("lagapay://login?token={$token}");

        } catch (\Exception $e) {
            return redirect("lagapay://login?error=" . urlencode('Inloggen via Google is mislukt.'));
        }
    }

    public function handleGoogleToken(Request $request)
    {
        $request->validate([
            'id_token' => ['required', 'string'],
        ]);

        try {
            // Verify ID Token via Google OAuth2 tokeninfo API
            $response = Http::get('https://oauth2.googleapis.com/tokeninfo', [
                'id_token' => $request->id_token,
            ]);

            if ($response->failed()) {
                return response()->json(['message' => 'Ongeldige Google token.'], 422);
            }

            $payload = $response->json();
            $googleId = $payload['sub'] ?? null;
            $email = strtolower(trim($payload['email'] ?? ''));

            if (!$email) {
                return response()->json(['message' => 'Geen e-mailadres gekoppeld aan dit Google account.'], 422);
            }

            $user = Gebruiker::where('google_id', $googleId)
                ->orWhere('email', $email)
                ->first();

            if ($user) {
                if (!$user->google_id) {
                    $user->update(['google_id' => $googleId]);
                }
            } else {
                $user = Gebruiker::create([
                    'voornaam'   => $payload['given_name'] ?? $payload['name'] ?? 'Google',
                    'achternaam' => $payload['family_name'] ?? 'Gebruiker',
                    'email'      => $email,
                    'google_id'  => $googleId,
                ]);
            }

            $token = $user->createToken('expo-mobile-app')->plainTextToken;

            return response()->json([
                'token' => $token,
                'user'  => $user,
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Inloggen via Google mislukt: ' . $e->getMessage(),
            ], 500);
        }
    }
}
