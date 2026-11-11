<?php

namespace App\Services\Mobiel;

use App\Models\Evenement;
use App\Models\Gebruiker;
use App\Models\GekochtTicket;
use App\Models\Opwaardering;
use App\Models\Ticket;
use App\Models\TicketUitnodiging;
use Illuminate\Database\Eloquent\ModelNotFoundException;
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
        protected PortemonneeService $portemonnee,
        protected TicketMuntenService $ticketMunten,
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
            $opwaardering = Opwaardering::create([
                'mollie_id'    => 'test_' . Str::uuid(),
                'status'       => 'paid',
                'amount'       => $this->bedrag($evenement, $munten),
                'method'       => 'test',
                'gebruiker_id' => $gebruiker->id,
                'evenement_id' => $evenement->id,
            ]);

            $this->portemonnee->boek($gebruiker, $evenement, $groep, 'opwaardering', $munten, $opwaardering->id);

            return $groep ? $this->groepen->saldo($groep->id) : $this->overzicht->saldo($gebruiker->id, $evenement->id);
        });
    }

    /**
     * Buys several tickets in one go. $bestelling is [ticket id => ['aantal' => n, 'voor_vrienden' => m]]: m of the n
     * tickets of that type are put on offer for friends (te_geven, taken through my uitnodigingslink) instead of
     * being mine. Every ticket is its own row with its own QR code. The included munten go to the holder once
     * they are a deelnemer, so none are credited for tickets on offer.
     *
     * @throws \DomainException test betalingen off, evenement gesloten or without tickets
     * @throws ModelNotFoundException a ticket that isn't of this evenement
     */
    public function koopTickets(Gebruiker $gebruiker, Evenement $evenement, array $bestelling): void {
        $this->testBetalingenAan();

        if (! $evenement->open) {
            throw new \DomainException('Dit evenement is gesloten.');
        }
        if (! $evenement->heeft_tickets) {
            throw new \DomainException('Dit evenement heeft geen tickets.');
        }

        $tickets = Ticket::where('evenement_id', $evenement->id)->whereIn('id', array_keys($bestelling))->get()->keyBy('id');

        if ($tickets->count() !== count($bestelling)) {
            throw (new ModelNotFoundException())->setModel(Ticket::class);
        }

        DB::transaction(function () use ($gebruiker, $evenement, $bestelling, $tickets) {
            $voorVrienden = 0;

            foreach ($bestelling as $ticketId => $regel) {
                for ($i = 0; $i < $regel['aantal']; $i++) {
                    GekochtTicket::create([
                        'gebruiker_id' => $gebruiker->id,
                        'ticket_id'    => $tickets[$ticketId]->id,
                        'gekocht_door' => $gebruiker->id,
                        'code'         => GekochtTicket::nieuweCode(),
                        'te_geven'     => $i < $regel['voor_vrienden'],
                    ]);
                }

                $voorVrienden += $regel['voor_vrienden'];
            }

            if ($voorVrienden > 0) {
                TicketUitnodiging::voor($gebruiker->id, $evenement->id);
            }

            // Already a deelnemer: the tickets I keep pay out right away. Otherwise at joining.
            $this->ticketMunten->uitkeren($gebruiker, $evenement);
        });
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
