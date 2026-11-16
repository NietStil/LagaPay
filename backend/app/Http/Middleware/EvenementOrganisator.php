<?php

namespace App\Http\Middleware;

use App\Models\Evenement;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Guards the dashboard routes /dashboard/evenementen/{id} and /dashboard/evenementen/{evenement_id}/*:
 * only the organisator who owns the evenement (or an admin) gets through, otherwise 404, so other
 * organisatoren can't tell the evenement exists. The evenement is stored on the request as the
 * "evenement" attribute.
 */
class EvenementOrganisator
{
    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Nested routes use {evenement_id} (their {id} is a categorie/product/ticket), show/destroy use {id}.
        $evenementId = $request->route('evenement_id') ?? $request->route('id');
        $gebruiker = $request->user();

        $evenement = $gebruiker && is_numeric($evenementId)
            ? Evenement::find((int) $evenementId)
            : null;

        if (! $evenement || ((int) $evenement->gebruiker !== (int) $gebruiker->id && $gebruiker->rol !== 'admin')) {
            abort(404);
        }

        $request->attributes->set('evenement', $evenement);

        return $next($request);
    }
}
