<?php

namespace App\Services\Mobiel;

use App\Models\Evenement;
use App\Models\Gebruiker;
use App\Models\Groep;
use App\Models\Munt;
use App\Models\Opwaardering;
use App\Models\Ticket;
use App\Models\Transactie;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Opwaarderen and tickets kopen WITHOUT a real payment (test betalingen), until Mollie is built: everything is
 * booked straight away. Only works while config('lagapay.test_betalingen') is on.
 */
class BetaalService {
    public function __construct(
        protected ToegangService $toegang,
        protected EvenementOverzichtService $overzicht,
        protected GroepService $groepen,
    ) {}

    /**
     * Adds munten to my persoonlijk saldo or my groep's saldo, as a paid opwaardering. Returns the new saldo.
     *
     * @throws \DomainException test betalingen off, evenement gesloten
     * @throws ValidationException voor = groep while I'm not in a groep
     */
    public function opwaarderen(Gebruiker $gebruiker, Evenement $evenement, int $munten, string $voor): int {
        $this->testBetalingenAan();

        if (! $evenement->open) {
            throw new \DomainException('Dit evenement is gesloten.');
        }

        $groep = $voor === 'groep' ? $this->toegang->mijnGroep($gebruiker->id, $evenement->id) : null;

        if ($voor === 'groep' && ! $groep) {
            throw ValidationException::withMessages(['voor' => 'Je zit niet in een groep van dit evenement.']);
        }

        return DB::transaction(function () use ($gebruiker, $evenement, $munten, $groep) {
            Opwaardering::create([
                'mollie_id'    => 'test_' . Str::uuid(),
                'status'       => 'paid',
                'amount'       => $this->bedrag($evenement, $munten),
                'method'       => 'test',
                'gebruiker_id' => $gebruiker->id,
                'evenement_id' => $evenement->id,
            ]);

            $this->boek($gebruiker, $evenement, $groep, 'opwaardering', $munten);

            return $groep ? $this->groepen->saldo($groep->id) : $this->overzicht->saldo($gebruiker->id, $evenement->id);
        });
    }

    /**
     * Buys a ticket: links it to me and adds its included munten to my persoonlijk saldo.
     *
     * @throws \DomainException test betalingen off, evenement gesloten or without tickets
     * @throws TicketAlGekocht
     */
    public function koopTicket(Gebruiker $gebruiker, Evenement $evenement, Ticket $ticket): void {
        $this->testBetalingenAan();

        if (! $evenement->open) {
            throw new \DomainException('Dit evenement is gesloten.');
        }
        if (! $evenement->heeft_tickets) {
            throw new \DomainException('Dit evenement heeft geen tickets.');
        }

        DB::transaction(function () use ($gebruiker, $evenement, $ticket) {
            // Lock the ticket, so a double tap can't buy it twice.
            Ticket::whereKey($ticket->id)->lockForUpdate()->first();

            $alGekocht = DB::table('gebruiker_ticket')
                ->where('gebruiker_id', $gebruiker->id)
                ->where('ticket_id', $ticket->id)
                ->exists();

            if ($alGekocht) {
                throw new TicketAlGekocht('Je hebt dit ticket al.');
            }

            DB::table('gebruiker_ticket')->insert(['gebruiker_id' => $gebruiker->id, 'ticket_id' => $ticket->id]);

            if ($ticket->munten > 0) {
                $this->boek($gebruiker, $evenement, null, 'ticket', $ticket->munten);
            }
        });
    }

    /** A transactie plus the matching change of the wallet (persoonlijk, or the groep's when $groep is set). */
    protected function boek(Gebruiker $gebruiker, Evenement $evenement, ?Groep $groep, string $type, int $munten): void {
        $transactie = Transactie::create([
            'gebruiker_id' => $gebruiker->id,
            'evenement_id' => $evenement->id,
            'groep_id'     => $groep?->id,
            'hoeveelheid'  => $munten,
            'type'         => $type,
        ]);

        // Saldo is the sum of the wallet's munten rows (see API.md); the change goes on one row per wallet:
        // persoonlijk = my row without groep, groep = the groep's row without gebruiker.
        $rij = Munt::query()
            ->where('evenement_id', $evenement->id)
            ->when(
                $groep,
                fn ($query) => $query->where('groep_id', $groep->id)->whereNull('gebruiker_id'),
                fn ($query) => $query->where('gebruiker_id', $gebruiker->id)->whereNull('groep_id'),
            )
            ->lockForUpdate()
            ->first();

        if ($rij) {
            $rij->update(['hoeveelheid' => $rij->hoeveelheid + $munten, 'laatste_transactie' => $transactie->id]);
        } else {
            Munt::create([
                'gebruiker_id'       => $groep ? null : $gebruiker->id,
                'evenement_id'       => $evenement->id,
                'groep_id'           => $groep?->id,
                'hoeveelheid'        => $munten,
                'laatste_transactie' => $transactie->id,
            ]);
        }
    }

    /** munten × munt_prijs in euros, as a decimal string ("30.00"); calculated in cents. */
    protected function bedrag(Evenement $evenement, int $munten): string {
        $centen = (int) round((float) $evenement->munt_prijs * 100) * $munten;

        return number_format($centen / 100, 2, '.', '');
    }

    protected function testBetalingenAan(): void {
        if (! config('lagapay.test_betalingen')) {
            throw new \DomainException('Betalen is nog niet beschikbaar.');
        }
    }
}
