<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Link URL
    |--------------------------------------------------------------------------
    |
    | Base URL of the shareable links that the app opens as deep links:
    | {link_url}/e/{evenement.code} and {link_url}/g/{groep.code}.
    |
    */

    'link_url' => env('LAGAPAY_LINK_URL', 'https://lagapay.nl'),

    /*
    |--------------------------------------------------------------------------
    | Test betalingen
    |--------------------------------------------------------------------------
    |
    | Until Mollie is built, opwaarderen and tickets kopen are booked straight
    | away without a payment. On by default only for APP_ENV=local, so a
    | production deploy can't hand out free munten or tickets by accident.
    |
    */

    'test_betalingen' => (bool) env('LAGAPAY_TEST_BETALINGEN', env('APP_ENV') === 'local'),

];
