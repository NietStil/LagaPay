<?php

namespace App\Services\Mobiel;

use App\Models\Evenement;
use App\Models\Gebruiker;
use App\Models\Ticket;
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

        $gekocht = Ticket::query()
            ->select('tickets.*')
            ->with('evenement')
            ->join('evenementen', 'evenementen.id', '=', 'tickets.evenement_id')
            ->whereIn('tickets.id', $this->mijnTicketIds($gebruiker->id))
            ->orderByDesc('evenementen.open')
            ->orderByDesc('evenementen.start_datum')
            ->orderByDesc('tickets.id')
            ->get()
            ->map(fn (Ticket $ticket) => [
                'id'        => $ticket->id,
                'naam'      => $ticket->naam,
                'prijs'     => $this->weergave->geld($ticket->prijs),
                'munten'    => $ticket->munten,
                'status'    => $ticket->evenement->open ? 'geldig' : 'verlopen',
                'evenement' => [
                    'id'           => $ticket->evenement->id,
                    'naam'         => $ticket->evenement->naam,
                    'start_datum'  => $this->weergave->datum($ticket->evenement->start_datum),
                    'eind_datum'   => $this->weergave->datum($ticket->evenement->eind_datum),
                    'open'         => (bool) $ticket->evenement->open,
                    // false: the app opens the tickets screen instead, with "Deelnemen" once the evenement has started.
                    'is_deelnemer' => $deelnemerVan->has($ticket->evenement->id),
                ],
            ])
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
            ->withExists(['gebruikers as gekocht' => fn (Builder $query) => $query->where('gebruikers.id', $gebruiker->id)])
            ->orderBy('prijs')
            ->orderBy('id')
            ->get()
            ->map(fn (Ticket $ticket) => [
                'id'      => $ticket->id,
                'naam'    => $ticket->naam,
                'prijs'   => $this->weergave->geld($ticket->prijs),
                'munten'  => $ticket->munten,
                'gekocht' => (bool) $ticket->gekocht,
            ])
            ->all();

        return [
            'evenement' => $this->weergave->evenementBasis($evenement),
            'tickets'   => $tickets,
            'deelname'  => $this->deelname->deelname($gebruiker, $evenement),
        ];
    }

    protected function mijnTicketIds(int $gebruikerId): \Illuminate\Database\Query\Builder {
        return DB::table('gebruiker_ticket')->select('ticket_id')->where('gebruiker_id', $gebruikerId);
    }
}
