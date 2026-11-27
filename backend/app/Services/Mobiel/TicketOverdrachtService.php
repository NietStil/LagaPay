<?php

namespace App\Services\Mobiel;

use App\Models\Evenement;
use App\Models\Gebruiker;
use App\Models\GekochtTicket;
use App\Models\TicketOverdracht;
use App\Services\Mobiel\Exceptions\DeelnameGeweigerd;
use App\Services\Mobiel\Exceptions\TicketOverdrachtFout;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;

/**
 * Giving a ticket to a friend. Every ticket has its own link ({link_url}/t/{deel_code}); the holder sends it to one
 * friend, also when they got the ticket from someone else. The friend sees which ticket it is (voorbeeld) and claims
 * exactly that ticket (accepteer), which gives it a new link. They join, and get its munten, when it is scanned.
 */
class TicketOverdrachtService {
    public function __construct(
        protected Weergave $weergave,
        protected DeelnameService $deelname,
    ) {}

    /**
     * Opening a ticket link, before claiming: which ticket it is, from whom, and whether I can claim it.
     * `status`: beschikbaar, eigen_link (I hold it), al_ticket (I have a ticket for this evenement already),
     * gebruikt, gesloten, geblokkeerd.
     *
     * @throws ModelNotFoundException unknown link (also an old link of a ticket that changed hands)
     */
    public function voorbeeld(Gebruiker $ik, string $deelCode): array {
        $gekocht = $this->opLink($deelCode);

        return [
            'status'    => $this->status($ik, $gekocht),
            'ticket'    => [
                'naam'   => $gekocht->ticket->naam,
                // Tickets from before munten were paid per scan already paid out to the buyer.
                'munten' => $gekocht->munten_uitgekeerd ? null : $gekocht->ticket->munten,
            ],
            'evenement' => $this->weergave->evenementBasis($gekocht->ticket->evenement),
            // Who gives it: the holder.
            'van'       => $gekocht->gebruiker?->voornaam,
            'deelname'  => $this->deelname->deelname($ik, $gekocht->ticket->evenement),
        ];
    }

    /**
     * Claims the ticket of this link: it becomes mine with a new QR code (the one the giver saw stops working) and a
     * new link (the old one stops working, and I can pass it on with mine). I join when the deelname rules allow it,
     * which for evenementen with tickets is once it is scanned.
     * Answers with `resultaat`: gekregen, or (nothing changed) eigen_link, al_ticket.
     *
     * @throws ModelNotFoundException unknown link
     * @throws DeelnameGeweigerd gesloten or geblokkeerd
     * @throws TicketOverdrachtFout 409 claimed by someone else in the meantime, or used
     */
    public function accepteer(Gebruiker $ik, string $deelCode): array {
        $gekocht = $this->opLink($deelCode);
        $evenement = $gekocht->ticket->evenement;
        $gever = $gekocht->gebruiker;

        $resultaat = DB::transaction(function () use ($ik, $gekocht, $deelCode) {
            // Locked and read again, so two friends opening the link at once can't both get it: the first claim
            // changes the link.
            $vergrendeld = GekochtTicket::with(['ticket.evenement'])->lockForUpdate()->findOrFail($gekocht->id);

            if ($vergrendeld->deel_code !== $deelCode) {
                return 'opgehaald';
            }

            $status = $this->status($ik, $vergrendeld);

            if ($status !== 'beschikbaar') {
                return $status;
            }

            TicketOverdracht::create([
                'gekocht_ticket_id' => $vergrendeld->id,
                'van_gebruiker_id'  => $vergrendeld->gebruiker_id,
                'naar_gebruiker_id' => $ik->id,
            ]);

            // munten_uitgekeerd stays as it is: unscanned tickets haven't paid out, and tickets from before munten were
            // paid per scan already paid out to the buyer.
            $vergrendeld->update([
                'gebruiker_id' => $ik->id,
                'gekocht_door' => $vergrendeld->koperId(),
                'code'         => GekochtTicket::nieuweCode(),
                'deel_code'    => GekochtTicket::nieuweDeelCode(),
            ]);

            return 'gekregen';
        });

        match ($resultaat) {
            'gesloten', 'geblokkeerd' => throw new DeelnameGeweigerd($resultaat, $evenement->id),
            'opgehaald' => throw new TicketOverdrachtFout(
                'Dit ticket is net door iemand anders opgehaald.',
                409,
                ['reden' => 'opgehaald', 'evenement_id' => $evenement->id],
            ),
            'gebruikt' => throw new TicketOverdrachtFout(
                'Dit ticket is al gebruikt.',
                409,
                ['reden' => 'gebruikt', 'evenement_id' => $evenement->id],
            ),
            default => null,
        };

        // Join straight away when the rules allow it (open, not blocked, and for evenementen with tickets: a ticket of
        // mine was scanned); otherwise the app shows the tickets screen. The munten are credited when the ticket is scanned.
        $deelname = $this->deelname->deelname($ik, $evenement);

        if ($deelname['kan_deelnemen'] || $deelname['is_deelnemer']) {
            $this->deelname->deelnemen($ik, $evenement);
        }

        return [
            'resultaat' => $resultaat,
            'evenement' => $this->weergave->evenementBasis($evenement),
            'van'       => $gever?->voornaam,
            'deelname'  => $this->deelname->deelname($ik, $evenement),
        ];
    }

    /** What claiming this ticket would do for me (see voorbeeld()). */
    protected function status(Gebruiker $ik, GekochtTicket $gekocht): string {
        $evenement = $gekocht->ticket->evenement;

        if ((int) $gekocht->gebruiker_id === $ik->id) {
            return 'eigen_link';
        }
        if ($gekocht->gebruikt) {
            return 'gebruikt';
        }
        if (! $evenement->open) {
            return DeelnameGeweigerd::GESLOTEN;
        }

        $geblokkeerd = (bool) DB::table('gebruiker_evenement')
            ->where('gebruiker_id', $ik->id)
            ->where('evenement_id', $evenement->id)
            ->value('geblokkeerd');

        if ($geblokkeerd) {
            return DeelnameGeweigerd::GEBLOKKEERD;
        }

        // One ticket per friend: not when I hold a ticket for this evenement already (bought or received).
        $heeftTicket = $this->tickets($evenement)->where('gebruiker_ticket.gebruiker_id', $ik->id)->exists();

        return $heeftTicket ? 'al_ticket' : 'beschikbaar';
    }

    /** @throws ModelNotFoundException */
    protected function opLink(string $deelCode): GekochtTicket {
        return GekochtTicket::with(['ticket.evenement', 'gebruiker'])->where('deel_code', $deelCode)->firstOrFail();
    }

    /** Tickets of this evenement (gebruiker_ticket rows), to be filtered further. */
    protected function tickets(Evenement $evenement): \Illuminate\Database\Eloquent\Builder {
        return GekochtTicket::query()
            ->select('gebruiker_ticket.*')
            ->join('tickets', 'tickets.id', '=', 'gebruiker_ticket.ticket_id')
            ->where('tickets.evenement_id', $evenement->id);
    }
}
