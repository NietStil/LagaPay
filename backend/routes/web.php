<?php

use App\Http\Controllers\Auth\SocialiteController;
use App\Http\Controllers\Auth\WachtwoordController;
use App\Http\Controllers\Web\AccountController;
use App\Http\Controllers\Web\TicketsController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Main domain (lagapay.test or localhost)
|--------------------------------------------------------------------------
| The public landing page and buying tickets without the app. The dashboard lives on organisator.*
| (routes/organisator.php), the app's API on api.* (routes/api.php). Bound to the main host so these routes
| don't also answer on the subdomains.
*/

Route::domain(parse_url(config('app.url'), PHP_URL_HOST))->group(function () {
    Route::get('/', fn () => Inertia::render('Landing'))->name('landing');

    // The redirect URI registered with Google for every flow: handles the website's own login and forwards
    // the app's and the dashboard's to their subdomain.
    Route::get('/auth/google/callback', [SocialiteController::class, 'forwardGoogleCallback'])->name('google.callback.forward');

    // Accounts for buying tickets on the website (any gebruiker, the same accounts as in the app).
    Route::middleware('guest')->group(function () {
        Route::get('/auth/google', [SocialiteController::class, 'redirectToWebGoogle'])->name('web.google');
        Route::get('/login', [AccountController::class, 'loginForm'])->name('web.login');
        Route::post('/login', [AccountController::class, 'login'])->middleware('throttle:6,1')->name('web.login.perform');
        Route::get('/wachtwoord-vergeten', [WachtwoordController::class, 'wachtwoordVergeten'])->name('web.wachtwoord.vergeten');
        Route::post('/wachtwoord-vergeten', [WachtwoordController::class, 'wachtwoordVeranderenAanvraag'])->middleware('throttle:6,1')->name('web.wachtwoord.vergeten.perform');
        Route::get('/wachtwoord-veranderen/{token}', [WachtwoordController::class, 'wachtwoordVeranderen'])->name('web.wachtwoord.veranderen');
        Route::post('/wachtwoord-veranderen', [WachtwoordController::class, 'wachtwoordVeranderenOpslaan'])->middleware('throttle:6,1')->name('web.wachtwoord.veranderen.perform');
        Route::get('/register', [AccountController::class, 'registerForm'])->name('web.register');
        Route::post('/register', [AccountController::class, 'register'])->middleware('throttle:6,1')->name('web.register.perform');
    });
    Route::middleware('auth')->group(function () {
        Route::post('/logout', [AccountController::class, 'logout'])->name('web.logout');
        Route::get('/mijn-tickets', [TicketsController::class, 'overzicht'])->name('web.mijn-tickets');
    });

    // The evenement link ({link_url}/e/{code}) that organisatoren share: opens the app when it's installed,
    // otherwise buying tickets here (login first).
    Route::prefix('/e/{code}')->where(['code' => '[A-Za-z0-9_-]{15}'])->group(function () {
        Route::get('/', [TicketsController::class, 'link'])->name('web.evenement');

        Route::middleware('auth')->group(function () {
            Route::get('/tickets', [TicketsController::class, 'tickets'])->name('web.tickets');
            Route::post('/tickets', [TicketsController::class, 'kopen'])->middleware('throttle:20,1')->name('web.tickets.kopen');
            Route::get('/mijn-tickets', [TicketsController::class, 'mijnTickets'])->name('web.evenement.mijn-tickets');
        });
    });
});
