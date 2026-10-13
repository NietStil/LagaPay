<?php

namespace Database\Seeders;

use App\Models\Evenement;
use App\Models\Gebruiker;
use App\Models\Munt;
use App\Models\Opwaardering;
use App\Models\Ticket;
use App\Models\Transactie;
use Illuminate\Database\Seeder;

class TransactieSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Loop door elke gebruiker voor reguliere transacties per evenement
        Gebruiker::all()->each(function ($gebruiker) {

            // Haal de evenementen op waarvoor deze gebruiker een ticket heeft
            $evenementenIds = $gebruiker->tickets()->pluck('evenement_id')->unique();

            if ($evenementenIds->isEmpty()) {
                return;
            }

            foreach ($evenementenIds as $eventId) {
                $transactions = collect();

                // Maak 5 transacties per evenement voor deze gebruiker
                for ($i = 0; $i < 5; $i++) {
                    // Kies willekeurig of het een opwaardering of uitgave is
                    $type = fake()->randomElement(['opwaardering', 'uitgave']);
                    $hoeveelheid = fake()->numberBetween(5, 50);

                    // Timestamp van vandaag
                    $randomTodayTimestamp = fake()->dateTimeBetween('today 00:00:00', 'now');

                    // Maak de transactie aan
                    $transactie = Transactie::create([
                        'gebruiker_id' => $gebruiker->id,
                        'evenement_id' => $eventId,
                        'groep_id'     => $gebruiker->groepen()->inRandomOrder()->first()?->id ?? null,
                        'hoeveelheid'  => $hoeveelheid,
                        'type'         => $type,
                        'created_at'   => $randomTodayTimestamp,
                        'updated_at'   => $randomTodayTimestamp,
                    ]);

                    $transactions->push($transactie);

                    // Als het type 'opwaardering' is, voeg dit dan toe aan de opwaarderingen tabel
                    if ($type === 'opwaardering') {
                        Opwaardering::create([
                            'mollie_id'    => 'tr_' . fake()->regexify('[A-Za-z0-9_-]{10}'),
                            'status'       => 'paid',
                            'amount'       => $hoeveelheid,
                            'method'       => fake()->randomElement(['ideal', 'creditcard', 'bancontact']),
                            'gebruiker_id' => $gebruiker->id,
                            'evenement_id' => $eventId,
                            'created_at'   => $randomTodayTimestamp,
                            'updated_at'   => $randomTodayTimestamp,
                        ]);
                    }
                }

                // Bereken de munten: som van opwaarderingen - som van uitgaven
                $totaalOpwaarderingen = $transactions->where('type', 'opwaardering')->sum('hoeveelheid');
                $totaalUitgaven = $transactions->where('type', 'uitgave')->sum('hoeveelheid');
                $saldo = $totaalOpwaarderingen - $totaalUitgaven;

                // Sla dit op in de munt tabel
                Munt::updateOrCreate(
                    [
                        'gebruiker_id' => $gebruiker->id,
                        'evenement_id' => $eventId,
                    ],
                    [
                        'groep_id' => $gebruiker->groepen()->inRandomOrder()->first()?->id ?? null,
                        'hoeveelheid' => max(0, $saldo), // Zorgt ervoor dat het saldo niet onder 0 duikt
                        'laatste_transactie' => null,
                    ]
                );
            }
        });

        // 2. Maak 200 individuele transacties zonder groep (groep_id is null) voor evenementen van deelnemers
        $gebruikersMetTickets = Gebruiker::whereHas('tickets')->get();

        if ($gebruikersMetTickets->isNotEmpty()) {
            for ($i = 0; $i < 200; $i++) {
                $gebruiker = $gebruikersMetTickets->random();
                $evenementenIds = $gebruiker->tickets()->pluck('evenement_id')->unique();

                if ($evenementenIds->isEmpty()) {
                    continue;
                }

                $eventId = $evenementenIds->random();
                $type = fake()->randomElement(['opwaardering', 'uitgave']);
                $hoeveelheid = fake()->numberBetween(5, 50);
                $randomTodayTimestamp = fake()->dateTimeBetween('today 00:00:00', 'now');

                Transactie::create([
                    'gebruiker_id' => $gebruiker->id,
                    'evenement_id' => $eventId,
                    'groep_id'     => null,
                    'hoeveelheid'  => $hoeveelheid,
                    'type'         => $type,
                    'created_at'   => $randomTodayTimestamp,
                    'updated_at'   => $randomTodayTimestamp,
                ]);

                if ($type === 'opwaardering') {
                    Opwaardering::create([
                        'mollie_id'    => 'tr_' . fake()->regexify('[A-Za-z0-9_-]{10}'),
                        'status'       => 'paid',
                        'amount'       => $hoeveelheid,
                        'method'       => fake()->randomElement(['ideal', 'creditcard', 'bancontact']),
                        'gebruiker_id' => $gebruiker->id,
                        'evenement_id' => $eventId,
                        'created_at'   => $randomTodayTimestamp,
                        'updated_at'   => $randomTodayTimestamp,
                    ]);
                }
            }
        }

        // 3. Geef elke gebruiker die aanwezig is op een evenement van de admin-gebruiker ~10 transacties
        $admin = Gebruiker::where('email', 'admin@example.com')->orWhere('rol', 'admin')->first();

        if ($admin) {
            $adminEvenementen = Evenement::where('gebruiker', $admin->id)->get();

            foreach ($adminEvenementen as $evenement) {
                $ticketIds = Ticket::where('evenement_id', $evenement->id)->pluck('id');

                $deelnemers = Gebruiker::whereHas('tickets', function ($q) use ($ticketIds) {
                    $q->whereIn('ticket_id', $ticketIds);
                })->get();

                foreach ($deelnemers as $deelnemer) {
                    $aantalTransacties = rand(9, 11); // Ongeveer 10 transacties per deelnemer

                    for ($j = 0; $j < $aantalTransacties; $j++) {
                        $type = fake()->randomElement(['opwaardering', 'uitgave']);
                        $hoeveelheid = fake()->numberBetween(5, 50);
                        $randomTodayTimestamp = fake()->dateTimeBetween('today 00:00:00', 'now');

                        $groepId = $deelnemer->groepen()
                            ->where('evenement_id', $evenement->id)
                            ->inRandomOrder()
                            ->first()?->id ?? null;

                        Transactie::create([
                            'gebruiker_id' => $deelnemer->id,
                            'evenement_id' => $evenement->id,
                            'groep_id'     => fake()->boolean(50) ? $groepId : null,
                            'hoeveelheid'  => $hoeveelheid,
                            'type'         => $type,
                            'created_at'   => $randomTodayTimestamp,
                            'updated_at'   => $randomTodayTimestamp,
                        ]);

                        if ($type === 'opwaardering') {
                            Opwaardering::create([
                                'mollie_id'    => 'tr_' . fake()->regexify('[A-Za-z0-9_-]{10}'),
                                'status'       => 'paid',
                                'amount'       => $hoeveelheid,
                                'method'       => fake()->randomElement(['ideal', 'creditcard', 'bancontact']),
                                'gebruiker_id' => $deelnemer->id,
                                'evenement_id' => $evenement->id,
                                'created_at'   => $randomTodayTimestamp,
                                'updated_at'   => $randomTodayTimestamp,
                            ]);
                        }
                    }
                }
            }
        }
    }
}
