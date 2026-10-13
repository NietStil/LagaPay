<?php

namespace App\Services\Mobiel;

use App\Models\Evenement;
use App\Models\Gebruiker;
use App\Services\Evenementen\EvenementService;
use Illuminate\Support\Facades\DB;

/**
 * Who may become deelnemer of an evenement. Without tickets: anyone with the link while the evenement is open.
 * With tickets: only with a ticket, and only once the evenement has started. Until then, opening the link
 * shows the tickets and is remembered in bekeken_evenementen ("Recent bekeken" on the Tickets tab).
 */
class DeelnameService {
    public function __construct(
        protected Weergave $weergave,
        protected EvenementService $evenementService,
    ) {}

    /**
     * Opening an evenement link: the evenement and my deelname status. Doesn't make me a deelnemer.
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException unknown code
     * @throws DeelnameGeweigerd gesloten or geblokkeerd (and I'm not a deelnemer)
     */
    public function bekijk(Gebruiker $gebruiker, string $code): array {
        $evenement = Evenement::where('code', $code)->firstOrFail();
        $feiten = $this->feiten($gebruiker->id, $evenement);

        // A deelnemer may still open a gesloten evenement (e.g. to terugstorten); others get the join answer.
        if (! $feiten['is_deelnemer']) {
            $reden = $this->reden($evenement, $feiten);
            if ($reden === DeelnameGeweigerd::GESLOTEN || $reden === DeelnameGeweigerd::GEBLOKKEERD) {
                throw new DeelnameGeweigerd($reden, $evenement->id);
            }
            $this->onthoudBekeken($gebruiker->id, $evenement->id);
        }

        return [
            'evenement' => $this->weergave->evenementBasis($evenement),
            'deelname'  => $this->status($evenement, $feiten),
        ];
    }

    /**
     * Makes me a deelnemer; nothing happens when I already am one.
     *
     * @throws DeelnameGeweigerd
     */
    public function deelnemen(Gebruiker $gebruiker, Evenement $evenement): void {
        if ($this->controleer($gebruiker, $evenement)) {
            return;
        }

        $this->evenementService->joinByCode($evenement->code, $gebruiker->id);
    }

    /**
     * Checks that I am, or may become, a deelnemer. Returns true when I already am one. When a ticket is
     * missing or the evenement hasn't started, the view is remembered so the app can show the tickets.
     *
     * @throws DeelnameGeweigerd
     */
    public function controleer(Gebruiker $gebruiker, Evenement $evenement): bool {
        $feiten = $this->feiten($gebruiker->id, $evenement);

        if ($feiten['is_deelnemer']) {
            return true;
        }

        $reden = $this->reden($evenement, $feiten);

        if ($reden !== null) {
            $geweigerd = new DeelnameGeweigerd($reden, $evenement->id);
            if ($geweigerd->viaTickets()) {
                $this->onthoudBekeken($gebruiker->id, $evenement->id);
            }
            throw $geweigerd;
        }

        return false;
    }

    /** The "deelname" object of the API (see API.md). */
    public function deelname(Gebruiker $gebruiker, Evenement $evenement): array {
        return $this->status($evenement, $this->feiten($gebruiker->id, $evenement));
    }

    protected function status(Evenement $evenement, array $feiten): array {
        return [
            'is_deelnemer'  => $feiten['is_deelnemer'],
            'heeft_ticket'  => $feiten['heeft_ticket'],
            'gestart'       => $this->gestart($evenement),
            'kan_deelnemen' => ! $feiten['is_deelnemer'] && $this->reden($evenement, $feiten) === null,
        ];
    }

    /** Why I can't become deelnemer (a DeelnameGeweigerd reden), or null when I can. */
    protected function reden(Evenement $evenement, array $feiten): ?string {
        if (! $evenement->open) {
            return DeelnameGeweigerd::GESLOTEN;
        }
        if ($feiten['geblokkeerd']) {
            return DeelnameGeweigerd::GEBLOKKEERD;
        }
        if ($evenement->heeft_tickets) {
            if (! $feiten['heeft_ticket']) {
                return DeelnameGeweigerd::TICKET_NODIG;
            }
            if (! $this->gestart($evenement)) {
                return DeelnameGeweigerd::NIET_GESTART;
            }
        }

        return null;
    }

    protected function gestart(Evenement $evenement): bool {
        return $evenement->start_datum !== null && $evenement->start_datum->lte(now());
    }

    /** @return array{is_deelnemer: bool, geblokkeerd: bool, heeft_ticket: bool} */
    protected function feiten(int $gebruikerId, Evenement $evenement): array {
        $geblokkeerd = DB::table('gebruiker_evenement')
            ->where('gebruiker_id', $gebruikerId)
            ->where('evenement_id', $evenement->id)
            ->value('geblokkeerd');

        return [
            'is_deelnemer' => $geblokkeerd !== null && ! $geblokkeerd,
            'geblokkeerd'  => (bool) $geblokkeerd,
            'heeft_ticket' => DB::table('gebruiker_ticket')
                ->join('tickets', 'tickets.id', '=', 'gebruiker_ticket.ticket_id')
                ->where('gebruiker_ticket.gebruiker_id', $gebruikerId)
                ->where('tickets.evenement_id', $evenement->id)
                ->exists(),
        ];
    }

    protected function onthoudBekeken(int $gebruikerId, int $evenementId): void {
        $nu = now();

        DB::table('bekeken_evenementen')->upsert(
            [['gebruiker_id' => $gebruikerId, 'evenement_id' => $evenementId, 'created_at' => $nu, 'updated_at' => $nu]],
            ['gebruiker_id', 'evenement_id'],
            ['updated_at'],
        );
    }
}
