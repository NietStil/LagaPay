<?php

namespace App\Http\Middleware;

use App\Services\Mobiel\ToegangService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Guards the app routes /evenementen/{id}/*: the current gebruiker must be a non-blocked deelnemer
 * of the evenement, otherwise 404. The evenement is stored on the request as the "evenement" attribute.
 */
class EvenementDeelnemer
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
            ? $this->toegang->deelnemerEvenement($request->user(), (int) $request->route('id'))
            : null;

        if (! $evenement) {
            return response()->json(['message' => 'Evenement niet gevonden.'], 404);
        }

        $request->attributes->set('evenement', $evenement);

        return $next($request);
    }
}
