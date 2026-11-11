<?php

namespace App\Http\Middleware;

use App\Services\Mobiel\TerminalService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Guards the app routes /terminals/{id}/*: the current gebruiker must be an actieve, non-blocked terminal of the
 * evenement, otherwise 404. The evenement is stored on the request as the "evenement" attribute.
 */
class EvenementTerminal
{
    public function __construct(
        protected TerminalService $terminals,
    ) {}

    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $evenement = $request->user()
            ? $this->terminals->terminalEvenement($request->user(), (int) $request->route('id'))
            : null;

        if (! $evenement) {
            return response()->json(['message' => 'Terminal niet gevonden.'], 404);
        }

        $request->attributes->set('evenement', $evenement);

        return $next($request);
    }
}
