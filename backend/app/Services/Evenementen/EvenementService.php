<?php

namespace App\Services\Evenementen;

use App\Models\Evenement;
use App\Models\Munt;
use App\Models\Transactie;
use Hidehalo\Nanoid\Client;
use Illuminate\Support\Facades\DB;

class EvenementService {
    public function getEvenementen($id) {
        return Evenement::withCount([
                'tickets',
                'producten',
                'groepen',
                'deelnemers as deelnemers_count' => fn ($query) => $query->where('gebruiker_evenement.geblokkeerd', false),
            ])
            ->with([
                'tickets' => function ($query) {
                    $query->withCount('gebruikers');
                },
                'producten',
                'kaarten',
            ])
            ->findOrFail($id);
    }

    public function createEvenement(int $gebruiker_id, array $data): Evenement {
        return Evenement::create([
            'naam'                => $data['naam'],
            'gebruiker'           => $gebruiker_id,
            'open'                => true,
            'start_datum'         => $data['start_datum'],
            'eind_datum'          => $data['eind_datum'],
            'telefoon_betaling'   => $data['telefoon_betaling'],
            'munten_terugstorten' => $data['munten_terugstorten'],
            'heeft_tickets'       => $data['heeft_tickets'],
            'munt_prijs'          => $data['munt_prijs'],
            'code'                => $this->generateUniqueCode(),
        ]);
    }

    public function deleteEvenement(int $id): void {
        $evenement = Evenement::findOrFail($id);

        // All foreign keys use "no action", so dependents are removed explicitly, children first.
        DB::transaction(function () use ($evenement) {
            $groepIds = $evenement->groepen()->pluck('id');
            $ticketIds = $evenement->tickets()->pluck('id');

            // Rows of other evenementen may still reference this evenement's groepen or transacties.
            Munt::whereIn('groep_id', $groepIds)->where('evenement_id', '!=', $evenement->id)->update(['groep_id' => null]);
            Transactie::whereIn('groep_id', $groepIds)->where('evenement_id', '!=', $evenement->id)->update(['groep_id' => null]);
            Munt::whereIn('laatste_transactie', $evenement->transacties()->select('id'))
                ->where('evenement_id', '!=', $evenement->id)
                ->update(['laatste_transactie' => null]);

            $evenement->munten()->delete();
            $evenement->transacties()->delete();
            $evenement->opwaarderingen()->delete();

            DB::table('gebruiker_groep')->whereIn('groep_id', $groepIds)->delete();
            $evenement->groepen()->delete();

            DB::table('gebruiker_ticket')->whereIn('ticket_id', $ticketIds)->delete();
            $evenement->tickets()->delete();

            $evenement->producten()->delete();

            // Kaarten belong to a gebruiker, so they are detached rather than deleted.
            $evenement->kaarten()->update(['evenement_id' => null]);

            $evenement->deelnemers()->detach();
            $evenement->delete();
        });
    }

    public function joinByCode(string $code, int $gebruikerId): Evenement {
        $evenement = Evenement::where('code', $code)->firstOrFail();

        if (! $evenement->open) {
            throw new \DomainException('Dit evenement is gesloten.');
        }

        app(DeelnemersService::class)->deelnemerToevoegen($evenement->id, $gebruikerId);

        return $evenement;
    }

    protected function generateUniqueCode(): string {
        do {
            $code = (new Client())->generateId(15);
        } while (Evenement::where('code', $code)->exists());

        return $code;
    }
}
