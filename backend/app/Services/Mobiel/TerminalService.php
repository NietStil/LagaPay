<?php

namespace App\Services\Mobiel;

use App\Models\Evenement;
use App\Models\Gebruiker;
use App\Models\Groep;
use App\Models\Kaart;
use App\Models\KaartKoppeling;
use App\Models\Munt;
use App\Models\Product;
use App\Models\ProductCategorie;
use App\Models\Terminal;
use App\Models\Transactie;
use App\Models\TransactieProduct;
use App\Services\Mobiel\Exceptions\TerminalFout;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;

/**
 * Bar terminals. A gebruiker's device becomes the terminal of an evenement with the evenement's terminal_code
 * (QR code or typed). Afrekenen takes the munten of a sale from the wallet of the scanned kaart and records
 * every product of the sale as a transactie_producten row.
 */
class TerminalService {
    public function __construct(
        protected Weergave $weergave,
        protected ToegangService $toegang,
        protected PortemonneeService $portemonnee,
    ) {}

    /**
     * The evenement where this account is the actieve terminal (at most one, see koppel). The app stays locked in
     * that terminal until it leaves, and polls this to notice a closed evenement.
     */
    public function mijnTerminals(Gebruiker $gebruiker): array {
        $this->sluitGeslotenAf($gebruiker->id);

        return Terminal::with('evenement')
            ->where('user_id', $gebruiker->id)
            ->where('actief', true)
            ->orderByDesc('updated_at')
            ->get()
            ->filter(fn (Terminal $terminal) => $terminal->evenement !== null)
            ->map(fn (Terminal $terminal) => $this->weergave->evenementBasis($terminal->evenement))
            ->values()
            ->all();
    }

    /**
     * Becomes (again) the terminal of the evenement with this terminal_code. The first time adds the row,
     * later times set it actief again.
     *
     * @throws ModelNotFoundException unknown code
     * @throws \DomainException evenement gesloten, or blocked for this evenement
     */
    public function koppel(Gebruiker $gebruiker, string $code): Evenement {
        $evenement = Evenement::where('terminal_code', $code)->first();

        if (! $evenement) {
            throw (new ModelNotFoundException())->setModel(Evenement::class);
        }
        if (! $evenement->open) {
            throw new \DomainException('Dit evenement is gesloten.');
        }
        if ($this->geblokkeerd($gebruiker->id, $evenement->id)) {
            throw new \DomainException('Je bent geblokkeerd voor dit evenement.');
        }

        DB::transaction(function () use ($gebruiker, $evenement) {
            // One terminal at a time: becoming this one leaves any other.
            Terminal::where('user_id', $gebruiker->id)
                ->where('evenement_id', '!=', $evenement->id)
                ->update(['actief' => false]);

            Terminal::updateOrCreate(
                ['evenement_id' => $evenement->id, 'user_id' => $gebruiker->id],
                ['actief' => true],
            );
        });

        return $evenement;
    }

    public function verlaat(Gebruiker $gebruiker, Evenement $evenement): void {
        Terminal::where('evenement_id', $evenement->id)
            ->where('user_id', $gebruiker->id)
            ->update(['actief' => false]);
    }

    /** The evenement when the gebruiker is its actieve terminal, not blocked and it's open, otherwise null. */
    public function terminalEvenement(Gebruiker $gebruiker, int $evenementId): ?Evenement {
        $this->sluitGeslotenAf($gebruiker->id);

        $actief = Terminal::where('evenement_id', $evenementId)
            ->where('user_id', $gebruiker->id)
            ->where('actief', true)
            ->exists();

        if (! $actief || $this->geblokkeerd($gebruiker->id, $evenementId)) {
            return null;
        }

        return Evenement::find($evenementId);
    }

    /**
     * Terminal home: the evenement, its product categorieën (the tabs, in the order they were made) and every
     * product (by naam) with its categorie_id.
     */
    public function overzicht(Evenement $evenement): array {
        $categorieen = ProductCategorie::where('evenement_id', $evenement->id)->orderBy('id')->get();
        $producten = $this->producten($evenement)->orderBy('naam')->orderBy('id')->get();

        return [
            'evenement'   => $this->weergave->evenementBasis($evenement),
            'categorieen' => $categorieen->map(fn (ProductCategorie $categorie) => [
                'id'   => $categorie->id,
                'naam' => $categorie->naam,
            ])->all(),
            'producten'   => $producten->map(fn (Product $product) => [
                'id'           => $product->id,
                'naam'         => $product->naam,
                'prijs'        => (int) $product->prijs,
                'categorie_id' => (int) $product->categorie_id,
            ])->all(),
        ];
    }

    /**
     * Afrekenen: takes the total of $bestelling ([product id => aantal]) from the wallet of the kaart with this
     * uid, as an uitgave by the kaart's owner, with one transactie_producten row per product.
     *
     * @throws ModelNotFoundException a product that isn't of this evenement
     * @throws TerminalFout unknown or unlinked kaart (404), refused (403), saldo te laag (422)
     */
    public function afrekenen(Evenement $evenement, string $kaartUid, array $bestelling): array {
        if (! $evenement->open) {
            throw new TerminalFout('Dit evenement is gesloten.', 403);
        }

        $totaal = $this->totaal($evenement, $bestelling);
        [$gebruiker, $groep] = $this->portemonneeVanKaart($evenement, $kaartUid);

        return $this->boekVerkoop($evenement, $bestelling, $totaal, $gebruiker, $groep);
    }

    /**
     * Development only (config lagapay.dev_scan): books the sale as if a wristband was scanned, without looking at
     * the saldo (it may go below 0). Paid by the wallet of a random actieve kaart linked to this evenement (of a
     * deelnemer), or, without one, by the terminal's own persoonlijk wallet.
     *
     * @throws ModelNotFoundException a product that isn't of this evenement
     * @throws TerminalFout evenement gesloten
     */
    public function devAfrekenen(Evenement $evenement, Gebruiker $terminal, array $bestelling): array {
        if (! $evenement->open) {
            throw new TerminalFout('Dit evenement is gesloten.', 403);
        }

        $totaal = $this->totaal($evenement, $bestelling);

        $gekoppeld = KaartKoppeling::where('evenement_id', $evenement->id)->pluck('kaart_id');
        $kaarten = Kaart::where('actief', true)
            ->where(fn ($query) => $query->where('evenement_id', $evenement->id)->orWhereIn('id', $gekoppeld))
            ->inRandomOrder()
            ->get();

        // The first kaart (in random order) that belongs to a deelnemer's wallet pays.
        [$gebruiker, $groep] = [$terminal, null];
        foreach ($kaarten as $kaart) {
            try {
                [$gebruiker, $groep] = $this->portemonneeVanKaart($evenement, $kaart->uid);
                break;
            } catch (TerminalFout) {
                continue;
            }
        }

        return $this->boekVerkoop($evenement, $bestelling, $totaal, $gebruiker, $groep, saldoControleren: false);
    }

    /** The uitgave on the wallet plus one transactie_producten row per product, in one database transaction. */
    protected function boekVerkoop(
        Evenement $evenement,
        array $bestelling,
        int $totaal,
        Gebruiker $gebruiker,
        ?Groep $groep,
        bool $saldoControleren = true,
    ): array {
        return DB::transaction(function () use ($evenement, $bestelling, $totaal, $gebruiker, $groep, $saldoControleren) {
            $saldo = $this->saldo($evenement, $gebruiker, $groep, lock: true);

            if ($saldoControleren && $saldo < $totaal) {
                throw new TerminalFout("Niet genoeg munten: het saldo is {$saldo}, de bestelling kost {$totaal}.", 422);
            }

            $transactie = $this->portemonnee->boek($gebruiker, $evenement, $groep, 'uitgave', $totaal);

            foreach ($bestelling as $productId => $aantal) {
                TransactieProduct::create([
                    'transactie' => $transactie->id,
                    'product'    => $productId,
                    'aantal'     => $aantal,
                ]);
            }

            return [
                'transactie' => $this->verkoop($transactie->load(['gebruiker', 'groep', 'producten.productModel'])),
                'saldo'      => $saldo - $totaal,
            ];
        });
    }

    /** Terminal Transacties: the sales (uitgaven with producten) of this evenement, newest first. */
    public function transacties(Evenement $evenement): array {
        return Transactie::with(['gebruiker', 'groep', 'producten.productModel'])
            ->where('evenement_id', $evenement->id)
            ->where('type', 'uitgave')
            ->whereHas('producten')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit(200)
            ->get()
            ->map(fn (Transactie $transactie) => $this->verkoop($transactie))
            ->all();
    }

    /** Expects gebruiker, groep and producten.productModel to be loaded. */
    protected function verkoop(Transactie $transactie): array {
        $gebruiker = $transactie->gebruiker;

        return [
            'id'        => $transactie->id,
            'naam'      => $gebruiker ? trim($gebruiker->voornaam . ' ' . $gebruiker->achternaam) : 'Onbekend',
            'groep'     => $this->weergave->groepKort($transactie->groep),
            'totaal'    => (int) $transactie->hoeveelheid,
            'datum'     => $this->weergave->datum($transactie->created_at),
            'producten' => $transactie->producten->map(fn (TransactieProduct $regel) => [
                'naam'   => $regel->productModel?->naam ?? 'Verwijderd product',
                'aantal' => (int) $regel->aantal,
                // Current price: the product row only keeps the latest one.
                'prijs'  => $regel->productModel ? (int) $regel->productModel->prijs : null,
            ])->all(),
        ];
    }

    /**
     * Who pays for a scanned kaart: [owner, groep or null]. The kaart's slot (kaart koppelen) in this evenement
     * decides; without a koppeling, a tijdelijke kaart of this evenement pays from the owner's persoonlijk saldo.
     *
     * @throws TerminalFout
     */
    protected function portemonneeVanKaart(Evenement $evenement, string $kaartUid): array {
        $kaarten = Kaart::where('uid', $kaartUid)->where('actief', true)->get();

        if ($kaarten->isEmpty()) {
            throw new TerminalFout('Deze kaart is onbekend of niet actief.', 404);
        }

        $koppeling = KaartKoppeling::with(['gebruiker', 'groep'])
            ->whereIn('kaart_id', $kaarten->pluck('id'))
            ->where('evenement_id', $evenement->id)
            ->orderByRaw('soort = ? desc', [KaartKoppeling::SOORT_PERSOONLIJK])
            ->first();

        if ($koppeling) {
            $gebruiker = $koppeling->gebruiker;
            $groep = null;

            if ($koppeling->soort === KaartKoppeling::SOORT_GROEP) {
                $groep = $koppeling->groep;
                $mijnGroep = $this->toegang->mijnGroep($gebruiker->id, $evenement->id);

                if (! $groep || ! $mijnGroep || $mijnGroep->id !== $groep->id) {
                    throw new TerminalFout('Deze groepskaart hoort bij een groep waar de eigenaar niet meer in zit.', 403);
                }
            }
        } else {
            $tijdelijk = $kaarten->firstWhere('evenement_id', $evenement->id);

            if (! $tijdelijk) {
                throw new TerminalFout('Deze kaart is niet gekoppeld aan dit evenement.', 404);
            }

            $gebruiker = $tijdelijk->gebruiker;
            $groep = null;
        }

        if (! $gebruiker || ! $this->toegang->deelnemerEvenement($gebruiker, $evenement->id)) {
            throw new TerminalFout('De eigenaar van deze kaart is geen deelnemer van dit evenement.', 403);
        }

        return [$gebruiker, $groep];
    }

    /** Saldo of the wallet (sum of its munten rows, see API.md), optionally locking the rows. */
    protected function saldo(Evenement $evenement, Gebruiker $gebruiker, ?Groep $groep, bool $lock = false): int {
        $query = Munt::query()
            ->where('evenement_id', $evenement->id)
            ->when(
                $groep,
                fn ($query) => $query->where('groep_id', $groep->id),
                fn ($query) => $query->where('gebruiker_id', $gebruiker->id)->whereNull('groep_id'),
            );

        if ($lock) {
            $query->lockForUpdate();
        }

        return (int) $query->get(['hoeveelheid'])->sum('hoeveelheid');
    }

    /**
     * Total in munten of $bestelling ([product id => aantal]).
     *
     * @throws ModelNotFoundException a product that isn't of this evenement
     */
    protected function totaal(Evenement $evenement, array $bestelling): int {
        $producten = $this->producten($evenement)->whereIn('producten.id', array_keys($bestelling))->get()->keyBy('id');

        if ($producten->count() !== count($bestelling)) {
            throw (new ModelNotFoundException())->setModel(Product::class);
        }

        $totaal = 0;
        foreach ($bestelling as $productId => $aantal) {
            $totaal += (int) $producten[$productId]->prijs * $aantal;
        }

        return $totaal;
    }

    /** Producten of this evenement (they belong to it through their categorie). */
    protected function producten(Evenement $evenement) {
        return Product::whereRelation('categorie', 'evenement_id', $evenement->id);
    }

    /**
     * Deactivates this gebruiker's terminals of evenementen that are closed (Evenement::booted does this when an
     * evenement is closed through the app; this also covers closing it straight in the database).
     */
    protected function sluitGeslotenAf(int $gebruikerId): void {
        Terminal::where('user_id', $gebruikerId)
            ->where('actief', true)
            ->whereIn('evenement_id', Evenement::where('open', false)->select('id'))
            ->update(['actief' => false]);
    }

    protected function geblokkeerd(int $gebruikerId, int $evenementId): bool {
        return (bool) DB::table('gebruiker_evenement')
            ->where('gebruiker_id', $gebruikerId)
            ->where('evenement_id', $evenementId)
            ->value('geblokkeerd');
    }
}
