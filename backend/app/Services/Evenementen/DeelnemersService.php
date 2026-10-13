<?php

namespace App\Services\Evenementen;

use App\Models\Gebruiker;
use App\Models\Groep;
use App\Models\Kaart;
use App\Models\Munt;
use App\Models\Ticket;
use Illuminate\Support\Facades\DB;

class DeelnemersService {
    public function getDeelnemers($id, $request = null) {
        $query = Gebruiker::query()
            ->select(
                'gebruikers.id',
                'gebruikers.voornaam',
                'gebruikers.tussenvoegsels',
                'gebruikers.achternaam',
                'gebruikers.email'
            )
            ->selectRaw('tickets.naam as ticket_naam')
            ->selectSub(
                Groep::selectRaw("GROUP_CONCAT(groepen.naam SEPARATOR ', ')")
                    ->join('gebruiker_groep', 'gebruiker_groep.groep_id', '=', 'groepen.id')
                    ->whereColumn('gebruiker_groep.gebruiker_id', 'gebruikers.id')
                    ->where('groepen.evenement_id', $id),
                'groepen_namen'
            )
            ->selectSub(
                Kaart::selectRaw("GROUP_CONCAT(kaarten.uid SEPARATOR ', ')")
                    ->whereColumn('kaarten.gebruiker_id', 'gebruikers.id')
                    ->where('kaarten.evenement_id', $id)
                    ->where('kaarten.actief', 1),
                'kaarten_uids'
            )
            ->selectSub(
                Munt::selectRaw('COALESCE(SUM(munten.hoeveelheid), 0)')
                    ->whereColumn('munten.gebruiker_id', 'gebruikers.id')
                    ->where('munten.evenement_id', $id),
                'saldo'
            )
            ->join('gebruiker_ticket', 'gebruiker_ticket.gebruiker_id', '=', 'gebruikers.id')
            ->join('tickets', 'tickets.id', '=', 'gebruiker_ticket.ticket_id')
            ->where('tickets.evenement_id', $id);

        if ($request && $request->filled('search')) {
            $search = '%' . $request->query('search') . '%';
            $query->where(function ($q) use ($search) {
                $q->where('gebruikers.voornaam', 'like', $search)
                    ->orWhere('gebruikers.achternaam', 'like', $search)
                    ->orWhere('gebruikers.email', 'like', $search);
            });
        }

        return $query->paginate(100)->withQueryString();
    }

    public function deelnemerVerwijderen($evenementId, $gebruikerId) {
        $ticketIds = Ticket::where('evenement_id', $evenementId)->pluck('id');
        DB::table('gebruiker_ticket')
            ->where('gebruiker_id', $gebruikerId)
            ->whereIn('ticket_id', $ticketIds)
            ->delete();
    }

    public function kaartenDeactiveren($evenementId, $gebruikerId) {
        Kaart::where('gebruiker_id', $gebruikerId)
            ->where('evenement_id', $evenementId)
            ->update(['actief' => false]);
    }

    public function DeelnemerUitGroep($evenementId, $gebruikerId) {
        $groepIds = Groep::where('evenement_id', $evenementId)->pluck('id');
        DB::table('gebruiker_groep')
            ->where('gebruiker_id', $gebruikerId)
            ->whereIn('groep_id', $groepIds)
            ->delete();
    }
}
