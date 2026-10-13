<?php

namespace App\Http\Middleware;

use App\Services\Mobiel\ToegangService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Guards the app routes that come before deelname (/evenementen/{id}/tickets, /deelnemen): the current gebruiker
 * must be a deelnemer, have a ticket, or have opened the evenement's link, and must not be blocked; otherwise 404.
 * The evenement is stored on the request as the "evenement" attribute, like EvenementDeelnemer does.
 */
class EvenementZichtbaar
{
    public function __construct(
        protected ToegangService $toegang,
    ) {}

    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $evenement = $request->user()
            ? $this->toegang->zichtbaarEvenement($request->user(), (int) $request->route('id'))
            : null;

        if (! $evenement) {
            return response()->json(['message' => 'Evenement niet gevonden.'], 404);
        }

        $request->attributes->set('evenement', $evenement);

        return $next($request);
    }
}
