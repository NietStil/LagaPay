<?php

namespace App\Services\Mobiel;

use App\Models\Evenement;
use App\Models\Gebruiker;
use App\Models\GekochtTicket;
use App\Models\TicketUitnodiging;
use App\Services\Mobiel\Exceptions\DeelnameGeweigerd;
use App\Services\Mobiel\Exceptions\TicketOverdrachtFout;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;

/**
 * Tickets for friends. The buyer puts tickets on offer (te_geven) and shares one link ({link_url}/t/{code});
 * a friend opening it gets one of those tickets, becomes deelnemer when the deelname rules allow it, and gets
 * the munten of that ticket. The friend never has to handle the ticket.
 */
class TicketOverdrachtService {
    public function __construct(
        protected Weergave $weergave,
        protected DeelnameService $deelname,
        protected TicketMuntenService $ticketMunten,
    ) {}

    /**
     * Puts one of my tickets on offer for a friend, or takes it back.
     *
     * @throws ModelNotFoundException not my ticket of this evenement
     * @throws TicketOverdrachtFout 403 given to me / gesloten, 409 used or munten already in use
     */
    public function zetTeGeven(Gebruiker $gebruiker, Evenement $evenement, int $gekochtTicketId, bool $teGeven): void {
        DB::transaction(function () use ($gebruiker, $evenement, $gekochtTicketId, $teGeven) {
            $gekocht = GekochtTicket::query()
                ->select('gebruiker_ticket.*')
                ->join('tickets', 'tickets.id', '=', 'gebruiker_ticket.ticket_id')
                ->where('gebruiker_ticket.id', $gekochtTicketId)
                ->where('gebruiker_ticket.gebruiker_id', $gebruiker->id)
                ->where('tickets.evenement_id', $evenement->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($gekocht->gekocht_door !== null && (int) $gekocht->gekocht_door !== $gebruiker->id) {
                throw new TicketOverdrachtFout('Dit ticket heb je gekregen, je kunt het niet doorgeven.', 403);
            }
            if ($gekocht->gebruikt) {
                throw new TicketOverdrachtFout('Dit ticket is al gebruikt.', 409);
            }
            if (! $evenement->open) {
                throw new TicketOverdrachtFout('Dit evenement is gesloten.', 403);
            }
            if ($gekocht->te_geven === $teGeven) {
                return;
            }
            if ($teGeven && $gekocht->munten_uitgekeerd) {
                throw new TicketOverdrachtFout('De munten van dit ticket staan al op je saldo, dit ticket kun je niet meer weggeven.', 409);
            }

            $gekocht->update(['te_geven' => $teGeven, 'gekocht_door' => $gebruiker->id]);

            if ($teGeven) {
                TicketUitnodiging::voor($gebruiker->id, $evenement->id);
            } else {
                // Mine again: the munten are credited (when I'm a deelnemer).
                $this->ticketMunten->uitkeren($gebruiker, $evenement);
            }
        });
    }

    /**
     * Opening a buyer's uitnodigingslink: takes one of their tickets on offer, and joins when allowed.
     * Answers with `resultaat`: gekregen, al_ontvangen (I already took one from this buyer), al_ticket
     * (I have a ticket of my own), eigen_link (it's my own link).
     *
     * @throws ModelNotFoundException unknown code
     * @throws DeelnameGeweigerd gesloten or geblokkeerd
     * @throws TicketOverdrachtFout 409 all tickets are given away
     */
    public function accepteer(Gebruiker $ik, string $code): array {
        $uitnodiging = TicketUitnodiging::with(['evenement', 'gebruiker'])->where('code', $code)->firstOrFail();
        $evenement = $uitnodiging->evenement;
        $koper = $uitnodiging->gebruiker;

        if ($koper->id === $ik->id) {
            return $this->antwoord('eigen_link', $ik, $evenement);
        }

        $geblokkeerd = (bool) DB::table('gebruiker_evenement')
            ->where('gebruiker_id', $ik->id)
            ->where('evenement_id', $evenement->id)
            ->value('geblokkeerd');

        if (! $evenement->open) {
            throw new DeelnameGeweigerd(DeelnameGeweigerd::GESLOTEN, $evenement->id);
        }
        if ($geblokkeerd) {
            throw new DeelnameGeweigerd(DeelnameGeweigerd::GEBLOKKEERD, $evenement->id);
        }

        $ontvangen = DB::transaction(function () use ($ik, $koper, $evenement) {
            // A ticket of my own (or one I took before): don't take another one.
            $eigen = $this->tickets($evenement)
                ->where('gebruiker_ticket.gebruiker_id', $ik->id)
                ->where('gebruiker_ticket.te_geven', false)
                ->orderBy('gebruiker_ticket.id')
                ->first();

            if ($eigen) {
                return (int) $eigen->gekocht_door === $koper->id ? 'al_ontvangen' : 'al_ticket';
            }

            // The first ticket on offer. Locked, so two friends can't take the same one.
            $aanbod = $this->tickets($evenement)
                ->where('gebruiker_ticket.gebruiker_id', $koper->id)
                ->where('gebruiker_ticket.gekocht_door', $koper->id)
                ->where('gebruiker_ticket.te_geven', true)
                ->where('gebruiker_ticket.gebruikt', false)
                ->orderBy('gebruiker_ticket.id')
                ->lockForUpdate()
                ->first();

            if (! $aanbod) {
                throw new TicketOverdrachtFout(
                    "Alle tickets van {$koper->voornaam} zijn al vergeven.",
                    409,
                    ['reden' => 'vol', 'evenement_id' => $evenement->id],
                );
            }

            // New code: the QR the buyer saw (or screenshotted) stops working.
            $aanbod->update([
                'gebruiker_id'      => $ik->id,
                'te_geven'          => false,
                'munten_uitgekeerd' => false,
                'code'              => GekochtTicket::nieuweCode(),
                'overgedragen_op'   => now(),
            ]);

            return 'gekregen';
        });

        // Join straight away when the rules allow it (open, not blocked, and for evenementen with tickets: a ticket of
        // mine was scanned); otherwise the app shows the tickets screen. The munten are credited once I'm a deelnemer.
        $deelname = $this->deelname->deelname($ik, $evenement);

        if ($deelname['kan_deelnemen'] || $deelname['is_deelnemer']) {
            $this->deelname->deelnemen($ik, $evenement);
        }

        return $this->antwoord($ontvangen, $ik, $evenement, $koper);
    }

    /** The buyer's tickets of this evenement (gebruiker_ticket rows), to be filtered further. */
    protected function tickets(Evenement $evenement): \Illuminate\Database\Eloquent\Builder {
        return GekochtTicket::query()
            ->select('gebruiker_ticket.*')
            ->join('tickets', 'tickets.id', '=', 'gebruiker_ticket.ticket_id')
            ->where('tickets.evenement_id', $evenement->id);
    }

    protected function antwoord(string $resultaat, Gebruiker $ik, Evenement $evenement, ?Gebruiker $koper = null): array {
        return [
            'resultaat' => $resultaat,
            'evenement' => $this->weergave->evenementBasis($evenement),
            'van'       => $koper?->voornaam,
            'deelname'  => $this->deelname->deelname($ik, $evenement),
        ];
    }
}
