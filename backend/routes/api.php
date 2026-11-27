<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\Auth\SocialiteController;
use App\Http\Controllers\Auth\WachtwoordController;
use App\Http\Controllers\Api\BetaalController;
use App\Http\Controllers\Api\EvenementController;
use App\Http\Controllers\Api\GroepController;
use App\Http\Controllers\Api\KaartController;
use App\Http\Controllers\Api\ProfielController;
use App\Http\Controllers\Api\TerminalController;
use App\Http\Controllers\Api\TicketController;
use App\Http\Middleware\EvenementDeelnemer;
use App\Http\Middleware\EvenementTerminal;
use App\Http\Middleware\EvenementZichtbaar;

/*
|--------------------------------------------------------------------------
| API Routes (api.lagapay.test or api.localhost)
|--------------------------------------------------------------------------
*/

Route::middleware('guest')->group(function () {
    Route::post('/login', [AuthController::class, 'mobileLogin'])->name('login.mobile.perform');

    Route::post('/register', [RegisterController::class, 'mobileRegister'])->name('register.mobile.perform');

    Route::get('/auth/google', [SocialiteController::class, 'redirectToMobileGoogle'])->name('google.mobile.login');
    Route::get('/auth/google/callback', [SocialiteController::class, 'handleMobileGoogleCallback'])->name('google.mobile.callback');
    Route::post('/auth/google/token', [SocialiteController::class, 'handleGoogleToken'])->name('google.mobile.token');
});

// Not in the guest group: the app also calls it while logged in (Wachtwoord wijzigen → "Wachtwoord vergeten?"),
// and guest's redirect (302) would make the app drop its token.
Route::post('/wachtwoord-vergeten', [WachtwoordController::class, 'mobielAanvraag'])->middleware('throttle:6,1')->name('wachtwoord.mobiel.vergeten');

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    $gebruiker = $request->user();

    return response()->json([
        ...$gebruiker->toArray(),
        // Google-only accounts have none: Wachtwoord wijzigen then doesn't ask for the huidige wachtwoord.
        'heeft_wachtwoord' => filled($gebruiker->getAuthPassword()),
    ]);
});

// App endpoints, contract in frontend/app-design/API.md
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/evenementen', [EvenementController::class, 'index'])->name('evenementen.index');
    Route::post('/evenementen/bekijk', [EvenementController::class, 'bekijk'])->name('evenementen.bekijk');
    Route::post('/evenementen/join', [EvenementController::class, 'join'])->name('evenementen.join');

    // Only for non-blocked deelnemers of the evenement, otherwise 404.
    Route::prefix('/evenementen/{id}')->whereNumber('id')->middleware(EvenementDeelnemer::class)->group(function () {
        Route::get('/', [EvenementController::class, 'show'])->name('evenementen.show');
        Route::get('/transacties', [EvenementController::class, 'transacties'])->name('evenementen.transacties');
        Route::get('/groep', [GroepController::class, 'show'])->name('evenementen.groep');
        Route::post('/groepen', [GroepController::class, 'store'])->name('evenementen.groepen.store');
        Route::put('/betaalbron', [GroepController::class, 'betaalbron'])->name('evenementen.betaalbron');
        Route::get('/kaarten', [KaartController::class, 'evenement'])->name('evenementen.kaarten');
        Route::post('/kaarten/permanent', [KaartController::class, 'permanent'])->name('evenementen.kaarten.permanent');
        Route::post('/opwaarderen', [BetaalController::class, 'opwaarderen'])->name('evenementen.opwaarderen');
    });

    // Before deelname: also for gebruikers with a ticket or who opened the link (not blocked), otherwise 404.
    Route::prefix('/evenementen/{id}')->whereNumber('id')->middleware(EvenementZichtbaar::class)->group(function () {
        Route::get('/tickets', [TicketController::class, 'evenement'])->name('evenementen.tickets');
        Route::post('/deelnemen', [EvenementController::class, 'deelnemen'])->name('evenementen.deelnemen');
        Route::post('/tickets/kopen', [BetaalController::class, 'ticketsKopen'])->name('evenementen.tickets.kopen');
        Route::get('/mijn-tickets', [TicketController::class, 'mijnTickets'])->name('evenementen.mijn-tickets');
        // Development only (config lagapay.dev_scan), otherwise 404.
        Route::post('/mijn-tickets/{ticket}/dev-scan', [TicketController::class, 'devScan'])->whereNumber('ticket')->name('evenementen.mijn-tickets.dev-scan');
    });

    // Bar terminals: join with the evenement's terminal_code; the rest only while I'm its actieve terminal, otherwise 404.
    Route::get('/terminals', [TerminalController::class, 'index'])->name('terminals.index');
    Route::post('/terminals/koppelen', [TerminalController::class, 'koppelen'])->name('terminals.koppelen');

    Route::prefix('/terminals/{id}')->whereNumber('id')->middleware(EvenementTerminal::class)->group(function () {
        Route::get('/', [TerminalController::class, 'show'])->name('terminals.show');
        Route::post('/verlaten', [TerminalController::class, 'verlaten'])->name('terminals.verlaten');
        Route::post('/afrekenen', [TerminalController::class, 'afrekenen'])->name('terminals.afrekenen');
        // Development only (config lagapay.dev_scan), otherwise 404.
        Route::post('/dev-afrekenen', [TerminalController::class, 'devAfrekenen'])->name('terminals.dev-afrekenen');
        Route::get('/transacties', [TerminalController::class, 'transacties'])->name('terminals.transacties');
        Route::post('/tickets/scan', [TerminalController::class, 'scan'])->name('terminals.tickets.scan');
    });

    Route::post('/groepen/join', [GroepController::class, 'join'])->name('groepen.join');

    Route::get('/kaarten', [KaartController::class, 'index'])->name('kaarten.index');

    Route::get('/tickets', [TicketController::class, 'index'])->name('tickets.index');
    Route::post('/tickets/scan', [TicketController::class, 'scan'])->name('tickets.scan');
    Route::get('/ticket-uitnodigingen/{code}', [TicketController::class, 'uitnodiging'])->name('ticket-uitnodigingen.show');
    Route::post('/ticket-uitnodigingen/{code}/accepteren', [TicketController::class, 'accepteer'])->name('ticket-uitnodigingen.accepteren');

    Route::put('/profiel', [ProfielController::class, 'update'])->name('profiel.update');
    Route::put('/profiel/wachtwoord', [ProfielController::class, 'wachtwoord'])->name('profiel.wachtwoord');
});

Route::get('/ping', function () {
    return response()->json(['message' => 'pong from API subdomain!']);
});
