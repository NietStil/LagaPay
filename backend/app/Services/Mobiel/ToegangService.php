<?php

namespace App\Services\Mobiel;

use App\Models\Evenement;
use App\Models\Gebruiker;
use App\Models\Groep;
use Illuminate\Support\Facades\DB;

class ToegangService {
    /**
     * The evenement when the gebruiker is a non-blocked deelnemer of it, otherwise null.
     * Used by the EvenementDeelnemer middleware for every /evenementen/{id}/* route.
     */
    public function deelnemerEvenement(Gebruiker $gebruiker, int $evenementId): ?Evenement {
        return $gebruiker->evenementen()
            ->wherePivot('geblokkeerd', false)
            ->where('evenementen.id', $evenementId)
            ->first();
    }

    /**
     * The evenement when the gebruiker may see its tickets: a non-blocked deelnemer, or (not blocked) someone who
     * has a ticket for it or opened its link. Otherwise null. Used by the EvenementZichtbaar middleware.
     */
    public function zichtbaarEvenement(Gebruiker $gebruiker, int $evenementId): ?Evenement {
        $evenement = Evenement::find($evenementId);

        if (! $evenement) {
            return null;
        }

        $geblokkeerd = DB::table('gebruiker_evenement')
            ->where('gebruiker_id', $gebruiker->id)
            ->where('evenement_id', $evenementId)
            ->value('geblokkeerd');

        if ($geblokkeerd !== null) {
            return $geblokkeerd ? null : $evenement;
        }

        $bekeken = DB::table('bekeken_evenementen')
            ->where('gebruiker_id', $gebruiker->id)
            ->where('evenement_id', $evenementId)
            ->exists();

        if ($bekeken) {
            return $evenement;
        }

        $heeftTicket = DB::table('gebruiker_ticket')
            ->join('tickets', 'tickets.id', '=', 'gebruiker_ticket.ticket_id')
            ->where('gebruiker_ticket.gebruiker_id', $gebruiker->id)
            ->where('tickets.evenement_id', $evenementId)
            ->exists();

        return $heeftTicket ? $evenement : null;
    }

    /**
     * "Mijn groep": the groep with the lowest id of this evenement that the gebruiker is a member of.
     */
    public function mijnGroep(int $gebruikerId, int $evenementId): ?Groep {
        return Groep::where('evenement_id', $evenementId)
            ->whereIn('id', DB::table('gebruiker_groep')->select('groep_id')->where('gebruiker_id', $gebruikerId))
            ->orderBy('id')
            ->first();
    }
}
