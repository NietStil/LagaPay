<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Laravel\Socialite\Facades\Socialite;
use Illuminate\Support\Str;

class SocialiteController extends Controller
{
    public function redirectToGoogle()
    {
        return Socialite::driver('google')->redirect();
    }

    public function handleGoogleCallback()
    {
        try {
            $googleUser = Socialite::driver('google')->user();

            $user = User::updateOrCreate([
                'email' => $googleUser->email,
            ], [
                'name' => $googleUser->name,
                'password' => bcrypt(Str::random(16)), // Social login doesn't need a password
            ]);

            Auth::login($user);

            return redirect('/');
        } catch (\Exception $e) {
            return redirect('/')->with('error', 'Google authentication failed.');
        }
    }

    public function logout()
    {
        Auth::logout();
        return redirect('/');
    }
}
