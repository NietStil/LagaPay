<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\Auth\SocialiteController;

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

Route::get('/ping', function () {
    return response()->json(['message' => 'pong from API subdomain!']);
});
