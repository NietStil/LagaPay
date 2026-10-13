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
        if ($request->user() && in_array($request->user()->rol, ['organizer', 'admin'])) {
            return $next($request);
        }

        return redirect()->route('login');
    }
}
