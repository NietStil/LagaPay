<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Gebruiker;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
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

            // Query existing user by google_id or email
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

            return redirect('/');
        } catch (\Exception $e) {
            return redirect('/login')->withErrors([
                'email' => 'Inloggen via Google is mislukt. Probeer het opnieuw.',
            ]);
        }
    }
}
