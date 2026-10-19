<?php

namespace App\Services\Mobiel;

use App\Models\Evenement;
use App\Models\Gebruiker;
use App\Models\GekochtTicket;
use App\Models\Ticket;
use App\Models\TicketUitnodiging;
use Illuminate\Support\Collection;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class TicketOverzichtService {
    public function __construct(
        protected Weergave $weergave,
        protected DeelnameService $deelname,
    ) {}

    /** Tickets tab: my gekochte tickets and the evenementen with tickets I recently opened or joined without a ticket. */
    public function mijnTickets(Gebruiker $gebruiker): array {
        $deelnames = DB::table('gebruiker_evenement')
            ->where('gebruiker_id', $gebruiker->id)
            ->get(['evenement_id', 'geblokkeerd', 'updated_at']);
        $deelnemerVan = $deelnames->where('geblokkeerd', false)->pluck('evenement_id')->flip();

        // One card per evenement: how many tickets of each type I bought, and how many were used at the entrance.
        $gekocht = GekochtTicket::query()
            ->with('ticket.evenement')
            ->where('gebruiker_id', $gebruiker->id)
            ->get()
            ->groupBy(fn (GekochtTicket $gekocht) => $gekocht->ticket->evenement_id)
            ->sort(function (Collection $a, Collection $b) {
                $evenementA = $a->first()->ticket->evenement;
                $evenementB = $b->first()->ticket->evenement;

                // Open first, then the latest start first.
                return [$evenementB->open, $evenementB->start_datum, $evenementB->id]
                    <=> [$evenementA->open, $evenementA->start_datum, $evenementA->id];
            })
            ->map(function (Collection $perEvenement) use ($deelnemerVan) {
                $evenement = $perEvenement->first()->ticket->evenement;

                return [
                    'evenement'       => [
                        'id'           => $evenement->id,
                        'naam'         => $evenement->naam,
                        'start_datum'  => $this->weergave->datum($evenement->start_datum),
                        'eind_datum'   => $this->weergave->datum($evenement->eind_datum),
                        'open'         => (bool) $evenement->open,
                        'is_deelnemer' => $deelnemerVan->has($evenement->id),
                    ],
                    'status'          => $evenement->open ? 'geldig' : 'verlopen',
                    'aantal'          => $perEvenement->count(),
                    'aantal_gebruikt' => $perEvenement->where('gebruikt', true)->count(),
                    'aantal_te_geven' => $perEvenement->where('te_geven', true)->count(),
                    'soorten'         => $perEvenement
                        ->groupBy('ticket_id')
                        ->sortBy(fn (Collection $perSoort) => [(float) $perSoort->first()->ticket->prijs, $perSoort->first()->ticket_id])
                        ->map(fn (Collection $perSoort) => ['naam' => $perSoort->first()->ticket->naam, 'aantal' => $perSoort->count()])
                        ->values()
                        ->all(),
                    'munten'          => $perEvenement->sum(fn (GekochtTicket $gekocht) => (int) $gekocht->ticket->munten),
                ];
            })
            ->values()
            ->all();

        // When I last saw each evenement: opening its link (bekeken_evenementen) or joining it.
        $momenten = DB::table('bekeken_evenementen')
            ->where('gebruiker_id', $gebruiker->id)
            ->pluck('updated_at', 'evenement_id')
            ->map(fn ($moment) => (string) $moment)
            ->all();
        foreach ($deelnames->where('geblokkeerd', false) as $deelname) {
            $momenten[$deelname->evenement_id] = max($momenten[$deelname->evenement_id] ?? '', (string) $deelname->updated_at);
        }

        $recentBekeken = Evenement::query()
            ->whereIn('id', array_keys($momenten))
            ->whereNotIn('id', $deelnames->where('geblokkeerd', true)->pluck('evenement_id'))
            ->where('heeft_tickets', true)
            ->where('open', true)
            ->whereDoesntHave('tickets', fn (Builder $query) => $query->whereIn('tickets.id', $this->mijnTicketIds($gebruiker->id)))
            ->withMin('tickets as vanaf_prijs', 'prijs')
            ->get()
            ->sort(fn (Evenement $a, Evenement $b) => [$momenten[$b->id], $b->id] <=> [$momenten[$a->id], $a->id])
            ->take(10)
            ->map(fn (Evenement $evenement) => [
                'id'          => $evenement->id,
                'naam'        => $evenement->naam,
                'start_datum' => $this->weergave->datum($evenement->start_datum),
                'eind_datum'  => $this->weergave->datum($evenement->eind_datum),
                'vanaf_prijs' => $this->weergave->geld($evenement->vanaf_prijs),
            ])
            ->values()
            ->all();

        return [
            'gekocht'        => $gekocht,
            'recent_bekeken' => $recentBekeken,
        ];
    }

    /**
     * Tickets kopen: the ticket types of this evenement (prijs ascending), whether I bought each, and my deelname
     * status (this is also the screen the evenement link opens before I'm a deelnemer).
     *
     * @throws \DomainException the evenement has no tickets
     */
    public function evenementTickets(Gebruiker $gebruiker, Evenement $evenement): array {
        if (! $evenement->heeft_tickets) {
            throw new \DomainException('Dit evenement heeft geen tickets.');
        }

        $tickets = Ticket::where('evenement_id', $evenement->id)
            ->withCount(['gebruikers as aantal_gekocht' => fn (Builder $query) => $query->where('gebruikers.id', $gebruiker->id)])
            ->orderBy('prijs')
            ->orderBy('id')
            ->get()
            ->map(fn (Ticket $ticket) => [
                'id'             => $ticket->id,
                'naam'           => $ticket->naam,
                'prijs'          => $this->weergave->geld($ticket->prijs),
                'munten'         => $ticket->munten,
                'gekocht'        => $ticket->aantal_gekocht > 0,
                'aantal_gekocht' => (int) $ticket->aantal_gekocht,
            ])
            ->all();

        return [
            'evenement' => $this->weergave->evenementBasis($evenement),
            'tickets'   => $tickets,
            'deelname'  => $this->deelname->deelname($gebruiker, $evenement),
        ];
    }

    /** My bought tickets of this evenement, each with its QR code (the swipeable "Mijn tickets" screen). */
    public function mijnEvenementTickets(Gebruiker $gebruiker, Evenement $evenement): array {
        $this->zorgVoorCodes($gebruiker->id);

        $tickets = GekochtTicket::query()
            ->select('gebruiker_ticket.*')
            ->with(['ticket', 'gekochtDoor:id,voornaam'])
            ->join('tickets', 'tickets.id', '=', 'gebruiker_ticket.ticket_id')
            ->where('gebruiker_ticket.gebruiker_id', $gebruiker->id)
            ->where('tickets.evenement_id', $evenement->id)
            // My own tickets first, the ones waiting for a friend after them.
            ->orderBy('gebruiker_ticket.te_geven')
            ->orderBy('tickets.prijs')
            ->orderBy('tickets.id')
            ->orderBy('gebruiker_ticket.id')
            ->get()
            ->map(fn (GekochtTicket $gekocht) => [
                'id'           => $gekocht->id,
                'code'         => $gekocht->code,
                'qr'           => $gekocht->qr(),
                'naam'         => $gekocht->ticket->naam,
                'prijs'        => $this->weergave->geld($gekocht->ticket->prijs),
                'munten'       => $gekocht->ticket->munten,
                'gebruikt'     => $gekocht->gebruikt,
                'gebruikt_op'  => $this->weergave->datum($gekocht->gebruikt_op),
                'te_geven'     => $gekocht->te_geven,
                // Can be put on offer (or taken back): mine to give, unused, evenement open, munten not paid out yet.
                'kan_geven'    => ($gekocht->gekocht_door === null || (int) $gekocht->gekocht_door === $gebruiker->id)
                    && ! $gekocht->gebruikt
                    && $evenement->open
                    && ($gekocht->te_geven || ! $gekocht->munten_uitgekeerd),
                // Set when a friend gave me this ticket: the buyer's voornaam.
                'gekregen_van' => $gekocht->gekocht_door !== null && (int) $gekocht->gekocht_door !== $gebruiker->id
                    ? $gekocht->gekochtDoor?->voornaam
                    : null,
            ])
            ->all();

        return [
            'evenement'   => $this->weergave->evenementBasis($evenement),
            'tickets'     => $tickets,
            'uitnodiging' => $this->uitnodiging($gebruiker, $evenement),
            'deelname'    => $this->deelname->deelname($gebruiker, $evenement),
        ];
    }

    /**
     * My uitnodigingslink for this evenement with how many tickets are still on offer and who took one,
     * or null while I never put a ticket on offer.
     */
    protected function uitnodiging(Gebruiker $gebruiker, Evenement $evenement): ?array {
        $uitnodiging = TicketUitnodiging::where('gebruiker_id', $gebruiker->id)->where('evenement_id', $evenement->id)->first();

        if (! $uitnodiging) {
            return null;
        }

        $tickets = GekochtTicket::query()
            ->select('gebruiker_ticket.*')
            ->with('gebruiker:id,voornaam,tussenvoegsels,achternaam')
            ->join('tickets', 'tickets.id', '=', 'gebruiker_ticket.ticket_id')
            ->where('tickets.evenement_id', $evenement->id)
            ->where('gebruiker_ticket.gekocht_door', $gebruiker->id)
            ->get();

        $genomen = $tickets
            ->where('gebruiker_id', '!=', $gebruiker->id)
            ->sortBy('overgedragen_op')
            ->map(fn (GekochtTicket $gekocht) => [
                'naam'  => $gekocht->gebruiker->voornaam,
                'datum' => $this->weergave->datum($gekocht->overgedragen_op),
            ])
            ->values()
            ->all();

        return [
            'code'        => $uitnodiging->code,
            'link'        => $uitnodiging->link(),
            'beschikbaar' => $tickets->where('gebruiker_id', $gebruiker->id)->where('te_geven', true)->where('gebruikt', false)->count(),
            'vergeven'    => count($genomen),
            'genomen'     => $genomen,
        ];
    }

    /** Tickets added without a code (seeders, attach() in older code) get one, so every ticket has a QR code. */
    protected function zorgVoorCodes(int $gebruikerId): void {
        GekochtTicket::where('gebruiker_id', $gebruikerId)
            ->whereNull('code')
            ->get()
            ->each(fn (GekochtTicket $gekocht) => $gekocht->update(['code' => GekochtTicket::nieuweCode()]));
    }

    protected function mijnTicketIds(int $gebruikerId): \Illuminate\Database\Query\Builder {
        return DB::table('gebruiker_ticket')->select('ticket_id')->where('gebruiker_id', $gebruikerId);
    }
}
