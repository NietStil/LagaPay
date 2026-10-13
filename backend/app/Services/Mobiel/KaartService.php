<?php

namespace App\Services\Mobiel;

use App\Models\Evenement;
use App\Models\Gebruiker;
use App\Models\Kaart;
use App\Models\KaartKoppeling;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Validation\ValidationException;

class KaartService {
    public const SOORTEN = [KaartKoppeling::SOORT_PERSOONLIJK, KaartKoppeling::SOORT_GROEP];

    public function __construct(
        protected Weergave $weergave,
        protected ToegangService $toegang,
    ) {}

    /** Profiel: my permanente kaart and my tijdelijke kaarten (newest first). */
    public function profielKaarten(Gebruiker $gebruiker): array {
        $tijdelijk = Kaart::with('evenement:id,naam,open')
            ->where('gebruiker_id', $gebruiker->id)
            ->whereNotNull('evenement_id')
            ->orderByDesc('id')
            ->get();

        return [
            'permanente_kaart'   => $this->weergave->kaart($this->permanenteKaart($gebruiker->id)),
            'tijdelijke_kaarten' => $tijdelijk->map(fn (Kaart $kaart) => $this->weergave->kaart($kaart))->all(),
        ];
    }

    /** My persoonlijk and groep kaart slots in this evenement. */
    public function evenementKaarten(Gebruiker $gebruiker, Evenement $evenement): array {
        $groep = $this->toegang->mijnGroep($gebruiker->id, $evenement->id);

        $koppelingen = KaartKoppeling::with('kaart.evenement:id,naam,open')
            ->where('gebruiker_id', $gebruiker->id)
            ->where('evenement_id', $evenement->id)
            ->get()
            ->keyBy('soort');

        // Persoonlijk slot falls back to my most recent actieve tijdelijke kaart for this evenement.
        $persoonlijk = $koppelingen->get(KaartKoppeling::SOORT_PERSOONLIJK)?->kaart
            ?? Kaart::with('evenement:id,naam,open')
                ->where('gebruiker_id', $gebruiker->id)
                ->where('evenement_id', $evenement->id)
                ->where('actief', true)
                ->orderByDesc('id')
                ->first();

        // Groep slot has no fallback and only counts for the groep I'm currently in.
        $groepKoppeling = $koppelingen->get(KaartKoppeling::SOORT_GROEP);
        $groepKaart = $groep && $groepKoppeling && (int) $groepKoppeling->groep_id === $groep->id
            ? $groepKoppeling->kaart
            : null;

        return [
            'persoonlijk'      => $this->weergave->kaart($persoonlijk),
            'groep'            => $this->weergave->kaart($groepKaart),
            'permanente_kaart' => $this->weergave->kaart($this->permanenteKaart($gebruiker->id)),
            'groep_info'       => $this->weergave->groepKort($groep),
        ];
    }

    /**
     * Links my permanente kaart to the persoonlijk or groep slot of this evenement.
     *
     * @throws \DomainException evenement gesloten
     * @throws ModelNotFoundException no permanente kaart
     * @throws ValidationException soort groep while not in a groep
     */
    public function koppelPermanent(Gebruiker $gebruiker, Evenement $evenement, string $soort): array {
        if (! $evenement->open) {
            throw new \DomainException('Dit evenement is gesloten.');
        }

        $kaart = $this->permanenteKaart($gebruiker->id);

        if (! $kaart) {
            throw new ModelNotFoundException('Je hebt geen permanente kaart.');
        }

        $groepId = null;

        if ($soort === KaartKoppeling::SOORT_GROEP) {
            $groepId = $this->toegang->mijnGroep($gebruiker->id, $evenement->id)?->id;

            if (! $groepId) {
                throw ValidationException::withMessages([
                    'soort' => ['Je zit niet in een groep bij dit evenement.'],
                ]);
            }
        }

        KaartKoppeling::updateOrCreate(
            ['gebruiker_id' => $gebruiker->id, 'evenement_id' => $evenement->id, 'soort' => $soort],
            ['kaart_id' => $kaart->id, 'groep_id' => $groepId],
        );

        return $this->evenementKaarten($gebruiker, $evenement);
    }

    /** The permanente kaart: my most recent kaart without an evenement. */
    public function permanenteKaart(int $gebruikerId): ?Kaart {
        return Kaart::where('gebruiker_id', $gebruikerId)
            ->whereNull('evenement_id')
            ->orderByDesc('id')
            ->first();
    }
}
