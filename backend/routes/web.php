<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\SocialiteController;
use Inertia\Inertia;

Route::get('/', function () {
    $user = auth()->user();

    if ($user) {
        return Inertia::render('Dashboard', [
            'auth' => [
                'user' => $user,
            ],
        ]);
    }

    return view('welcome');
});

Route::get('/login', [SocialiteController::class, 'redirectToGoogle'])->name('login');
Route::get('/auth/google/callback', [SocialiteController::class, 'handleGoogleCallback']);
Route::get('/logout', [SocialiteController::class, 'logout'])->name('logout');
