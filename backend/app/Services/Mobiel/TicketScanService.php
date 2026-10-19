<?php

namespace App\Services\Mobiel;

use App\Models\Evenement;
use App\Models\Gebruiker;
use App\Models\GekochtTicket;

/**
 * Scanning a ticket QR code at the entrance: marks the ticket as used and makes its holder a deelnemer (for
 * evenementen with tickets that is the only way in; see DeelnameService). Only the organiser of the ticket's
 * evenement (or an admin) may scan. There is no scanner screen yet; this is the API a scanner calls.
 */
class TicketScanService {
    public function __construct(
        protected Weergave $weergave,
        protected DeelnameService $deelname,
    ) {}

    /**
     * @param  string  $gescand  the QR content ("LAGAPAY-TICKET:{code}") or a typed code
     * @param  int|null  $evenementId  the evenement being scanned for: a ticket of another evenement is refused
     *
     * @throws TicketScanFout 404 unknown, 403 not my evenement, 422 other evenement, 409 already used
     */
    public function scan(Gebruiker $scanner, string $gescand, ?int $evenementId = null): array {
        $gekocht = GekochtTicket::with(['ticket.evenement', 'gebruiker'])
            ->where('code', GekochtTicket::codeUit($gescand))
            ->first();

        if (! $gekocht) {
            throw new TicketScanFout('Ticket niet gevonden.', 404);
        }

        $evenement = $gekocht->ticket->evenement;

        if ($scanner->rol !== 'admin' && (int) $evenement->gebruiker !== $scanner->id) {
            throw new TicketScanFout('Je mag tickets van dit evenement niet scannen.', 403);
        }

        if ($evenementId !== null && $evenementId !== $evenement->id) {
            throw new TicketScanFout("Dit ticket is voor {$evenement->naam}.", 422, $this->ticket($gekocht));
        }

        $this->markeer($gekocht);

        return $this->ticket($gekocht);
    }

    /**
     * Development only (config lagapay.dev_scan): scans one of my own tickets as if at the entrance.
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException not my ticket of this evenement
     * @throws TicketScanFout 409 already used
     */
    public function devScan(Gebruiker $houder, Evenement $evenement, int $ticketId): void {
        $gekocht = GekochtTicket::with(['ticket.evenement', 'gebruiker'])
            ->whereKey($ticketId)
            ->where('gebruiker_id', $houder->id)
            ->whereHas('ticket', fn ($q) => $q->where('evenement_id', $evenement->id))
            ->firstOrFail();

        $this->markeer($gekocht);
    }

    /**
     * Marks the ticket as used, then makes its holder a deelnemer (and credits the ticket's munten). A gesloten
     * evenement or a blocked holder only gets the ticket marked.
     *
     * @throws TicketScanFout 409 already used
     */
    protected function markeer(GekochtTicket $gekocht): void {
        // Only one scan can flip gebruikt, even when two scanners read the same code at the same moment.
        $gemarkeerd = GekochtTicket::whereKey($gekocht->id)
            ->where('gebruikt', false)
            ->update(['gebruikt' => true, 'gebruikt_op' => now()]);

        $gekocht->refresh();

        if (! $gemarkeerd) {
            throw new TicketScanFout('Dit ticket is al gebruikt.', 409, $this->ticket($gekocht));
        }

        try {
            $this->deelname->deelnemen($gekocht->gebruiker, $gekocht->ticket->evenement);
        } catch (DeelnameGeweigerd) {
            // gesloten or geblokkeerd: the ticket stays scanned, the holder doesn't join.
        }
    }

    protected function ticket(GekochtTicket $gekocht): array {
        return [
            'id'          => $gekocht->id,
            'naam'        => $gekocht->ticket->naam,
            'evenement'   => ['id' => $gekocht->ticket->evenement->id, 'naam' => $gekocht->ticket->evenement->naam],
            'eigenaar'    => $gekocht->gebruiker->name,
            'gebruikt'    => $gekocht->gebruikt,
            'gebruikt_op' => $this->weergave->datum($gekocht->gebruikt_op),
        ];
    }
}
