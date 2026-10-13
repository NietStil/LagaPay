<?php

namespace App\Services\Evenementen;

use App\Models\Evenement;
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
            ->addSelect('gebruiker_evenement.geblokkeerd')
            ->selectSub(
                Ticket::selectRaw("GROUP_CONCAT(tickets.naam SEPARATOR ', ')")
                    ->join('gebruiker_ticket', 'gebruiker_ticket.ticket_id', '=', 'tickets.id')
                    ->whereColumn('gebruiker_ticket.gebruiker_id', 'gebruikers.id')
                    ->where('tickets.evenement_id', $id),
                'ticket_naam'
            )
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
            ->join('gebruiker_evenement', 'gebruiker_evenement.gebruiker_id', '=', 'gebruikers.id')
            ->where('gebruiker_evenement.evenement_id', $id);

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

    public function deelnemerToevoegen($evenementId, $gebruikerId) {
        $blokkade = DB::table('gebruiker_evenement')
            ->where('gebruiker_id', $gebruikerId)
            ->where('evenement_id', $evenementId)
            ->value('geblokkeerd');

        if ($blokkade) {
            throw new \DomainException('Je bent geblokkeerd voor dit evenement.');
        }

        Evenement::findOrFail($evenementId)->deelnemers()->syncWithoutDetaching([$gebruikerId]);
    }

    public function deelnemerVerwijderen($evenementId, $gebruikerId) {
        DB::transaction(function () use ($evenementId, $gebruikerId) {
            DB::table('gebruiker_evenement')->updateOrInsert(
                ['gebruiker_id' => $gebruikerId, 'evenement_id' => $evenementId],
                ['geblokkeerd' => true, 'updated_at' => now()]
            );

            $this->kaartenDeactiveren($evenementId, $gebruikerId);
            $this->DeelnemerUitGroep($evenementId, $gebruikerId);
        });
    }

    public function deelnemerDeblokkeren($evenementId, $gebruikerId) {
        DB::table('gebruiker_evenement')
            ->where('gebruiker_id', $gebruikerId)
            ->where('evenement_id', $evenementId)
            ->update(['geblokkeerd' => false, 'updated_at' => now()]);
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
