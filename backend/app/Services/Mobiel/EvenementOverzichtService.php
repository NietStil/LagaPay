<?php

namespace App\Services\Mobiel;

use App\Models\Evenement;
use App\Models\Gebruiker;
use App\Models\Munt;
use App\Models\Transactie;
use Illuminate\Database\Eloquent\Builder;

class EvenementOverzichtService {
    public const FILTERS = ['alles', 'opwaarderingen', 'uitgaven'];

    public function __construct(
        protected Weergave $weergave,
        protected ToegangService $toegang,
        protected KaartService $kaarten,
    ) {}

    /** My non-blocked evenementen with my persoonlijk saldo. Open first, then start_datum descending. */
    public function evenementen(Gebruiker $gebruiker): array {
        return $gebruiker->evenementen()
            ->wherePivot('geblokkeerd', false)
            ->withSum(['munten as saldo' => fn (Builder $query) => $this->persoonlijkeMunten($query, $gebruiker->id)], 'hoeveelheid')
            ->orderByDesc('evenementen.open')
            ->orderByDesc('evenementen.start_datum')
            ->orderByDesc('evenementen.id')
            ->get()
            ->map(fn (Evenement $evenement) => $this->weergave->evenementBasis($evenement) + [
                'saldo' => (int) $evenement->saldo,
            ])
            ->all();
    }

    public function overzicht(Gebruiker $gebruiker, Evenement $evenement): array {
        $activiteit = $this->persoonlijkeTransacties($gebruiker->id, $evenement->id)
            ->limit(5)
            ->get()
            ->map(fn (Transactie $transactie) => $this->weergave->transactie($transactie))
            ->all();

        $groep = $this->toegang->mijnGroep($gebruiker->id, $evenement->id);

        return [
            'evenement'  => $this->weergave->evenementBasis($evenement),
            'saldo'      => $this->saldo($gebruiker->id, $evenement->id),
            'activiteit' => $activiteit,
            'groep'      => $this->weergave->groepKort($groep),
            // My one kaart of this evenement (shown above the Persoonlijk|Groep tabs).
            'kaart'      => $this->kaarten->evenementKaart($gebruiker->id, $evenement->id),
            // My groep's id when I last switched to the Groep page (and am still in that groep): the app opens there,
            // and my kaart pays from the groep's wallet.
            'betaalbron' => $this->toegang->betaalGroep($gebruiker->id, $evenement->id)?->id,
        ];
    }

    public function transacties(Gebruiker $gebruiker, Evenement $evenement, string $filter = 'alles'): array {
        $query = $this->persoonlijkeTransacties($gebruiker->id, $evenement->id);

        // The sign comes from the type (see Weergave::bedrag), so "bedrag > 0" / "bedrag < 0" become type filters.
        if ($filter === 'opwaarderingen') {
            $query->whereNotIn('type', Weergave::NEGATIEVE_TYPES)->where('hoeveelheid', '!=', 0);
        } elseif ($filter === 'uitgaven') {
            $query->whereIn('type', Weergave::NEGATIEVE_TYPES)->where('hoeveelheid', '!=', 0);
        }

        return $query->limit(200)
            ->get()
            ->map(fn (Transactie $transactie) => $this->weergave->transactie($transactie))
            ->all();
    }

    /** Persoonlijk wallet: munten of the gebruiker in this evenement without a groep. */
    public function saldo(int $gebruikerId, int $evenementId): int {
        return (int) $this->persoonlijkeMunten(Munt::query(), $gebruikerId)
            ->where('evenement_id', $evenementId)
            ->sum('hoeveelheid');
    }

    protected function persoonlijkeMunten(Builder $query, int $gebruikerId): Builder {
        return $query->where('munten.gebruiker_id', $gebruikerId)->whereNull('munten.groep_id');
    }

    /** Persoonlijke activiteit, newest first. */
    protected function persoonlijkeTransacties(int $gebruikerId, int $evenementId): Builder {
        return Transactie::query()
            ->where('gebruiker_id', $gebruikerId)
            ->where('evenement_id', $evenementId)
            ->whereNull('groep_id')
            ->orderByDesc('created_at')
            ->orderByDesc('id');
    }
}
