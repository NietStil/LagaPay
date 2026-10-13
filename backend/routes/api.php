<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\Auth\SocialiteController;
use App\Http\Controllers\Api\BetaalController;
use App\Http\Controllers\Api\EvenementController;
use App\Http\Controllers\Api\GroepController;
use App\Http\Controllers\Api\KaartController;
use App\Http\Controllers\Api\ProfielController;
use App\Http\Controllers\Api\TicketController;
use App\Http\Middleware\EvenementDeelnemer;
use App\Http\Middleware\EvenementZichtbaar;

/*
|--------------------------------------------------------------------------
| API Routes (api.lagapay.test or api.localhost)
|--------------------------------------------------------------------------
*/

Route::middleware('guest')->group(function () {
    Route::post('/login', [AuthController::class, 'mobileLogin'])->name('login.mobile.perform');

    Route::post('/register', [RegisterController::class, 'mobileRegister'])->name('register.mobile.perform');

    Route::get('/auth/google', [SocialiteController::class, 'redirectToMobileGoogle'])->name('google.login');
    Route::get('/auth/google/callback', [SocialiteController::class, 'handleMobileGoogleCallback'])->name('google.callback');
    Route::post('/auth/google/token', [SocialiteController::class, 'handleGoogleToken'])->name('google.token');
});

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return response()->json($request->user());
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
        Route::get('/kaarten', [KaartController::class, 'evenement'])->name('evenementen.kaarten');
        Route::post('/kaarten/permanent', [KaartController::class, 'permanent'])->name('evenementen.kaarten.permanent');
        Route::post('/opwaarderen', [BetaalController::class, 'opwaarderen'])->name('evenementen.opwaarderen');
    });

    // Before deelname: also for gebruikers with a ticket or who opened the link (not blocked), otherwise 404.
    Route::prefix('/evenementen/{id}')->whereNumber('id')->middleware(EvenementZichtbaar::class)->group(function () {
        Route::get('/tickets', [TicketController::class, 'evenement'])->name('evenementen.tickets');
        Route::post('/deelnemen', [EvenementController::class, 'deelnemen'])->name('evenementen.deelnemen');
        Route::post('/tickets/{ticket}/kopen', [BetaalController::class, 'ticketKopen'])->whereNumber('ticket')->name('evenementen.tickets.kopen');
    });

    Route::post('/groepen/join', [GroepController::class, 'join'])->name('groepen.join');

    Route::get('/kaarten', [KaartController::class, 'index'])->name('kaarten.index');

    Route::get('/tickets', [TicketController::class, 'index'])->name('tickets.index');

    Route::put('/profiel', [ProfielController::class, 'update'])->name('profiel.update');
    Route::put('/profiel/wachtwoord', [ProfielController::class, 'wachtwoord'])->name('profiel.wachtwoord');
});

Route::get('/ping', function () {
    return response()->json(['message' => 'pong from API subdomain!']);
});
