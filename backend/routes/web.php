<?php

use App\Http\Controllers\Auth\SocialiteController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Main domain (lagapay.test or localhost)
|--------------------------------------------------------------------------
| The public landing page. The dashboard lives on organisator.* (routes/organisator.php), the app's API on
| api.* (routes/api.php). Bound to the main host so these routes don't also answer on the subdomains.
*/

Route::domain(parse_url(config('app.url'), PHP_URL_HOST))->group(function () {
    Route::get('/', fn () => Inertia::render('Landing', [
        'organisatorUrl' => route('home'),
    ]))->name('landing');

    // The redirect URI registered with Google for both the app and the dashboard; forwards to the right subdomain.
    Route::get('/auth/google/callback', [SocialiteController::class, 'forwardGoogleCallback'])->name('google.callback.forward');
});
