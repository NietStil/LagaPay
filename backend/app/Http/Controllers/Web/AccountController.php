<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Http\Requests\InloggenRequest;
use App\Services\Account\RegistratieService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

/**
 * Logging in and registering on the main domain, to buy tickets without the app. Any gebruiker may log in here
 * (unlike organisator.*); it's the same account as in the app. Reuses the dashboard's Login/Register pages.
 */
class AccountController extends Controller
{
    public function __construct(
        protected RegistratieService $registratie,
    ) {}

    public function loginForm()
    {
        return Inertia::render('Auth/Login', [
            'ondertitel'     => 'Log in met je LagaPay-account om tickets te kopen',
            'registrerenUrl' => route('web.register'),
            'googleUrl'      => route('web.google'),
        ]);
    }

    public function login(InloggenRequest $request)
    {
        $request->inloggen();

        // Back to the tickets page that sent me here.
        return redirect()->intended(route('landing'));
    }

    public function registerForm()
    {
        // A copy of the app's register screen, with registering through Google.
        return Inertia::render('Web/Register', [
            'googleUrl' => route('web.google'),
        ]);
    }

    public function register(Request $request)
    {
        $gebruiker = $this->registratie->registreer($request->validate(RegistratieService::regels()));

        Auth::login($gebruiker);
        $request->session()->regenerate();

        return redirect()->intended(route('landing'));
    }

    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('landing');
    }
}
