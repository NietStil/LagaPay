<?php

namespace App\Services\Mobiel;

use App\Models\Evenement;
use App\Models\Gebruiker;
use App\Models\Groep;
use App\Models\Munt;
use App\Models\Transactie;

/** Books munten on a wallet (persoonlijk, or a groep's) together with the matching transactie. */
class PortemonneeService {
    public function __construct(
        protected Weergave $weergave,
    ) {}

    /**
     * A transactie plus the matching change of the wallet (persoonlijk, or the groep's when $groep is set).
     * $munten is positive; the type gives the direction (uitgave takes munten out, see Weergave::NEGATIEVE_TYPES).
     */
    public function boek(
        Gebruiker $gebruiker,
        Evenement $evenement,
        ?Groep $groep,
        string $type,
        int $munten,
        ?int $opwaarderingId = null,
    ): Transactie {
        $transactie = Transactie::create([
            'gebruiker_id'    => $gebruiker->id,
            'evenement_id'    => $evenement->id,
            'groep_id'        => $groep?->id,
            'opwaardering_id' => $opwaarderingId,
            'hoeveelheid'     => $munten,
            'type'            => $type,
        ]);
        $munten = $this->weergave->bedrag($type, $munten);

        // Saldo is the sum of the wallet's munten rows (see API.md); the change goes on one row per wallet:
        // persoonlijk = my row without groep, groep = the groep's row without gebruiker.
        $rij = Munt::query()
            ->where('evenement_id', $evenement->id)
            ->when(
                $groep,
                fn ($query) => $query->where('groep_id', $groep->id)->whereNull('gebruiker_id'),
                fn ($query) => $query->where('gebruiker_id', $gebruiker->id)->whereNull('groep_id'),
            )
            ->lockForUpdate()
            ->first();

        if ($rij) {
            $rij->update(['hoeveelheid' => $rij->hoeveelheid + $munten, 'laatste_transactie' => $transactie->id]);
        } else {
            Munt::create([
                'gebruiker_id'       => $groep ? null : $gebruiker->id,
                'evenement_id'       => $evenement->id,
                'groep_id'           => $groep?->id,
                'hoeveelheid'        => $munten,
                'laatste_transactie' => $transactie->id,
            ]);
        }

        return $transactie;
    }
}
