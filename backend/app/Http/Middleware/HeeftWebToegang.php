<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class HeeftWebToegang
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user()) {
            return redirect()->route('login');
        }

        // Logged in without access: a redirect to /login would loop (guest sends logged-in users back to the dashboard).
        if (! $request->user()->heeftWebToegang()) {
            abort(401, 'Dit account heeft geen toegang tot het organisatordashboard.');
        }

        return $next($request);
    }
}
