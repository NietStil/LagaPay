<?php

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
});
