<?php

use App\Http\Controllers\Dashboard\EvenementController;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Auth\AuthController;
//use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\Dashboard\ProductenController;
use App\Http\Controllers\Dashboard\DeelnemersController;
use App\Http\Controllers\Dashboard\TicketsController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\Auth\SocialiteController;
use App\Http\Controllers\Dashboard\DashboardController;
use App\Http\Middleware\HeeftWebToegang;

Route::get('/', [HomeController::class, 'index'])->name('home');

// Routes for guests only (unauthenticated users)
Route::middleware('guest')->group(function () {
    //Route::get('/register', [RegisterController::class, 'index'])->name('register');
    //Route::post('/register', [RegisterController::class, 'create'])->middleware('throttle:6,1')->name('register.store');

    Route::get('/login', [AuthController::class, 'index'])->name('login');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:6,1')->name('login.perform');

    Route::get('/auth/google', [SocialiteController::class, 'redirectToGoogle'])->name('google.login');
    Route::get('/auth/google/callback', [SocialiteController::class, 'handleGoogleCallback'])->name('google.callback');
});

// Routes for authenticated users
Route::middleware('auth')->group(function () {
    Route::post('/logout', [AuthController::class, 'destroy'])->name('logout');

    Route::middleware(HeeftWebToegang::class)->group(function() {
        Route::prefix('dashboard/evenementen')->group(function () {
            Route::get('/', [DashboardController::class, 'index'])->name('evenementen');
            Route::get('/{id}', [EvenementController::class, 'show'])->name('show');

            Route::prefix('/{evenement_id}')->group(function () {
                Route::put('/producten', [ProductenController::class, 'update'])->name('product.update');
                Route::post('/producten', [ProductenController::class, 'create'])->name('product.store');
                Route::delete('/producten/{id}', [ProductenController::class, 'delete'])->name('product.destroy');

                Route::delete('/deelnemers/{gebruiker_id}', [DeelnemersController::class, 'delete'])->name('deelnemers.kick');
                Route::post('/deelnemers/{gebruiker_id}/disable-kaarten', [DeelnemersController::class, 'kaartenDeactiveren'])->name('deelnemers.disable-kaarten');
                Route::post('/deelnemers/{gebruiker_id}/kick-groepen', [DeelnemersController::class, 'DeelnemerUitGroep'])->name('deelnemers.kick-groepen');

                Route::post('/tickets', [TicketsController::class, 'create'])->name('ticket.add');
                Route::delete('/tickets/{id}', [TicketsController::class, 'delete'])->name('ticket.destroy');
            });
        })->name('evenementen.');
    });
});
