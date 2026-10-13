<?php

namespace App\Services\Mobiel;

use App\Models\Evenement;
use App\Models\Gebruiker;
use App\Models\Groep;
use App\Models\KaartKoppeling;
use App\Models\Munt;
use App\Models\Transactie;
use App\Services\Evenementen\EvenementService;
use Hidehalo\Nanoid\Client;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class GroepService {
    public function __construct(
        protected Weergave $weergave,
        protected ToegangService $toegang,
        protected EvenementService $evenementService,
        protected DeelnameService $deelname,
    ) {}

    /** My groep in this evenement with saldo, leden and aandelen, or null when I'm not in a groep. */
    public function groepDetail(Gebruiker $gebruiker, Evenement $evenement): ?array {
        $groep = $this->toegang->mijnGroep($gebruiker->id, $evenement->id);

        if (! $groep) {
            return null;
        }

        $saldo = $this->saldo($groep->id);

        $leden = $groep->gebruikers()
            ->select('gebruikers.id', 'gebruikers.voornaam', 'gebruikers.tussenvoegsels', 'gebruikers.achternaam')
            ->withSum(['transacties as munten_gekocht' => fn (Builder $query) => $query
                ->where('transacties.groep_id', $groep->id)
                ->whereIn('transacties.type', Weergave::GEKOCHT_TYPES)], 'hoeveelheid')
            ->orderBy('gebruikers.id')
            ->get();

        $aandelen = $this->verdeelSaldo(
            $saldo,
            $leden->mapWithKeys(fn (Gebruiker $lid) => [$lid->id => (int) $lid->munten_gekocht])->all(),
        );

        $ledenWeergave = $leden
            ->map(fn (Gebruiker $lid) => [
                'id'             => $lid->id,
                'naam'           => $lid->name,
                'initialen'      => mb_strtoupper(mb_substr((string) $lid->voornaam, 0, 1) . mb_substr((string) $lid->achternaam, 0, 1)),
                'is_ik'          => $lid->id === $gebruiker->id,
                'munten_gekocht' => (int) $lid->munten_gekocht,
                'aandeel'        => $aandelen[$lid->id] ?? 0,
            ])
            ->sort(fn (array $a, array $b) => [$b['is_ik'], $b['munten_gekocht'], $a['id']] <=> [$a['is_ik'], $a['munten_gekocht'], $b['id']])
            ->values()
            ->all();

        $koppeling = KaartKoppeling::with('kaart.evenement:id,naam,open')
            ->where('gebruiker_id', $gebruiker->id)
            ->where('evenement_id', $evenement->id)
            ->where('soort', KaartKoppeling::SOORT_GROEP)
            ->where('groep_id', $groep->id)
            ->first();

        $activiteit = Transactie::with('gebruiker:id,voornaam')
            ->where('groep_id', $groep->id)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit(10)
            ->get()
            ->map(fn (Transactie $transactie) => $this->weergave->transactie($transactie, true))
            ->all();

        return [
            'id'               => $groep->id,
            'naam'             => $groep->naam,
            'saldo'            => $saldo,
            'uitnodigingslink' => $this->uitnodigingslink($groep),
            'leden'            => $ledenWeergave,
            'mijn_aandeel'     => $aandelen[$gebruiker->id] ?? 0,
            'kaart'            => $this->weergave->kaart($koppeling?->kaart),
            'activiteit'       => $activiteit,
        ];
    }

    /**
     * Joins the groep with this code and adds me as deelnemer of its evenement (same rules as the evenement join).
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException unknown code
     * @throws DeelnameGeweigerd evenement gesloten, gebruiker geblokkeerd, or (with tickets) no ticket / not started
     * @throws GroepConflictException already in another groep of the evenement
     */
    public function join(Gebruiker $gebruiker, string $code): Groep {
        $groep = Groep::with('evenement')->where('code', $code)->orderBy('id')->firstOrFail();

        // Same rules as joining the evenement (ticket + started for evenementen with tickets). Checked outside the
        // transaction, so the view it may remember for the tickets screen is kept.
        $this->deelname->controleer($gebruiker, $groep->evenement);

        DB::transaction(function () use ($gebruiker, $groep) {
            // Throws when the evenement is gesloten or I'm blocked, otherwise makes me a deelnemer.
            $this->evenementService->joinByCode($groep->evenement->code, $gebruiker->id);

            // My groepen in this evenement.
            $mijnGroepIds = Groep::where('evenement_id', $groep->evenement_id)
                ->whereIn('id', DB::table('gebruiker_groep')->select('groep_id')->where('gebruiker_id', $gebruiker->id))
                ->pluck('id');

            // Already in this groep: nothing to do (also when older data put me in more groepen of this evenement).
            if ($mijnGroepIds->contains($groep->id)) {
                return;
            }

            if ($mijnGroepIds->isNotEmpty()) {
                throw new GroepConflictException('Je zit al in een andere groep van dit evenement.');
            }

            $groep->gebruikers()->attach($gebruiker->id);
        });

        return $groep;
    }

    /**
     * Creates a groep in this evenement with me as its first lid. Groepen are made by visitors in the app,
     * and a gebruiker is in at most one groep per evenement.
     *
     * @throws \DomainException evenement gesloten
     * @throws GroepConflictException already in a groep of this evenement
     */
    public function maak(Gebruiker $gebruiker, Evenement $evenement, string $naam): Groep {
        if (! $evenement->open) {
            throw new \DomainException('Dit evenement is gesloten.');
        }

        return DB::transaction(function () use ($gebruiker, $evenement, $naam) {
            // Lock my deelnemer row, so a double tap can't create two groepen.
            DB::table('gebruiker_evenement')
                ->where('gebruiker_id', $gebruiker->id)
                ->where('evenement_id', $evenement->id)
                ->lockForUpdate()
                ->first();

            if ($this->toegang->mijnGroep($gebruiker->id, $evenement->id)) {
                throw new GroepConflictException('Je zit al in een groep van dit evenement.');
            }

            $groep = Groep::create([
                'naam'         => $naam,
                'evenement_id' => $evenement->id,
                'code'         => $this->uniekeCode(),
            ]);
            $groep->gebruikers()->attach($gebruiker->id);

            return $groep;
        });
    }

    /** 10 nanoid characters ([A-Za-z0-9_-]), the same format as the existing groep codes. */
    protected function uniekeCode(): string {
        do {
            $code = (new Client())->generateId(10);
        } while (Groep::where('code', $code)->exists());

        return $code;
    }

    /** Groep wallet: all munten of the groep. */
    public function saldo(int $groepId): int {
        return (int) Munt::where('groep_id', $groepId)->sum('hoeveelheid');
    }

    public function uitnodigingslink(Groep $groep): string {
        return rtrim((string) config('lagapay.link_url'), '/') . '/g/' . $groep->code;
    }

    /**
     * Splits the saldo proportional to the weights with the largest-remainder method, so the shares add up to the saldo.
     * Ties on the remainder go to the higher weight, then to the key that comes first.
     *
     * @param  array<int, int>  $gewichten  key => weight (munten gekocht), in a stable order
     * @return array<int, int> key => share
     */
    public function verdeelSaldo(int $saldo, array $gewichten): array {
        $gewichten = array_map(fn ($gewicht) => max(0, (int) $gewicht), $gewichten);
        $totaal = array_sum($gewichten);

        if ($totaal === 0 || $saldo === 0) {
            return array_map(fn () => 0, $gewichten);
        }

        $teken = $saldo < 0 ? -1 : 1;
        $rest = abs($saldo);
        $delen = [];
        $resten = [];

        foreach ($gewichten as $sleutel => $gewicht) {
            $delen[$sleutel] = intdiv($rest * $gewicht, $totaal);
            $resten[$sleutel] = ($rest * $gewicht) % $totaal;
        }

        $over = $rest - array_sum($delen);
        $volgorde = array_keys($gewichten);
        $positie = array_flip($volgorde);

        usort($volgorde, fn ($a, $b) => [$resten[$b], $gewichten[$b], $positie[$a]] <=> [$resten[$a], $gewichten[$a], $positie[$b]]);

        foreach (array_slice($volgorde, 0, $over) as $sleutel) {
            $delen[$sleutel]++;
        }

        return array_map(fn ($deel) => $deel * $teken, $delen);
    }
}
