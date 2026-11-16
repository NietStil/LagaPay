<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Sends logged-in organisatoren and admins straight to the dashboard. Guests and logged-in normal accounts
 * get the page itself (a redirect would only end in HeeftWebToegang's 401 for them).
 */
class StuurOrganisatorNaarDashboard
{
    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->heeftWebToegang()) {
            return redirect()->route('evenementen');
        }

        return $next($request);
    }
}
