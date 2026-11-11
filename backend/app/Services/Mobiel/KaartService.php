<?php

namespace App\Services\Mobiel;

use App\Models\Evenement;
use App\Models\Gebruiker;
use App\Models\Kaart;
use App\Models\KaartKoppeling;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\ModelNotFoundException;

class KaartService {
    public function __construct(
        protected Weergave $weergave,
    ) {}

    /** Profiel: my permanente kaart and my tijdelijke kaarten that are linked to an evenement (newest first). */
    public function profielKaarten(Gebruiker $gebruiker): array {
        $tijdelijk = Kaart::with('koppelingen.evenement:id,naam,open')
            ->where('gebruiker_id', $gebruiker->id)
            ->where('type', Kaart::TYPE_TIJDELIJK)
            ->whereHas('koppelingen')
            ->orderByDesc('id')
            ->get();

        return [
            'permanente_kaart'   => $this->weergave->kaart($this->permanenteKaart($gebruiker->id)),
            'tijdelijke_kaarten' => $tijdelijk->map(fn (Kaart $kaart) => $this->weergave->kaart($kaart))->all(),
        ];
    }

    /** Kaart koppelen: my kaart in this evenement plus all my persoonlijke kaarten (newest first) to pick from. */
    public function evenementKaarten(Gebruiker $gebruiker, Evenement $evenement): array {
        return [
            'kaart'                => $this->evenementKaart($gebruiker->id, $evenement->id),
            'persoonlijke_kaarten' => $this->persoonlijkeKaarten($gebruiker->id)
                ->map(fn (Kaart $kaart) => $this->weergave->kaart($kaart))
                ->all(),
        ];
    }

    /** My one kaart in this evenement (Weergave::kaart), or null when no kaart is linked. */
    public function evenementKaart(int $gebruikerId, int $evenementId): ?array {
        $koppeling = KaartKoppeling::with(['kaart', 'evenement:id,naam,open'])
            ->where('gebruiker_id', $gebruikerId)
            ->where('evenement_id', $evenementId)
            ->first();

        return $this->weergave->kaart($koppeling?->kaart, $koppeling);
    }

    /**
     * Links one of my persoonlijke kaarten as my kaart in this evenement, replacing the previous one. A new kaart
     * starts actief here; linking the kaart that is already linked keeps its actief (a deactivation stays).
     *
     * @throws \DomainException evenement gesloten
     * @throws ModelNotFoundException not one of my persoonlijke kaarten
     */
    public function koppelPersoonlijk(Gebruiker $gebruiker, Evenement $evenement, int $kaartId): array {
        if (! $evenement->open) {
            throw new \DomainException('Dit evenement is gesloten.');
        }

        $kaart = $this->persoonlijkeKaarten($gebruiker->id)->firstWhere('id', $kaartId);

        if (! $kaart) {
            throw new ModelNotFoundException('Deze persoonlijke kaart is niet gevonden.');
        }

        $koppeling = KaartKoppeling::firstOrNew(['gebruiker_id' => $gebruiker->id, 'evenement_id' => $evenement->id]);

        if ((int) $koppeling->kaart_id !== $kaart->id) {
            $koppeling->fill(['kaart_id' => $kaart->id, 'actief' => true])->save();
        }

        return $this->evenementKaarten($gebruiker, $evenement);
    }

    /** The permanente kaart (profiel): my most recent kaart of type persoonlijk. */
    public function permanenteKaart(int $gebruikerId): ?Kaart {
        return $this->persoonlijkeKaarten($gebruikerId)->first();
    }

    /** All my kaarten of type persoonlijk, newest first. */
    public function persoonlijkeKaarten(int $gebruikerId): Collection {
        return Kaart::where('gebruiker_id', $gebruikerId)
            ->where('type', Kaart::TYPE_PERSOONLIJK)
            ->orderByDesc('id')
            ->get();
    }
}
