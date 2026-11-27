<?php

namespace Tests\Feature;

use App\Models\Evenement;
use App\Models\Gebruiker;
use App\Models\Groep;
use App\Models\Kaart;
use App\Models\KaartKoppeling;
use App\Models\Munt;
use App\Models\Ticket;
use App\Models\Transactie;
use App\Services\Evenementen\EvenementService;
use App\Services\Evenementen\TicketService;
use App\Services\Mobiel\GroepService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * App endpoints from frontend/app-design/API.md.
 *
 * Run against sqlite (phpunit.xml) or a dedicated test database. Inside the docker container the real
 * DB_CONNECTION env var wins over phpunit.xml, so pass it explicitly, e.g.:
 *   docker exec -e DB_CONNECTION=sqlite -e DB_DATABASE=:memory: laravel-app php artisan test --filter=MobielApiTest
 */
class MobielApiTest extends TestCase
{
    use RefreshDatabase;

    /** Refuses to wipe a database that is not clearly meant for tests. */
    protected function beforeRefreshingDatabase(): void
    {
        $verbinding = config('database.default');
        $database = (string) config("database.connections.{$verbinding}.database");

        if (config("database.connections.{$verbinding}.driver") !== 'sqlite' && ! str_contains($database, 'test')) {
            $this->markTestSkipped("RefreshDatabase zou database [{$database}] leegmaken; gebruik sqlite of een testdatabase.");
        }
    }

    public function test_niet_ingelogd_geeft_401(): void
    {
        $this->getJson($this->url('/evenementen'))->assertUnauthorized();
    }

    public function test_evenement_routes_geven_404_voor_niet_deelnemers_en_geblokkeerden(): void
    {
        $ik = $this->inloggen();
        $vreemd = $this->evenement();
        $geblokkeerd = $this->evenement();
        $this->deelnemer($ik, $geblokkeerd, geblokkeerd: true);

        foreach ([$vreemd, $geblokkeerd] as $evenement) {
            foreach (['', '/transacties', '/groep', '/kaarten', '/tickets'] as $pad) {
                $this->getJson($this->url("/evenementen/{$evenement->id}{$pad}"))
                    ->assertNotFound()
                    ->assertExactJson(['message' => 'Evenement niet gevonden.']);
            }

            $this->postJson($this->url("/evenementen/{$evenement->id}/kaarten/permanent"))
                ->assertNotFound();
        }

        $this->getJson($this->url('/evenementen/999999'))->assertNotFound();
        $this->getJson($this->url('/evenementen'))->assertOk()->assertExactJson(['evenementen' => []]);
    }

    public function test_evenementen_lijst_met_persoonlijk_saldo_en_volgorde(): void
    {
        $ik = $this->inloggen();
        $ander = Gebruiker::factory()->create();

        $open = $this->evenement(['open' => true, 'start_datum' => now()->subDays(10), 'munt_prijs' => 1.5]);
        $nieuwerOpen = $this->evenement(['open' => true, 'start_datum' => now()->subDay()]);
        $gesloten = $this->evenement(['open' => false, 'start_datum' => now()->addDays(3)]);
        $geblokkeerd = $this->evenement();
        $this->evenement(); // not a deelnemer

        foreach ([$open, $nieuwerOpen, $gesloten] as $evenement) {
            $this->deelnemer($ik, $evenement);
        }
        $this->deelnemer($ik, $geblokkeerd, geblokkeerd: true);

        $groep = Groep::factory()->create(['evenement_id' => $open->id]);
        $this->munten($ik, $open, 10);
        $this->munten($ik, $open, 5);
        $this->munten($ik, $open, 100, $groep); // groep wallet, not persoonlijk
        $this->munten($ander, $open, 50);
        $this->munten($ik, $gesloten, 7);

        $response = $this->getJson($this->url('/evenementen'))->assertOk();

        $this->assertSame([$nieuwerOpen->id, $open->id, $gesloten->id], array_column($response->json('evenementen'), 'id'));
        $this->assertSame([0, 15, 7], array_column($response->json('evenementen'), 'saldo'));

        $open->refresh();
        $response->assertJsonPath('evenementen.1', [
            'id'                  => $open->id,
            'naam'                => $open->naam,
            'open'                => true,
            'start_datum'         => $open->start_datum->toIso8601String(),
            'eind_datum'          => $open->eind_datum->toIso8601String(),
            'telefoon_betaling'   => $open->telefoon_betaling,
            'munten_terugstorten' => $open->munten_terugstorten,
            'heeft_tickets'       => true,
            'munt_prijs'          => '1.50',
            'saldo'               => 15,
        ]);
    }

    public function test_overzicht_en_transacties_met_teken_en_filter(): void
    {
        $ik = $this->inloggen();
        $ander = Gebruiker::factory()->create();
        $evenement = $this->evenement();
        $this->deelnemer($ik, $evenement);
        $groep = Groep::factory()->create(['evenement_id' => $evenement->id]);

        $this->transactie($ik, $evenement, 'opwaardering', 20, minutenGeleden: 60);
        $this->transactie($ik, $evenement, 'uitgave', 5, minutenGeleden: 50);
        $this->transactie($ik, $evenement, 'ticket', 10, minutenGeleden: 40);
        $this->transactie($ik, $evenement, 'terugstorting', 3, minutenGeleden: 30);
        $this->transactie($ik, $evenement, 'bonus', 2, minutenGeleden: 20);
        $nieuwste = $this->transactie($ik, $evenement, 'opwaardering', 1, minutenGeleden: 10);
        $this->transactie($ik, $evenement, 'opwaardering', 40, $groep, minutenGeleden: 5); // groepsactiviteit
        $this->transactie($ander, $evenement, 'opwaardering', 40, minutenGeleden: 5);
        $this->munten($ik, $evenement, 25);

        $response = $this->getJson($this->url("/evenementen/{$evenement->id}"))
            ->assertOk()
            ->assertJsonPath('saldo', 25)
            ->assertJsonPath('groep', null)
            ->assertJsonPath('evenement.id', $evenement->id)
            ->assertJsonCount(5, 'activiteit')
            ->assertJsonPath('activiteit.0', [
                'id'        => $nieuwste->id,
                'type'      => 'opwaardering',
                'label'     => 'Opwaardering',
                'bedrag'    => 1,
                'datum'     => $nieuwste->fresh()->created_at->toIso8601String(),
                'gebruiker' => null,
            ]);

        $this->assertSame(
            [['bonus', 'Bonus', 2], ['terugstorting', 'Terugstorting', -3], ['ticket', 'Ticket: inbegrepen munten', 10], ['uitgave', 'Uitgave', -5]],
            array_map(fn ($t) => [$t['type'], $t['label'], $t['bedrag']], array_slice($response->json('activiteit'), 1)),
        );

        // Mijn groep is the lowest groep id I'm a member of.
        $tweedeGroep = Groep::factory()->create(['evenement_id' => $evenement->id]);
        $this->lidVan($ik, $tweedeGroep);
        $this->lidVan($ik, $groep);
        $this->getJson($this->url("/evenementen/{$evenement->id}"))
            ->assertJsonPath('groep', ['id' => $groep->id, 'naam' => $groep->naam]);

        $this->getJson($this->url("/evenementen/{$evenement->id}/transacties"))
            ->assertOk()
            ->assertJsonCount(6, 'transacties');

        $opwaarderingen = $this->getJson($this->url("/evenementen/{$evenement->id}/transacties?filter=opwaarderingen"))->assertOk();
        $this->assertSame([1, 2, 10, 20], array_column($opwaarderingen->json('transacties'), 'bedrag'));

        $uitgaven = $this->getJson($this->url("/evenementen/{$evenement->id}/transacties?filter=uitgaven"))->assertOk();
        $this->assertSame([-3, -5], array_column($uitgaven->json('transacties'), 'bedrag'));

        $this->getJson($this->url("/evenementen/{$evenement->id}/transacties?filter=iets"))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('filter');
    }

    public function test_groep_detail_met_leden_en_aandeel(): void
    {
        $ik = $this->inloggen(['voornaam' => 'Sam', 'achternaam' => 'Jansen']);
        $lisa = Gebruiker::factory()->create(['voornaam' => 'Lisa', 'tussenvoegsels' => 'de', 'achternaam' => 'Vries']);
        $bram = Gebruiker::factory()->create();
        $nul = Gebruiker::factory()->create();
        $evenement = $this->evenement();
        $groep = Groep::factory()->create(['evenement_id' => $evenement->id, 'naam' => 'Team Rood', 'code' => 'ROOD123']);
        config(['lagapay.link_url' => 'https://voorbeeld.nl/']);

        foreach ([$ik, $lisa, $bram, $nul] as $gebruiker) {
            $this->deelnemer($gebruiker, $evenement);
            $this->lidVan($gebruiker, $groep);
        }

        $this->transactie($ik, $evenement, 'opwaardering', 10, $groep, minutenGeleden: 40);
        $this->transactie($lisa, $evenement, 'opwaardering', 30, $groep, minutenGeleden: 30);
        $this->transactie($bram, $evenement, 'ticket', 20, $groep, minutenGeleden: 20);
        $laatste = $this->transactie($bram, $evenement, 'uitgave', 50, $groep, minutenGeleden: 10);
        $this->transactie($ik, $evenement, 'opwaardering', 99); // persoonlijk, does not count
        $this->munten($ik, $evenement, 7, $groep);
        $this->munten($lisa, $evenement, 3, $groep);

        // Saldo 10 split over 10/30/20/0: quotas 1.67, 5, 3.33, 0 -> 1, 5, 3, 0 + the remaining 1 to me (largest remainder).
        $this->getJson($this->url("/evenementen/{$evenement->id}/groep"))
            ->assertOk()
            ->assertJsonPath('groep.id', $groep->id)
            ->assertJsonPath('groep.naam', 'Team Rood')
            ->assertJsonPath('groep.saldo', 10)
            ->assertJsonPath('groep.uitnodigingslink', 'https://voorbeeld.nl/g/ROOD123')
            ->assertJsonPath('groep.mijn_aandeel', 2)
            ->assertJsonMissingPath('groep.kaart')
            ->assertJsonPath('groep.leden', [
                ['id' => $ik->id, 'naam' => 'Sam Jansen', 'initialen' => 'SJ', 'is_ik' => true, 'munten_gekocht' => 10, 'aandeel' => 2],
                ['id' => $lisa->id, 'naam' => 'Lisa de Vries', 'initialen' => 'LV', 'is_ik' => false, 'munten_gekocht' => 30, 'aandeel' => 5],
                ['id' => $bram->id, 'naam' => $bram->name, 'initialen' => $this->initialen($bram), 'is_ik' => false, 'munten_gekocht' => 20, 'aandeel' => 3],
                ['id' => $nul->id, 'naam' => $nul->name, 'initialen' => $this->initialen($nul), 'is_ik' => false, 'munten_gekocht' => 0, 'aandeel' => 0],
            ])
            ->assertJsonCount(4, 'groep.activiteit')
            ->assertJsonPath('groep.activiteit.0.id', $laatste->id)
            ->assertJsonPath('groep.activiteit.0.bedrag', -50)
            ->assertJsonPath('groep.activiteit.0.gebruiker', ['id' => $bram->id, 'voornaam' => $bram->voornaam]);
    }

    public function test_groep_is_null_zonder_groep(): void
    {
        $ik = $this->inloggen();
        $evenement = $this->evenement();
        $this->deelnemer($ik, $evenement);
        Groep::factory()->create(['evenement_id' => $evenement->id]);

        $this->getJson($this->url("/evenementen/{$evenement->id}/groep"))
            ->assertOk()
            ->assertExactJson(['groep' => null]);
    }

    public function test_aandeel_grootste_rest_telt_op_tot_saldo(): void
    {
        $service = app(GroepService::class);

        $this->assertSame([1 => 4, 2 => 3, 3 => 3], $service->verdeelSaldo(10, [1 => 1, 2 => 1, 3 => 1]));
        $this->assertSame([1 => 17, 2 => 33, 3 => 50], $service->verdeelSaldo(100, [1 => 1, 2 => 2, 3 => 3]));
        $this->assertSame([1 => 0, 2 => 0], $service->verdeelSaldo(25, [1 => 0, 2 => 0]));
        $this->assertSame([1 => 0, 2 => 0], $service->verdeelSaldo(0, [1 => 5, 2 => 5]));
        $this->assertSame([1 => -4, 2 => -3, 3 => -3], $service->verdeelSaldo(-10, [1 => 1, 2 => 1, 3 => 1]));
        // Quotas 0.5 and 1.5: equal remainders, the higher weight gets the extra munt.
        $this->assertSame([1 => 0, 2 => 2], $service->verdeelSaldo(2, [1 => 1, 2 => 3]));

        mt_srand(42);
        for ($i = 0; $i < 50; $i++) {
            $gewichten = array_map(fn () => mt_rand(0, 40), range(1, mt_rand(1, 8)));
            $saldo = mt_rand(0, 500);
            $delen = $service->verdeelSaldo($saldo, $gewichten);
            $this->assertSame(array_sum($gewichten) === 0 ? 0 : $saldo, array_sum($delen));
        }
    }

    public function test_groep_join(): void
    {
        $ik = $this->inloggen();
        $evenement = $this->evenement(['open' => true, 'heeft_tickets' => false]);
        $groep = Groep::factory()->create(['evenement_id' => $evenement->id, 'code' => 'GROEP-A']);
        $andere = Groep::factory()->create(['evenement_id' => $evenement->id, 'code' => 'GROEP-B']);

        $this->postJson($this->url('/groepen/join'), [])->assertUnprocessable()->assertJsonValidationErrors('code');
        $this->postJson($this->url('/groepen/join'), ['code' => 'ONBEKEND'])->assertNotFound()->assertJsonStructure(['message']);

        $this->postJson($this->url('/groepen/join'), ['code' => 'GROEP-A'])
            ->assertOk()
            ->assertExactJson(['groep' => ['id' => $groep->id, 'naam' => $groep->naam], 'evenement_id' => $evenement->id]);
        $this->assertDatabaseHas('gebruiker_evenement', ['gebruiker_id' => $ik->id, 'evenement_id' => $evenement->id, 'geblokkeerd' => false]);
        $this->assertDatabaseHas('gebruiker_groep', ['gebruiker_id' => $ik->id, 'groep_id' => $groep->id]);

        // Joining the groep I'm already in is fine.
        $this->postJson($this->url('/groepen/join'), ['code' => 'GROEP-A'])->assertOk();

        $this->postJson($this->url('/groepen/join'), ['code' => 'GROEP-B'])
            ->assertStatus(409)
            ->assertExactJson(['message' => 'Je zit al in een andere groep van dit evenement.']);
        $this->assertDatabaseMissing('gebruiker_groep', ['gebruiker_id' => $ik->id, 'groep_id' => $andere->id]);

        // Older data can put me in more groepen of one evenement; joining one of those still returns 200.
        $this->lidVan($ik, $andere);
        $this->postJson($this->url('/groepen/join'), ['code' => 'GROEP-B'])->assertOk()->assertJsonPath('groep.id', $andere->id);

        $gesloten = $this->evenement(['open' => false]);
        Groep::factory()->create(['evenement_id' => $gesloten->id, 'code' => 'DICHT']);
        $this->postJson($this->url('/groepen/join'), ['code' => 'DICHT'])->assertForbidden()->assertJsonStructure(['message']);
        $this->assertDatabaseMissing('gebruiker_evenement', ['gebruiker_id' => $ik->id, 'evenement_id' => $gesloten->id]);

        $geblokkeerd = $this->evenement(['open' => true, 'heeft_tickets' => false]);
        $this->deelnemer($ik, $geblokkeerd, geblokkeerd: true);
        $blokGroep = Groep::factory()->create(['evenement_id' => $geblokkeerd->id, 'code' => 'BLOK']);
        $this->postJson($this->url('/groepen/join'), ['code' => 'BLOK'])->assertForbidden();
        $this->assertDatabaseMissing('gebruiker_groep', ['gebruiker_id' => $ik->id, 'groep_id' => $blokGroep->id]);
    }

    public function test_evenement_met_tickets_eerst_tickets_dan_scan(): void
    {
        $ik = $this->inloggen();
        $evenement = $this->evenement(['heeft_tickets' => true, 'code' => 'TICKETS-NODIG-1', 'start_datum' => now()->addDay()]);
        $ticket = $this->ticket($evenement, 25, 'Dagticket');

        // Strangers can't see the tickets of an evenement before opening its link.
        $this->getJson($this->url("/evenementen/{$evenement->id}/tickets"))->assertNotFound();
        $this->postJson($this->url('/evenementen/bekijk'), ['code' => 'ONBEKEND-CODE-1'])->assertNotFound();

        // Opening the link: no ticket yet, so no deelname; the view is remembered.
        $this->postJson($this->url('/evenementen/bekijk'), ['code' => 'TICKETS-NODIG-1'])
            ->assertOk()
            ->assertJsonPath('evenement.id', $evenement->id)
            ->assertJsonPath('deelname', ['is_deelnemer' => false, 'heeft_ticket' => false, 'ticket_gescand' => false, 'gestart' => false, 'kan_deelnemen' => false]);
        $this->assertDatabaseHas('bekeken_evenementen', ['gebruiker_id' => $ik->id, 'evenement_id' => $evenement->id]);
        $this->assertDatabaseMissing('gebruiker_evenement', ['gebruiker_id' => $ik->id, 'evenement_id' => $evenement->id]);

        $this->getJson($this->url("/evenementen/{$evenement->id}/tickets"))
            ->assertOk()
            ->assertJsonPath('tickets.0.id', $ticket->id)
            ->assertJsonPath('deelname.kan_deelnemen', false);
        $this->getJson($this->url('/tickets'))->assertOk()->assertJsonPath('recent_bekeken.0.id', $evenement->id);

        // Joining needs a ticket, and that ticket scanned at the entrance.
        $this->postJson($this->url('/evenementen/join'), ['code' => 'TICKETS-NODIG-1'])
            ->assertForbidden()
            ->assertExactJson(['message' => 'Koop eerst een ticket om mee te doen.', 'reden' => 'ticket_nodig', 'evenement_id' => $evenement->id]);

        $this->koop($ik, $ticket);
        $this->postJson($this->url("/evenementen/{$evenement->id}/deelnemen"))
            ->assertForbidden()
            ->assertExactJson(['message' => 'Je doet mee zodra je ticket bij de ingang is gescand.', 'reden' => 'niet_gescand', 'evenement_id' => $evenement->id]);
        $this->getJson($this->url('/tickets'))
            ->assertJsonPath('gekocht.0.evenement.is_deelnemer', false)
            ->assertJsonCount(0, 'recent_bekeken');
        $this->assertDatabaseMissing('gebruiker_evenement', ['gebruiker_id' => $ik->id, 'evenement_id' => $evenement->id]);

        // The start alone isn't enough.
        $evenement->update(['start_datum' => now()->subMinute()]);
        $this->postJson($this->url('/evenementen/bekijk'), ['code' => 'TICKETS-NODIG-1'])
            ->assertJsonPath('deelname', ['is_deelnemer' => false, 'heeft_ticket' => true, 'ticket_gescand' => false, 'gestart' => true, 'kan_deelnemen' => false]);
        $this->postJson($this->url("/evenementen/{$evenement->id}/deelnemen"))->assertForbidden()->assertJsonPath('reden', 'niet_gescand');

        // The scan makes me a deelnemer. Dev scan (my own ticket) only when enabled.
        $mijnTicket = DB::table('gebruiker_ticket')->where('gebruiker_id', $ik->id)->value('id');
        config(['lagapay.dev_scan' => false]);
        $this->postJson($this->url("/evenementen/{$evenement->id}/mijn-tickets/{$mijnTicket}/dev-scan"))->assertNotFound();
        $this->assertDatabaseHas('gebruiker_ticket', ['id' => $mijnTicket, 'gebruikt' => false]);
        $this->devScan($evenement, $mijnTicket)
            ->assertOk()
            ->assertJsonPath('tickets.0.gebruikt', true)
            ->assertJsonPath('deelname', ['is_deelnemer' => true, 'heeft_ticket' => true, 'ticket_gescand' => true, 'gestart' => true, 'kan_deelnemen' => false]);
        $this->assertDatabaseHas('gebruiker_evenement', ['gebruiker_id' => $ik->id, 'evenement_id' => $evenement->id, 'geblokkeerd' => false]);
        $this->devScan($evenement, $mijnTicket)->assertStatus(409)->assertJsonPath('message', 'Dit ticket is al gebruikt.');
        $this->getJson($this->url("/evenementen/{$evenement->id}"))->assertOk();

        // Joining again is fine, also by code.
        $this->postJson($this->url('/evenementen/join'), ['code' => 'TICKETS-NODIG-1'])->assertOk();
        $this->postJson($this->url('/evenementen/bekijk'), ['code' => 'TICKETS-NODIG-1'])
            ->assertJsonPath('deelname.is_deelnemer', true)
            ->assertJsonPath('deelname.kan_deelnemen', false);

        // A ticket alone also gives access to the tickets screen (bought without opening the link).
        $anderEvenement = $this->evenement(['heeft_tickets' => true, 'start_datum' => now()->addWeek()]);
        $this->koop($ik, $this->ticket($anderEvenement, 10));
        $this->getJson($this->url("/evenementen/{$anderEvenement->id}/tickets"))
            ->assertOk()
            ->assertJsonPath('deelname.heeft_ticket', true);
        $this->getJson($this->url("/evenementen/{$anderEvenement->id}"))->assertNotFound();

        // Dev scan only takes my own ticket of this evenement.
        $anderTicket = DB::table('gebruiker_ticket')->where('gebruiker_id', $ik->id)->orderByDesc('id')->value('id');
        $this->devScan($evenement, $anderTicket)->assertNotFound()->assertExactJson(['message' => 'Ticket niet gevonden.']);
        $this->assertDatabaseHas('gebruiker_ticket', ['id' => $anderTicket, 'gebruikt' => false]);
    }

    public function test_deelnemen_zonder_tickets_gesloten_en_geblokkeerd(): void
    {
        $ik = $this->inloggen();

        // Without tickets the link still makes me a deelnemer right away.
        $vrij = $this->evenement(['heeft_tickets' => false, 'code' => 'ZONDER-TICKETS1', 'start_datum' => now()->addWeek()]);
        $this->postJson($this->url('/evenementen/bekijk'), ['code' => 'ZONDER-TICKETS1'])
            ->assertOk()
            ->assertJsonPath('deelname.kan_deelnemen', true);
        $this->postJson($this->url('/evenementen/join'), ['code' => 'ZONDER-TICKETS1'])
            ->assertOk()
            ->assertJsonPath('evenement.id', $vrij->id);
        $this->assertDatabaseHas('gebruiker_evenement', ['gebruiker_id' => $ik->id, 'evenement_id' => $vrij->id]);

        $gesloten = $this->evenement(['open' => false, 'code' => 'GESLOTEN-EVEN-1']);
        $this->postJson($this->url('/evenementen/bekijk'), ['code' => 'GESLOTEN-EVEN-1'])
            ->assertForbidden()
            ->assertJsonPath('reden', 'gesloten');
        $this->postJson($this->url('/evenementen/join'), ['code' => 'GESLOTEN-EVEN-1'])->assertForbidden();
        $this->assertDatabaseMissing('bekeken_evenementen', ['gebruiker_id' => $ik->id, 'evenement_id' => $gesloten->id]);

        // A deelnemer can still open a gesloten evenement.
        $mijnGesloten = $this->evenement(['open' => false, 'code' => 'MIJN-GESLOTEN-1']);
        $this->deelnemer($ik, $mijnGesloten);
        $this->postJson($this->url('/evenementen/bekijk'), ['code' => 'MIJN-GESLOTEN-1'])
            ->assertOk()
            ->assertJsonPath('deelname.is_deelnemer', true);

        // Blocked: no link, no tickets screen, not even with a ticket.
        $blok = $this->evenement(['heeft_tickets' => true, 'code' => 'GEBLOKKEERD-EV1', 'start_datum' => now()->subDay()]);
        $this->koop($ik, $this->ticket($blok, 20));
        $this->deelnemer($ik, $blok, geblokkeerd: true);
        $this->postJson($this->url('/evenementen/bekijk'), ['code' => 'GEBLOKKEERD-EV1'])
            ->assertForbidden()
            ->assertJsonPath('reden', 'geblokkeerd');
        $this->postJson($this->url("/evenementen/{$blok->id}/deelnemen"))->assertNotFound();
        $this->getJson($this->url("/evenementen/{$blok->id}/tickets"))->assertNotFound();
    }

    public function test_groep_join_volgt_ticketregels(): void
    {
        $ik = $this->inloggen();
        $evenement = $this->evenement(['heeft_tickets' => true, 'start_datum' => now()->subHour()]);
        $groep = Groep::factory()->create(['evenement_id' => $evenement->id, 'code' => 'MET-TICKET']);

        // No ticket: refused with the evenement, so the app can show its tickets (which is now allowed).
        $this->postJson($this->url('/groepen/join'), ['code' => 'MET-TICKET'])
            ->assertForbidden()
            ->assertExactJson(['message' => 'Koop eerst een ticket om mee te doen.', 'reden' => 'ticket_nodig', 'evenement_id' => $evenement->id]);
        $this->assertDatabaseMissing('gebruiker_groep', ['gebruiker_id' => $ik->id, 'groep_id' => $groep->id]);
        $this->assertDatabaseMissing('gebruiker_evenement', ['gebruiker_id' => $ik->id, 'evenement_id' => $evenement->id]);
        $this->getJson($this->url("/evenementen/{$evenement->id}/tickets"))->assertOk();

        $this->koop($ik, $this->ticket($evenement, 30));
        $this->postJson($this->url('/groepen/join'), ['code' => 'MET-TICKET'])
            ->assertForbidden()
            ->assertJsonPath('reden', 'niet_gescand');

        $this->devScan($evenement, DB::table('gebruiker_ticket')->where('gebruiker_id', $ik->id)->value('id'))->assertOk();
        $this->postJson($this->url('/groepen/join'), ['code' => 'MET-TICKET'])
            ->assertOk()
            ->assertJsonPath('groep.id', $groep->id);
        $this->assertDatabaseHas('gebruiker_evenement', ['gebruiker_id' => $ik->id, 'evenement_id' => $evenement->id]);
        $this->assertDatabaseHas('gebruiker_groep', ['gebruiker_id' => $ik->id, 'groep_id' => $groep->id]);
    }

    public function test_betaalbron_volgt_persoonlijk_of_groep(): void
    {
        $ik = $this->inloggen();
        $evenement = $this->evenement();
        $ander = $this->evenement();
        $this->deelnemer($ik, $evenement);
        $this->deelnemer($ik, $ander);
        $url = $this->url("/evenementen/{$evenement->id}/betaalbron");
        $betaalbron = fn (Evenement $e) => DB::table('gebruiker_evenement')
            ->where('gebruiker_id', $ik->id)->where('evenement_id', $e->id)->value('betaalbron');

        // Not in a groep: Groep still means my own saldo.
        $this->putJson($url, ['soort' => 'groep'])->assertOk()->assertExactJson(['betaalbron' => null]);
        $this->assertNull($betaalbron($evenement));

        $groep = Groep::factory()->create(['evenement_id' => $evenement->id]);
        $groep->gebruikers()->attach($ik->id);

        $this->putJson($url, ['soort' => 'groep'])->assertOk()->assertExactJson(['betaalbron' => $groep->id]);
        $this->assertSame($groep->id, (int) $betaalbron($evenement));
        $this->assertNull($betaalbron($ander)); // per evenement
        // The overzicht tells the app to open on the Groep page.
        $this->getJson($this->url("/evenementen/{$evenement->id}"))->assertJsonPath('betaalbron', $groep->id);
        $this->getJson($this->url("/evenementen/{$ander->id}"))->assertJsonPath('betaalbron', null);

        $this->putJson($url, ['soort' => 'persoonlijk'])->assertOk()->assertExactJson(['betaalbron' => null]);
        $this->assertNull($betaalbron($evenement));
        $this->getJson($this->url("/evenementen/{$evenement->id}"))->assertJsonPath('betaalbron', null);

        // A betaalbron of a groep I'm no longer in isn't followed.
        $this->putJson($url, ['soort' => 'groep'])->assertOk();
        DB::table('gebruiker_groep')->where('groep_id', $groep->id)->where('gebruiker_id', $ik->id)->delete();
        $this->getJson($this->url("/evenementen/{$evenement->id}"))->assertJsonPath('betaalbron', null);
        $groep->gebruikers()->attach($ik->id);

        $this->putJson($url, ['soort' => 'iets'])->assertUnprocessable()->assertJsonValidationErrors('soort');
        $this->putJson($this->url("/evenementen/{$this->evenement()->id}/betaalbron"), ['soort' => 'groep'])->assertNotFound();

        // Deleting the groep falls back to my own saldo.
        $this->putJson($url, ['soort' => 'groep'])->assertOk();
        DB::table('gebruiker_groep')->where('groep_id', $groep->id)->delete();
        $groep->delete();
        $this->assertNull($betaalbron($evenement));
    }

    public function test_groep_aanmaken(): void
    {
        $ik = $this->inloggen();
        // Without tickets, so the friend below can join by the invite code alone (ticket rules: test_groep_join_volgt_ticketregels).
        $evenement = $this->evenement(['open' => true, 'heeft_tickets' => false]);
        $url = $this->url("/evenementen/{$evenement->id}/groepen");

        // Only for deelnemers.
        $this->postJson($url, ['naam' => 'Team Rood'])->assertNotFound();
        $this->deelnemer($ik, $evenement);

        $this->postJson($url, [])->assertUnprocessable()->assertJsonPath('errors.naam.0', 'Geef je groep een naam.');
        $this->postJson($url, ['naam' => '   '])->assertUnprocessable()->assertJsonValidationErrors('naam');
        $this->postJson($url, ['naam' => str_repeat('a', 51)])->assertUnprocessable()->assertJsonValidationErrors('naam');

        $response = $this->postJson($url, ['naam' => '  Team Rood '])
            ->assertCreated()
            ->assertJsonPath('groep.naam', 'Team Rood')
            ->assertJsonPath('groep.saldo', 0)
            ->assertJsonPath('groep.mijn_aandeel', 0)
            ->assertJsonPath('groep.leden.0.id', $ik->id)
            ->assertJsonPath('groep.leden.0.is_ik', true)
            ->assertJsonCount(1, 'groep.leden')
            ->assertJsonMissingPath('groep.kaart')
            ->assertJsonPath('groep.activiteit', []);

        $groep = Groep::findOrFail($response->json('groep.id'));
        $this->assertSame($evenement->id, $groep->evenement_id);
        $this->assertMatchesRegularExpression('/^[A-Za-z0-9_-]{10}$/', $groep->code);
        $response->assertJsonPath('groep.uitnodigingslink', rtrim(config('lagapay.link_url'), '/') . '/g/' . $groep->code);
        $this->assertDatabaseHas('gebruiker_groep', ['gebruiker_id' => $ik->id, 'groep_id' => $groep->id]);

        // The new groep is "mijn groep", and its invite code works for others.
        $this->getJson($this->url("/evenementen/{$evenement->id}/groep"))->assertOk()->assertJsonPath('groep.id', $groep->id);

        // One groep per evenement: creating a second one, or after joining another, is a conflict.
        $this->postJson($url, ['naam' => 'Team Blauw'])
            ->assertStatus(409)
            ->assertExactJson(['message' => 'Je zit al in een groep van dit evenement.']);
        $this->assertSame(1, Groep::where('evenement_id', $evenement->id)->count());

        $vriend = Gebruiker::factory()->create();
        Sanctum::actingAs($vriend);
        $this->postJson($this->url('/groepen/join'), ['code' => $groep->code])->assertOk()->assertJsonPath('groep.id', $groep->id);
        $this->postJson($url, ['naam' => 'Eigen groep'])->assertStatus(409);

        // Not in a gesloten evenement.
        Sanctum::actingAs($ik);
        $gesloten = $this->evenement(['open' => false]);
        $this->deelnemer($ik, $gesloten);
        $this->postJson($this->url("/evenementen/{$gesloten->id}/groepen"), ['naam' => 'Te laat'])
            ->assertForbidden()
            ->assertExactJson(['message' => 'Dit evenement is gesloten.']);
        $this->assertSame(0, Groep::where('evenement_id', $gesloten->id)->count());
    }

    public function test_opwaarderen_zonder_betaling(): void
    {
        $ik = $this->inloggen();
        $evenement = $this->evenement(['munt_prijs' => 1.10]);
        $this->deelnemer($ik, $evenement);
        $url = $this->url("/evenementen/{$evenement->id}/opwaarderen");

        // Off unless test betalingen are switched on (only APP_ENV=local by default).
        config(['lagapay.test_betalingen' => false]);
        $this->postJson($url, ['munten' => 5, 'voor' => 'persoonlijk'])
            ->assertForbidden()
            ->assertExactJson(['message' => 'Betalen is nog niet beschikbaar.']);
        config(['lagapay.test_betalingen' => true]);

        $this->postJson($url, ['munten' => 0, 'voor' => 'persoonlijk'])->assertUnprocessable()->assertJsonValidationErrors('munten');
        $this->postJson($url, ['munten' => 501, 'voor' => 'persoonlijk'])->assertUnprocessable()->assertJsonValidationErrors('munten');
        $this->postJson($url, ['munten' => 5, 'voor' => 'iedereen'])->assertUnprocessable()->assertJsonValidationErrors('voor');
        $this->postJson($url, ['munten' => 5, 'voor' => 'groep'])->assertUnprocessable()->assertJsonValidationErrors('voor');

        // Persoonlijk: on top of what's there (also older rows), with a paid test opwaardering of munten × munt_prijs.
        $this->munten($ik, $evenement, 4);
        $this->postJson($url, ['munten' => 3, 'voor' => 'persoonlijk'])->assertOk()->assertExactJson(['saldo' => 7]);
        $this->postJson($url, ['munten' => 20, 'voor' => 'persoonlijk'])->assertOk()->assertExactJson(['saldo' => 27]);
        $this->assertDatabaseHas('opwaarderingen', ['gebruiker_id' => $ik->id, 'evenement_id' => $evenement->id, 'amount' => '3.30', 'status' => 'paid', 'method' => 'test']);
        $this->assertDatabaseHas('opwaarderingen', ['gebruiker_id' => $ik->id, 'amount' => '22.00']);
        $this->assertSame(2, DB::table('opwaarderingen')->where('mollie_id', 'like', 'test_%')->count());
        $this->getJson($this->url("/evenementen/{$evenement->id}"))
            ->assertJsonPath('saldo', 27)
            ->assertJsonPath('activiteit.0.type', 'opwaardering')
            ->assertJsonPath('activiteit.0.bedrag', 20);

        // Groep: the groep's saldo, and it counts as munten gekocht for me.
        $groep = Groep::factory()->create(['evenement_id' => $evenement->id]);
        $this->lidVan($ik, $groep);
        $this->munten($ik, $evenement, 10, $groep);
        $this->postJson($url, ['munten' => 5, 'voor' => 'groep'])->assertOk()->assertExactJson(['saldo' => 15]);
        $this->getJson($this->url("/evenementen/{$evenement->id}/groep"))
            ->assertJsonPath('groep.saldo', 15)
            ->assertJsonPath('groep.leden.0.munten_gekocht', 5)
            ->assertJsonPath('groep.activiteit.0.gebruiker.id', $ik->id);
        $this->getJson($this->url("/evenementen/{$evenement->id}"))->assertJsonPath('saldo', 27);

        $evenement->update(['open' => false]);
        $this->postJson($url, ['munten' => 5, 'voor' => 'persoonlijk'])->assertForbidden();
    }

    public function test_tickets_kopen_zonder_betaling(): void
    {
        config(['lagapay.test_betalingen' => true]);
        $ik = $this->inloggen();
        $evenement = $this->evenement(['heeft_tickets' => true, 'code' => 'TICKET-KOPEN-01', 'start_datum' => now()->subHour()]);
        $dag = $this->ticket($evenement, 25, 'Dagticket', 10);
        $avond = $this->ticket($evenement, 15, 'Avond');
        $ander = $this->ticket($this->evenement(), 5);
        $url = $this->url("/evenementen/{$evenement->id}/tickets/kopen");

        // Before opening the link I can't see (or buy) the tickets.
        $this->postJson($url, ['tickets' => [['id' => $dag->id, 'aantal' => 1]]])->assertNotFound();
        $this->postJson($this->url('/evenementen/bekijk'), ['code' => 'TICKET-KOPEN-01'])->assertOk();

        $this->postJson($url, ['tickets' => []])->assertUnprocessable()->assertJsonValidationErrors('tickets');
        $this->postJson($url, ['tickets' => [['id' => $dag->id, 'aantal' => 0]]])->assertUnprocessable()->assertJsonValidationErrors('tickets.0.aantal');
        $this->postJson($url, ['tickets' => [['id' => $dag->id, 'aantal' => 11]]])->assertUnprocessable()->assertJsonValidationErrors('tickets.0.aantal');
        $this->postJson($url, ['tickets' => [['id' => $dag->id, 'aantal' => 1], ['id' => $dag->id, 'aantal' => 1]]])
            ->assertUnprocessable()->assertJsonValidationErrors('tickets.0.id');
        $this->postJson($url, ['tickets' => [['id' => $dag->id, 'aantal' => 1], ['id' => $ander->id, 'aantal' => 1]]])
            ->assertNotFound()->assertExactJson(['message' => 'Ticket niet gevonden.']);
        $this->assertSame(0, DB::table('gebruiker_ticket')->count());

        // 2 Dagtickets + 1 Avond in one go: three tickets, each with its own code; the answer is GET tickets.
        $this->postJson($url, ['tickets' => [['id' => $dag->id, 'aantal' => 2], ['id' => $avond->id, 'aantal' => 1]]])
            ->assertOk()
            ->assertJsonPath('tickets.0.id', $avond->id)
            ->assertJsonPath('tickets.0.aantal_gekocht', 1)
            ->assertJsonPath('tickets.1.aantal_gekocht', 2)
            ->assertJsonPath('deelname', ['is_deelnemer' => false, 'heeft_ticket' => true, 'ticket_gescand' => false, 'gestart' => true, 'kan_deelnemen' => false]);
        $codes = DB::table('gebruiker_ticket')->where('gebruiker_id', $ik->id)->pluck('code');
        $this->assertCount(3, $codes);
        $this->assertCount(3, $codes->unique());
        $this->assertSame(0, DB::table('gebruiker_ticket')->where('gebruikt', true)->count());

        // Buying more of the same type is fine.
        $this->postJson($url, ['tickets' => [['id' => $dag->id, 'aantal' => 1]]])->assertOk()->assertJsonPath('tickets.1.aantal_gekocht', 3);

        // Not a deelnemer yet: no munten so far. The scan at the entrance makes me one and credits the included
        // munten of the scanned Dagticket only (10, not 3 × 10); opwaarderen only works from then on.
        $this->assertSame(0, DB::table('munten')->where('gebruiker_id', $ik->id)->count());
        $this->postJson($this->url("/evenementen/{$evenement->id}/opwaarderen"), ['munten' => 5, 'voor' => 'persoonlijk'])->assertNotFound();
        $this->postJson($this->url("/evenementen/{$evenement->id}/deelnemen"))->assertForbidden()->assertJsonPath('reden', 'niet_gescand');
        $dagtickets = DB::table('gebruiker_ticket')->where('gebruiker_id', $ik->id)->where('ticket_id', $dag->id)->orderBy('id')->pluck('id');
        $this->devScan($evenement, $dagtickets[0])->assertOk();
        $this->getJson($this->url("/evenementen/{$evenement->id}"))
            ->assertJsonPath('saldo', 10)
            ->assertJsonCount(1, 'activiteit')
            ->assertJsonPath('activiteit.0.label', 'Ticket: inbegrepen munten')
            ->assertJsonPath('activiteit.0.bedrag', 10);

        // Joined: buying more credits nothing; each ticket pays out when it is scanned.
        $this->postJson($url, ['tickets' => [['id' => $dag->id, 'aantal' => 1]]])->assertOk();
        $this->getJson($this->url("/evenementen/{$evenement->id}"))->assertJsonPath('saldo', 10);
        $this->devScan($evenement, $dagtickets[1])->assertOk();
        $this->getJson($this->url("/evenementen/{$evenement->id}"))->assertJsonPath('saldo', 20)->assertJsonCount(2, 'activiteit');

        $zonderVerkoop = $this->evenement(['heeft_tickets' => false]);
        $this->deelnemer($ik, $zonderVerkoop);
        $verboden = $this->ticket($zonderVerkoop, 5);
        $this->postJson($this->url("/evenementen/{$zonderVerkoop->id}/tickets/kopen"), ['tickets' => [['id' => $verboden->id, 'aantal' => 1]]])
            ->assertForbidden()
            ->assertExactJson(['message' => 'Dit evenement heeft geen tickets.']);
    }

    public function test_tickets_kopen_tot_de_capaciteit_en_tickets_toevoegen(): void
    {
        config(['lagapay.test_betalingen' => true]);
        $ik = $this->inloggen();
        $evenement = $this->evenement(['heeft_tickets' => true, 'code' => 'CAPACITEIT-0001', 'start_datum' => now()->subHour()]);
        $service = app(TicketService::class);
        // Created like the dashboard does: Weekend has 3 in total, Dag is onbeperkt.
        $weekend = $service->addTicket($evenement->id, ['naam' => 'Weekend', 'prijs' => 40, 'munten' => 0, 'capaciteit' => 3]);
        $dag = $service->addTicket($evenement->id, ['naam' => 'Dag', 'prijs' => 25, 'munten' => 0]);
        $this->assertSame(3, $weekend->fresh()->capaciteit);
        $this->assertNull($dag->fresh()->capaciteit);

        $this->postJson($this->url('/evenementen/bekijk'), ['code' => 'CAPACITEIT-0001'])->assertOk();
        $url = $this->url("/evenementen/{$evenement->id}/tickets/kopen");

        // Someone else already bought one Weekend ticket: it counts for everyone.
        $ander = Gebruiker::factory()->create();
        $ander->tickets()->attach($weekend->id, ['code' => 'ANDERCODE0001']);

        $this->getJson($this->url("/evenementen/{$evenement->id}/tickets"))
            ->assertOk()
            ->assertJsonPath('tickets.0.id', $dag->id)
            ->assertJsonPath('tickets.0.beschikbaar', null)
            ->assertJsonPath('tickets.1.beschikbaar', 2);

        // More than are left: refused (409), and nothing of the order is booked (also not the Dag tickets).
        $this->postJson($url, ['tickets' => [['id' => $dag->id, 'aantal' => 1], ['id' => $weekend->id, 'aantal' => 3]]])
            ->assertStatus(409)
            ->assertExactJson(['message' => 'Er zijn nog maar 2 tickets van Weekend beschikbaar.']);
        $this->assertSame(0, DB::table('gebruiker_ticket')->where('gebruiker_id', $ik->id)->count());

        // Exactly what's left: fine, and then it's uitverkocht.
        $this->postJson($url, ['tickets' => [['id' => $weekend->id, 'aantal' => 2]]])
            ->assertOk()
            ->assertJsonPath('tickets.1.aantal_gekocht', 2)
            ->assertJsonPath('tickets.1.beschikbaar', 0);
        $this->postJson($url, ['tickets' => [['id' => $weekend->id, 'aantal' => 1]]])
            ->assertStatus(409)
            ->assertExactJson(['message' => 'Weekend is uitverkocht.']);

        // Onbeperkt keeps selling.
        $this->postJson($url, ['tickets' => [['id' => $dag->id, 'aantal' => 10]]])->assertOk()->assertJsonPath('tickets.0.beschikbaar', null);

        // The organisator adds 5 tickets: 5 for sale again.
        $service->voegCapaciteitToe($evenement->id, $weekend->id, 5);
        $this->assertSame(8, $weekend->fresh()->capaciteit);
        $this->getJson($this->url("/evenementen/{$evenement->id}/tickets"))->assertJsonPath('tickets.1.beschikbaar', 5);
        $this->postJson($url, ['tickets' => [['id' => $weekend->id, 'aantal' => 5]]])->assertOk()->assertJsonPath('tickets.1.beschikbaar', 0);

        // Adding to an onbeperkt type, or to a type of another evenement, isn't possible.
        try {
            $service->voegCapaciteitToe($evenement->id, $dag->id, 5);
            $this->fail('An onbeperkt ticket type got capaciteit.');
        } catch (\DomainException) {
            $this->assertNull($dag->fresh()->capaciteit);
        }
        $this->expectException(\Illuminate\Database\Eloquent\ModelNotFoundException::class);
        $service->voegCapaciteitToe($this->evenement(['heeft_tickets' => true])->id, $weekend->id, 5);
    }

    public function test_elk_ticket_heeft_een_eigen_link_voor_een_vriend(): void
    {
        config(['lagapay.test_betalingen' => true]);
        $koper = $this->inloggen(['voornaam' => 'Lisa']);
        $evenement = $this->evenement(['heeft_tickets' => true, 'start_datum' => now()->subHour()]);
        $dag = $this->ticket($evenement, 25, 'Dagticket', 10);
        $vip = $this->ticket($evenement, 75, 'VIP', 20);
        $this->postJson($this->url('/evenementen/bekijk'), ['code' => $evenement->code])->assertOk();

        // Every ticket I buy has its own link; nothing to choose when buying.
        $this->postJson($this->url("/evenementen/{$evenement->id}/tickets/kopen"), ['tickets' => [['id' => $dag->id, 'aantal' => 2], ['id' => $vip->id, 'aantal' => 1]]])
            ->assertOk()
            ->assertJsonPath('deelname.heeft_ticket', true);
        $links = DB::table('gebruiker_ticket')->orderBy('id')->pluck('deel_code');
        $this->assertCount(3, $links->filter()->unique());
        $this->assertMatchesRegularExpression('/^[A-Za-z0-9_-]{20}$/', $links[0]);
        [$dagLink, , $vipLink] = $links->all();

        $mijn = $this->getJson($this->url("/evenementen/{$evenement->id}/mijn-tickets"))
            ->assertOk()
            ->assertJsonCount(3, 'tickets')
            ->assertJsonPath('tickets.0.deel_link', rtrim(config('lagapay.link_url'), '/') . '/t/' . $dagLink)
            ->assertJsonPath('tickets.2.naam', 'VIP')
            ->assertJsonPath('tickets.2.deel_link', rtrim(config('lagapay.link_url'), '/') . '/t/' . $vipLink)
            ->assertJsonPath('weggegeven', []);
        $oudeVipCode = $mijn->json('tickets.2.code');

        $bekijken = fn (string $code) => $this->getJson($this->url("/ticket-uitnodigingen/{$code}"));
        $ophalen = fn (string $code) => $this->postJson($this->url("/ticket-uitnodigingen/{$code}/accepteren"));

        // My own link: nothing to claim. Unknown links are a 404.
        $bekijken($vipLink)->assertOk()->assertJsonPath('status', 'eigen_link');
        $ophalen($vipLink)->assertOk()->assertJsonPath('resultaat', 'eigen_link');
        $bekijken('onbekend')->assertNotFound()->assertExactJson(['message' => 'Deze link werkt niet (meer).']);
        $ophalen('onbekend')->assertNotFound();

        // Noor opens the VIP link: sees exactly which ticket it is before claiming it.
        $noor = Gebruiker::factory()->create(['voornaam' => 'Noor']);
        Sanctum::actingAs($noor);
        $bekijken($vipLink)
            ->assertOk()
            ->assertJsonPath('status', 'beschikbaar')
            ->assertJsonPath('ticket', ['naam' => 'VIP', 'munten' => 20])
            ->assertJsonPath('van', 'Lisa')
            ->assertJsonPath('opgehaald_door', null)
            ->assertJsonPath('evenement.id', $evenement->id);
        $this->assertSame($koper->id, (int) DB::table('gebruiker_ticket')->where('deel_code', $vipLink)->value('gebruiker_id'));

        $ophalen($vipLink)
            ->assertOk()
            ->assertJsonPath('resultaat', 'gekregen')
            ->assertJsonPath('van', 'Lisa')
            ->assertJsonPath('deelname', ['is_deelnemer' => false, 'heeft_ticket' => true, 'ticket_gescand' => false, 'gestart' => true, 'kan_deelnemen' => false]);
        // Mine now, with a new QR code (the one Lisa saw stops working) and a new link I can pass it on with.
        $noorsVip = $this->getJson($this->url("/evenementen/{$evenement->id}/mijn-tickets"))
            ->assertJsonCount(1, 'tickets')
            ->assertJsonPath('tickets.0.naam', 'VIP')
            ->assertJsonPath('tickets.0.gekregen_van', 'Lisa')
            ->json('tickets.0');
        $this->assertNotSame($oudeVipCode, $noorsVip['code']);
        $this->assertNotNull($noorsVip['deel_link']);
        $this->assertStringEndsNotWith('/t/' . $vipLink, $noorsVip['deel_link']);
        $this->assertSame(0, DB::table('gebruiker_ticket')->where('code', $oudeVipCode)->orWhere('deel_code', $vipLink)->count());

        // The old link stops working; one ticket per friend, so another link of Lisa's doesn't give Noor a second one.
        $bekijken($vipLink)->assertNotFound();
        $ophalen($vipLink)->assertNotFound();
        $bekijken($dagLink)->assertJsonPath('status', 'al_ticket');
        $ophalen($dagLink)->assertOk()->assertJsonPath('resultaat', 'al_ticket');
        $this->assertSame(1, DB::table('gebruiker_ticket')->where('gebruiker_id', $noor->id)->count());

        // A friend with a ticket of their own doesn't get one either.
        $tim = Gebruiker::factory()->create(['voornaam' => 'Tim']);
        Sanctum::actingAs($tim);
        $this->koop($tim, $dag);
        $ophalen($dagLink)->assertOk()->assertJsonPath('resultaat', 'al_ticket');

        $eva = Gebruiker::factory()->create(['voornaam' => 'Eva']);
        Sanctum::actingAs($eva);
        $this->travel(1)->minutes();
        $ophalen($dagLink)->assertOk()->assertJsonPath('resultaat', 'gekregen');

        // Noor passes the VIP on to Bram with her link: Bram sees it comes from Noor.
        $noorsLink = substr($noorsVip['deel_link'], strrpos($noorsVip['deel_link'], '/') + 1);
        $bram = Gebruiker::factory()->create(['voornaam' => 'Bram']);
        Sanctum::actingAs($bram);
        $bekijken($noorsLink)->assertOk()->assertJsonPath('status', 'beschikbaar')->assertJsonPath('van', 'Noor');
        $this->travel(1)->minutes();
        $ophalen($noorsLink)->assertOk()->assertJsonPath('resultaat', 'gekregen')->assertJsonPath('van', 'Noor');
        $this->getJson($this->url("/evenementen/{$evenement->id}/mijn-tickets"))
            ->assertJsonPath('tickets.0.naam', 'VIP')
            ->assertJsonPath('tickets.0.gekregen_van', 'Noor');
        // Lisa still paid for it.
        $this->assertSame($koper->id, (int) DB::table('gebruiker_ticket')->where('gebruiker_id', $bram->id)->value('gekocht_door'));

        // Bram joins, and gets the VIP's 20 munten, once it is scanned.
        $this->devScan($evenement, DB::table('gebruiker_ticket')->where('gebruiker_id', $bram->id)->value('id'))->assertOk();
        $this->getJson($this->url("/evenementen/{$evenement->id}"))->assertJsonPath('saldo', 20);

        // Everyone sees which ticket they gave to whom.
        Sanctum::actingAs($noor);
        $this->getJson($this->url("/evenementen/{$evenement->id}/mijn-tickets"))
            ->assertJsonCount(0, 'tickets')
            ->assertJsonCount(1, 'weggegeven')
            ->assertJsonPath('weggegeven.0.naam', 'VIP')
            ->assertJsonPath('weggegeven.0.aan', 'Bram');
        Sanctum::actingAs($koper);
        $this->getJson($this->url("/evenementen/{$evenement->id}/mijn-tickets"))
            ->assertJsonCount(1, 'tickets')
            ->assertJsonPath('deelname.heeft_ticket', true)
            ->assertJsonCount(2, 'weggegeven')
            ->assertJsonPath('weggegeven.0.naam', 'VIP')
            ->assertJsonPath('weggegeven.0.aan', 'Noor')
            ->assertJsonPath('weggegeven.1.naam', 'Dagticket')
            ->assertJsonPath('weggegeven.1.aan', 'Eva');
    }

    public function test_ticket_link_gebruikt_oude_tickets_en_scan(): void
    {
        config(['lagapay.test_betalingen' => true]);
        $koper = $this->inloggen(['voornaam' => 'Lisa']);
        $evenement = $this->evenement(['heeft_tickets' => true, 'start_datum' => now()->addDay()]);
        $dag = $this->ticket($evenement, 25, 'Dagticket', 10);
        $this->postJson($this->url('/evenementen/bekijk'), ['code' => $evenement->code])->assertOk();
        $this->postJson($this->url("/evenementen/{$evenement->id}/tickets/kopen"), ['tickets' => [['id' => $dag->id, 'aantal' => 2]]])->assertOk();
        $tickets = DB::table('gebruiker_ticket')->where('gebruiker_id', $koper->id)->orderBy('id')->pluck('id');
        $link = fn (int $ticketId) => DB::table('gebruiker_ticket')->where('id', $ticketId)->value('deel_code');
        $ophalen = fn (string $code) => $this->postJson($this->url("/ticket-uitnodigingen/{$code}/accepteren"));

        // A ticket I use myself: no link anymore on my screen, and the link says it was used.
        $this->devScan($evenement, $tickets[1])->assertOk()->assertJsonPath('tickets.1.deel_link', null);
        $this->getJson($this->url("/evenementen/{$evenement->id}"))->assertJsonPath('saldo', 10);
        Sanctum::actingAs(Gebruiker::factory()->create());
        $this->getJson($this->url("/ticket-uitnodigingen/{$link($tickets[1])}"))->assertOk()->assertJsonPath('status', 'gebruikt');
        $ophalen($link($tickets[1]))->assertStatus(409)->assertJsonPath('reden', 'gebruikt');

        // A friend claims the other one: holds the ticket, not a deelnemer before the scan (even before the start), no munten.
        $noor = Gebruiker::factory()->create();
        Sanctum::actingAs($noor);
        $ophalen($link($tickets[0]))
            ->assertOk()
            ->assertJsonPath('resultaat', 'gekregen')
            ->assertJsonPath('deelname', ['is_deelnemer' => false, 'heeft_ticket' => true, 'ticket_gescand' => false, 'gestart' => false, 'kan_deelnemen' => false]);
        $this->postJson($this->url("/evenementen/{$evenement->id}/deelnemen"))->assertForbidden()->assertJsonPath('reden', 'niet_gescand');
        $this->devScan($evenement, $tickets[0])->assertOk()->assertJsonPath('deelname.is_deelnemer', true);
        $this->getJson($this->url("/evenementen/{$evenement->id}"))->assertJsonPath('saldo', 10);

        // Tickets added without a buyer or link (seeders) get a link when their holder opens Mijn tickets; claiming one
        // records the holder as the buyer.
        Sanctum::actingAs($koper);
        $this->koop($koper, $dag);
        $oud = (int) DB::table('gebruiker_ticket')->where('gebruiker_id', $koper->id)->whereNull('deel_code')->value('id');
        $this->getJson($this->url("/evenementen/{$evenement->id}/mijn-tickets"))->assertJsonPath('tickets.1.deel_link', fn ($deelLink) => $deelLink !== null);
        // Its munten were already paid out to me (tickets from before munten were paid per scan): the friend doesn't get them.
        DB::table('gebruiker_ticket')->where('id', $oud)->update(['munten_uitgekeerd' => true]);
        $eva = Gebruiker::factory()->create();
        Sanctum::actingAs($eva);
        $this->getJson($this->url("/ticket-uitnodigingen/{$link($oud)}"))->assertJsonPath('ticket.munten', null);
        $ophalen($link($oud))->assertOk()->assertJsonPath('resultaat', 'gekregen');
        $this->assertSame($koper->id, (int) DB::table('gebruiker_ticket')->where('id', $oud)->value('gekocht_door'));
        $this->devScan($evenement, $oud)->assertOk();
        $this->getJson($this->url("/evenementen/{$evenement->id}"))->assertJsonPath('saldo', 0);
    }

    public function test_ticket_link_gesloten_en_geblokkeerd(): void
    {
        config(['lagapay.test_betalingen' => true]);
        $koper = $this->inloggen(['voornaam' => 'Lisa']);
        $evenement = $this->evenement(['heeft_tickets' => true, 'start_datum' => now()->subHour()]);
        $dag = $this->ticket($evenement, 25, 'Dagticket', 10);
        $this->postJson($this->url('/evenementen/bekijk'), ['code' => $evenement->code])->assertOk();
        $this->postJson($this->url("/evenementen/{$evenement->id}/tickets/kopen"), ['tickets' => [['id' => $dag->id, 'aantal' => 2]]])->assertOk();
        $code = DB::table('gebruiker_ticket')->orderBy('id')->value('deel_code');

        // Blocked friends don't get one.
        $geblokkeerd = Gebruiker::factory()->create();
        $this->deelnemer($geblokkeerd, $evenement, geblokkeerd: true);
        Sanctum::actingAs($geblokkeerd);
        $this->getJson($this->url("/ticket-uitnodigingen/{$code}"))->assertOk()->assertJsonPath('status', 'geblokkeerd');
        $this->postJson($this->url("/ticket-uitnodigingen/{$code}/accepteren"))->assertForbidden()->assertJsonPath('reden', 'geblokkeerd');
        $this->assertSame(2, DB::table('gebruiker_ticket')->where('gebruiker_id', $koper->id)->count());

        // Gesloten evenement: no more tickets move, and Mijn tickets shows no links.
        $evenement->update(['open' => false]);
        Sanctum::actingAs(Gebruiker::factory()->create());
        $this->getJson($this->url("/ticket-uitnodigingen/{$code}"))->assertOk()->assertJsonPath('status', 'gesloten');
        $this->postJson($this->url("/ticket-uitnodigingen/{$code}/accepteren"))->assertForbidden()->assertJsonPath('reden', 'gesloten');
        $this->assertSame(2, DB::table('gebruiker_ticket')->where('gebruiker_id', $koper->id)->count());
        Sanctum::actingAs($koper);
        $this->getJson($this->url("/evenementen/{$evenement->id}/mijn-tickets"))
            ->assertJsonPath('tickets.0.deel_link', null)
            ->assertJsonPath('tickets.1.deel_link', null);
    }

    public function test_ticket_links_na_drie_mislukte_pogingen_even_geblokkeerd(): void
    {
        config(['lagapay.test_betalingen' => true]);
        $koper = $this->inloggen();
        $evenement = $this->evenement(['heeft_tickets' => true, 'start_datum' => now()->subHour()]);
        $dag = $this->ticket($evenement, 25, 'Dagticket');
        $this->postJson($this->url('/evenementen/bekijk'), ['code' => $evenement->code])->assertOk();
        $this->postJson($this->url("/evenementen/{$evenement->id}/tickets/kopen"), ['tickets' => [['id' => $dag->id, 'aantal' => 1]]])->assertOk();
        $code = DB::table('gebruiker_ticket')->value('deel_code');

        // "Nothing changed" answers aren't failures.
        $this->postJson($this->url("/ticket-uitnodigingen/{$code}/accepteren"))->assertOk()->assertJsonPath('resultaat', 'eigen_link');

        // Three failed attempts, on the preview or the claim: then both answer 429, also for a valid link.
        $raden = Gebruiker::factory()->create();
        Sanctum::actingAs($raden);
        $this->getJson($this->url('/ticket-uitnodigingen/gok1'))->assertNotFound();
        $this->postJson($this->url('/ticket-uitnodigingen/gok2/accepteren'))->assertNotFound();
        $this->postJson($this->url('/ticket-uitnodigingen/gok3/accepteren'))->assertNotFound();
        $this->postJson($this->url("/ticket-uitnodigingen/{$code}/accepteren"))
            ->assertStatus(429)
            ->assertHeader('Retry-After')
            ->assertExactJson(['message' => 'Te veel mislukte pogingen. Probeer het over 10 minuten opnieuw.']);
        $this->getJson($this->url("/ticket-uitnodigingen/{$code}"))->assertStatus(429);
        $this->assertSame($koper->id, (int) DB::table('gebruiker_ticket')->value('gebruiker_id'));

        // Per gebruiker: someone else can still claim it.
        Sanctum::actingAs(Gebruiker::factory()->create());
        $this->postJson($this->url("/ticket-uitnodigingen/{$code}/accepteren"))->assertOk()->assertJsonPath('resultaat', 'gekregen');

        // After 10 minutes it works again.
        Sanctum::actingAs($raden);
        $this->travel(10)->minutes();
        $this->travel(1)->seconds();
        $this->getJson($this->url('/ticket-uitnodigingen/gok4'))->assertNotFound();
    }

    public function test_mijn_tickets_met_qr_en_scannen(): void
    {
        $organisator = Gebruiker::factory()->create();
        $ik = $this->inloggen();
        $evenement = $this->evenement(['heeft_tickets' => true, 'gebruiker' => $organisator->id, 'start_datum' => now()->addDay()]);
        $dag = $this->ticket($evenement, 25, 'Dagticket', 10);
        $vip = $this->ticket($evenement, 75, 'VIP');
        $this->koop($ik, $vip);
        $this->koop($ik, $dag);
        $this->koop($ik, $dag);
        $url = $this->url("/evenementen/{$evenement->id}/mijn-tickets");

        // Tickets added without a code get one; cheapest type first.
        $response = $this->getJson($url)
            ->assertOk()
            ->assertJsonPath('evenement.id', $evenement->id)
            ->assertJsonCount(3, 'tickets')
            ->assertJsonPath('tickets.0.naam', 'Dagticket')
            ->assertJsonPath('tickets.2.naam', 'VIP')
            ->assertJsonPath('tickets.0.gebruikt', false)
            ->assertJsonPath('tickets.0.gebruikt_op', null)
            ->assertJsonPath('deelname.heeft_ticket', true);
        $eerste = $response->json('tickets.0');
        $this->assertMatchesRegularExpression('/^[A-Za-z0-9_-]{20}$/', $eerste['code']);
        $this->assertSame('LAGAPAY-TICKET:' . $eerste['code'], $eerste['qr']);
        $this->assertSame(0, DB::table('gebruiker_ticket')->whereNull('code')->count());

        // Others can't see my tickets.
        Sanctum::actingAs(Gebruiker::factory()->create());
        $this->getJson($url)->assertNotFound();

        // Only the organiser (or an admin) may scan.
        $this->postJson($this->url('/tickets/scan'), ['code' => $eerste['qr']])
            ->assertForbidden()
            ->assertExactJson(['message' => 'Je mag tickets van dit evenement niet scannen.']);

        Sanctum::actingAs($organisator);
        $this->postJson($this->url('/tickets/scan'), ['code' => 'LAGAPAY-TICKET:bestaatniet'])->assertNotFound();
        $this->postJson($this->url('/tickets/scan'), ['code' => $eerste['qr'], 'evenement_id' => $evenement->id + 1000])
            ->assertStatus(422)
            ->assertJsonPath('message', "Dit ticket is voor {$evenement->naam}.")
            ->assertJsonPath('ticket.gebruikt', false);

        $this->postJson($this->url('/tickets/scan'), ['code' => $eerste['qr'], 'evenement_id' => $evenement->id])
            ->assertOk()
            ->assertJsonPath('ticket.id', $eerste['id'])
            ->assertJsonPath('ticket.naam', 'Dagticket')
            ->assertJsonPath('ticket.eigenaar', $ik->name)
            ->assertJsonPath('ticket.gebruikt', true);
        $this->assertDatabaseHas('gebruiker_ticket', ['id' => $eerste['id'], 'gebruikt' => true]);
        // The scan makes the holder a deelnemer (also before the start) and credits the munten of the scanned
        // ticket only, not of the other Dagticket.
        $this->assertDatabaseHas('gebruiker_evenement', ['gebruiker_id' => $ik->id, 'evenement_id' => $evenement->id, 'geblokkeerd' => false]);
        $this->assertSame(10, (int) DB::table('munten')->where('gebruiker_id', $ik->id)->where('evenement_id', $evenement->id)->sum('hoeveelheid'));

        // Scanning it again: already used. A typed code (without the prefix) works too.
        $this->postJson($this->url('/tickets/scan'), ['code' => $eerste['code']])
            ->assertStatus(409)
            ->assertJsonPath('message', 'Dit ticket is al gebruikt.')
            ->assertJsonPath('ticket.gebruikt', true);

        Sanctum::actingAs(Gebruiker::factory()->create(['rol' => 'admin']));
        $this->postJson($this->url('/tickets/scan'), ['code' => $response->json('tickets.1.code')])->assertOk();
        // The second Dagticket pays out to its holder when it is scanned.
        $this->assertSame(20, (int) DB::table('munten')->where('gebruiker_id', $ik->id)->where('evenement_id', $evenement->id)->sum('hoeveelheid'));

        // In the app: used tickets say so, and the Tickets tab counts them.
        Sanctum::actingAs($ik);
        $this->getJson($url)
            ->assertJsonPath('tickets.0.gebruikt', true)
            ->assertJsonPath('tickets.1.gebruikt', true)
            ->assertJsonPath('tickets.2.gebruikt', false);
        $this->assertNotNull($this->getJson($url)->json('tickets.0.gebruikt_op'));
        $this->getJson($this->url('/tickets'))
            ->assertJsonPath('gekocht.0.aantal', 3)
            ->assertJsonPath('gekocht.0.aantal_gebruikt', 2);
    }

    public function test_een_kaart_per_evenement_en_permanente_koppeling(): void
    {
        $ik = $this->inloggen();
        $ander = Gebruiker::factory()->create();
        $evenement = $this->evenement(['open' => true]);
        $this->deelnemer($ik, $evenement);

        $tijdelijk = $this->kaart($ik, $evenement, uid: 'xxxxxxabcd');
        $this->kaart($ander, $evenement);
        // Deactivated by the dashboard at another evenement: inactief there.
        $inactief = $this->kaart($ik, $this->evenement(['open' => true]), actief: false);
        // A tijdelijke kaart without koppeling is not shown.
        Kaart::factory()->create(['gebruiker_id' => $ik->id, 'type' => Kaart::TYPE_TIJDELIJK]);

        $this->getJson($this->url("/evenementen/{$evenement->id}/kaarten"))
            ->assertOk()
            ->assertExactJson([
                'kaart' => [
                    'id' => $tijdelijk->id, 'uid_laatste4' => 'ABCD', 'permanent' => false, 'status' => 'actief',
                    'evenement' => ['id' => $evenement->id, 'naam' => $evenement->naam],
                ],
                'persoonlijke_kaarten' => [],
            ]);

        $this->postJson($this->url("/evenementen/{$evenement->id}/kaarten/permanent"))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('kaart_id');

        $ouder = $this->kaart($ik, null, uid: 'abcdef1234');
        $permanent = $this->kaart($ik, null, uid: 'abcdef9f9f');
        $vanAnder = $this->kaart($ander, null);

        $weergave = fn (Kaart $kaart, string $laatste4) => [
            'id' => $kaart->id, 'uid_laatste4' => $laatste4, 'permanent' => true, 'status' => 'actief', 'evenement' => null,
        ];
        $permanentWeergave = $weergave($permanent, '9F9F');

        // Not mine, or not a persoonlijke kaart: refused.
        foreach ([$vanAnder->id, $tijdelijk->id, 999999] as $kaartId) {
            $this->postJson($this->url("/evenementen/{$evenement->id}/kaarten/permanent"), ['kaart_id' => $kaartId])
                ->assertNotFound()
                ->assertExactJson(['message' => 'Deze persoonlijke kaart is niet gevonden.']);
        }

        $this->postJson($this->url("/evenementen/{$evenement->id}/kaarten/permanent"), ['kaart_id' => $permanent->id])
            ->assertOk()
            ->assertExactJson([
                'kaart'                => $permanentWeergave,
                'persoonlijke_kaarten' => [$permanentWeergave, $weergave($ouder, '1234')],
            ]);
        $this->postJson($this->url("/evenementen/{$evenement->id}/kaarten/permanent"), ['kaart_id' => $permanent->id])->assertOk();
        // The persoonlijke kaart replaced the tijdelijke one: still one kaart for me in this evenement.
        $this->assertSame(1, KaartKoppeling::where('gebruiker_id', $ik->id)->where('evenement_id', $evenement->id)->count());
        $this->assertDatabaseMissing('kaart_koppelingen', ['kaart_id' => $tijdelijk->id]);

        // Picking the other persoonlijke kaart replaces it again.
        $this->postJson($this->url("/evenementen/{$evenement->id}/kaarten/permanent"), ['kaart_id' => $ouder->id])
            ->assertOk()
            ->assertJsonPath('kaart', $weergave($ouder, '1234'));
        $this->postJson($this->url("/evenementen/{$evenement->id}/kaarten/permanent"), ['kaart_id' => $permanent->id])->assertOk();
        $this->assertSame(1, KaartKoppeling::where('gebruiker_id', $ik->id)->where('evenement_id', $evenement->id)->count());

        // The overzicht (both the Persoonlijk and the Groep page) shows the same one kaart above the tabs.
        $groep = Groep::factory()->create(['evenement_id' => $evenement->id]);
        $this->lidVan($ik, $groep);
        $this->putJson($this->url("/evenementen/{$evenement->id}/betaalbron"), ['soort' => 'groep'])->assertOk();
        $this->getJson($this->url("/evenementen/{$evenement->id}"))
            ->assertJsonPath('kaart', $permanentWeergave)
            ->assertJsonPath('betaalbron', $groep->id);

        $gesloten = $this->evenement(['open' => false]);
        $this->deelnemer($ik, $gesloten);
        $verlopen = $this->kaart($ik, $gesloten);
        $this->postJson($this->url("/evenementen/{$gesloten->id}/kaarten/permanent"), ['kaart_id' => $permanent->id])
            ->assertForbidden()
            ->assertExactJson(['message' => 'Dit evenement is gesloten.']);

        $profiel = $this->getJson($this->url('/kaarten'))
            ->assertOk()
            ->assertJsonPath('permanente_kaart', $permanentWeergave);
        $this->assertSame(
            [[$verlopen->id, 'verlopen'], [$inactief->id, 'inactief']],
            array_map(fn ($k) => [$k['id'], $k['status']], $profiel->json('tijdelijke_kaarten')),
        );
    }

    public function test_evenement_verwijderen_wordt_niet_geblokkeerd_door_koppelingen(): void
    {
        $ik = Gebruiker::factory()->create();
        $evenement = $this->evenement();
        $groep = Groep::factory()->create(['evenement_id' => $evenement->id]);
        $permanent = $this->kaart($ik, null);

        $ik->evenementen()->attach($evenement->id, ['betaalbron' => $groep->id]);
        KaartKoppeling::create(['kaart_id' => $permanent->id, 'gebruiker_id' => $ik->id, 'evenement_id' => $evenement->id]);

        app(EvenementService::class)->deleteEvenement($evenement->id);

        $this->assertDatabaseMissing('evenementen', ['id' => $evenement->id]);
        $this->assertDatabaseCount('kaart_koppelingen', 0);
        $this->assertDatabaseHas('kaarten', ['id' => $permanent->id]);
    }

    public function test_tickets_tab_en_tickets_kopen(): void
    {
        $ik = $this->inloggen();

        $metTicket = $this->evenement(['open' => true, 'heeft_tickets' => true, 'start_datum' => now()->subDay()]);
        $dagticket = $this->ticket($metTicket, 25, 'Dagticket');
        $gekocht = $this->ticket($metTicket, 40, 'Weekend', 5);
        $this->deelnemer($ik, $metTicket);
        $this->koop($ik, $gekocht);
        $this->koop($ik, $gekocht); // two Weekend tickets
        $this->koop($ik, $dagticket);
        DB::table('gebruiker_ticket')->where('ticket_id', $dagticket->id)->update(['gebruikt' => true]);

        $gesloten = $this->evenement(['open' => false, 'heeft_tickets' => true, 'start_datum' => now()->addDays(5)]);
        $oudTicket = $this->ticket($gesloten, 15.5, 'Oud');
        $this->koop($ik, $oudTicket);

        $ouder = $this->evenement(['open' => true, 'heeft_tickets' => true]);
        $this->ticket($ouder, 30);
        $this->ticket($ouder, 25);
        $this->deelnemer($ik, $ouder, bijgewerkt: now()->subHour());

        $zonderTickets = $this->evenement(['open' => true, 'heeft_tickets' => true]);
        $this->deelnemer($ik, $zonderTickets, bijgewerkt: now());

        $geenTicketVerkoop = $this->evenement(['open' => true, 'heeft_tickets' => false]);
        $this->deelnemer($ik, $geenTicketVerkoop);
        $this->deelnemer($ik, $this->evenement(['open' => false, 'heeft_tickets' => true]));
        $this->deelnemer($ik, $this->evenement(['open' => true, 'heeft_tickets' => true]), geblokkeerd: true);

        $response = $this->getJson($this->url('/tickets'))->assertOk();

        $metTicket->refresh();
        $response->assertJsonCount(2, 'gekocht')
            ->assertJsonPath('gekocht.0', [
                'evenement'       => [
                    'id'           => $metTicket->id,
                    'naam'         => $metTicket->naam,
                    'start_datum'  => $metTicket->start_datum->toIso8601String(),
                    'eind_datum'   => $metTicket->eind_datum->toIso8601String(),
                    'open'         => true,
                    'is_deelnemer' => true,
                ],
                'status'          => 'geldig',
                'aantal'          => 3,
                'aantal_gebruikt' => 1,
                'soorten'         => [['naam' => 'Dagticket', 'aantal' => 1], ['naam' => 'Weekend', 'aantal' => 2]],
                'munten'          => 10,
            ])
            ->assertJsonPath('gekocht.1.evenement.id', $gesloten->id)
            ->assertJsonPath('gekocht.1.soorten', [['naam' => 'Oud', 'aantal' => 1]])
            ->assertJsonPath('gekocht.1.status', 'verlopen')
            ->assertJsonPath('gekocht.1.evenement.is_deelnemer', false);

        $this->assertSame([$zonderTickets->id, $ouder->id], array_column($response->json('recent_bekeken'), 'id'));
        $response->assertJsonPath('recent_bekeken.0.vanaf_prijs', null)
            ->assertJsonPath('recent_bekeken.1.vanaf_prijs', '25.00');

        $this->getJson($this->url("/evenementen/{$metTicket->id}/tickets"))
            ->assertOk()
            ->assertJsonPath('evenement.id', $metTicket->id)
            ->assertJsonPath('tickets', [
                ['id' => $dagticket->id, 'naam' => 'Dagticket', 'prijs' => '25.00', 'munten' => null, 'gekocht' => true, 'aantal_gekocht' => 1, 'beschikbaar' => null],
                ['id' => $gekocht->id, 'naam' => 'Weekend', 'prijs' => '40.00', 'munten' => 5, 'gekocht' => true, 'aantal_gekocht' => 2, 'beschikbaar' => null],
            ])
            ->assertJsonPath('deelname', ['is_deelnemer' => true, 'heeft_ticket' => true, 'ticket_gescand' => true, 'gestart' => true, 'kan_deelnemen' => false]);

        $this->getJson($this->url("/evenementen/{$geenTicketVerkoop->id}/tickets"))
            ->assertForbidden()
            ->assertExactJson(['message' => 'Dit evenement heeft geen tickets.']);
    }

    public function test_profiel_bijwerken(): void
    {
        $ik = $this->inloggen(['email' => 'ik@example.com']);
        Gebruiker::factory()->create(['email' => 'ander@example.com']);

        $this->putJson($this->url('/profiel'), ['voornaam' => '', 'achternaam' => str_repeat('a', 256), 'email' => 'geen-email'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['voornaam', 'achternaam', 'email']);

        $this->putJson($this->url('/profiel'), ['voornaam' => 'Lisa', 'achternaam' => 'Vries', 'email' => 'ANDER@example.com'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');

        $this->putJson($this->url('/profiel'), ['voornaam' => 'Lisa', 'tussenvoegsels' => 'de', 'achternaam' => 'Vries', 'email' => 'ik@example.com'])
            ->assertOk()
            ->assertJsonPath('user.id', $ik->id)
            ->assertJsonPath('user.voornaam', 'Lisa')
            ->assertJsonPath('user.tussenvoegsels', 'de')
            ->assertJsonMissingPath('user.wachtwoord');

        $this->putJson($this->url('/profiel'), ['voornaam' => 'Lisa', 'tussenvoegsels' => null, 'achternaam' => 'Vries', 'email' => ' Nieuw@Example.com '])
            ->assertOk()
            ->assertJsonPath('user.email', 'nieuw@example.com')
            ->assertJsonPath('user.tussenvoegsels', null);
        $this->assertDatabaseHas('gebruikers', ['id' => $ik->id, 'email' => 'nieuw@example.com']);
    }

    public function test_wachtwoord_wijzigen(): void
    {
        $ik = $this->inloggen(['wachtwoord' => Hash::make('oud-wachtwoord')]);
        $nieuw = ['wachtwoord' => 'nieuw-wachtwoord', 'wachtwoord_confirmation' => 'nieuw-wachtwoord'];

        $this->putJson($this->url('/profiel/wachtwoord'), $nieuw)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('huidig_wachtwoord');
        $this->putJson($this->url('/profiel/wachtwoord'), ['huidig_wachtwoord' => 'fout'] + $nieuw)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('huidig_wachtwoord');
        $this->putJson($this->url('/profiel/wachtwoord'), ['huidig_wachtwoord' => 'oud-wachtwoord', 'wachtwoord' => 'nieuw-wachtwoord', 'wachtwoord_confirmation' => 'anders!!'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('wachtwoord');
        $this->putJson($this->url('/profiel/wachtwoord'), ['huidig_wachtwoord' => 'oud-wachtwoord', 'wachtwoord' => 'kort', 'wachtwoord_confirmation' => 'kort'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('wachtwoord');

        $this->putJson($this->url('/profiel/wachtwoord'), ['huidig_wachtwoord' => 'oud-wachtwoord'] + $nieuw)
            ->assertOk()
            ->assertJsonStructure(['message']);
        $this->assertTrue(Hash::check('nieuw-wachtwoord', $ik->fresh()->wachtwoord));

        // Google-only account: no huidig wachtwoord needed.
        $google = $this->inloggen(['wachtwoord' => null, 'google_id' => '1234567890']);
        $this->putJson($this->url('/profiel/wachtwoord'), $nieuw)->assertOk();
        $this->assertTrue(Hash::check('nieuw-wachtwoord', $google->fresh()->wachtwoord));
    }

    // Helpers

    private function url(string $pad): string
    {
        // Same host as the API subdomain route group in bootstrap/app.php.
        return 'http://api.' . parse_url(env('APP_URL', 'localhost'), PHP_URL_HOST) . $pad;
    }

    private function initialen(Gebruiker $gebruiker): string
    {
        return mb_strtoupper(mb_substr($gebruiker->voornaam, 0, 1) . mb_substr($gebruiker->achternaam, 0, 1));
    }

    private function inloggen(array $attributen = []): Gebruiker
    {
        $gebruiker = Gebruiker::factory()->create($attributen);
        Sanctum::actingAs($gebruiker);

        return $gebruiker;
    }

    private function evenement(array $attributen = []): Evenement
    {
        return Evenement::factory()->create($attributen + ['open' => true, 'heeft_tickets' => true, 'munt_prijs' => 2.25]);
    }

    private function deelnemer(Gebruiker $gebruiker, Evenement $evenement, bool $geblokkeerd = false, $bijgewerkt = null): void
    {
        DB::table('gebruiker_evenement')->insert([
            'gebruiker_id' => $gebruiker->id,
            'evenement_id' => $evenement->id,
            'geblokkeerd'  => $geblokkeerd,
            'created_at'   => $bijgewerkt ?? now(),
            'updated_at'   => $bijgewerkt ?? now(),
        ]);
    }

    private function lidVan(Gebruiker $gebruiker, Groep $groep): void
    {
        $groep->gebruikers()->attach($gebruiker->id);
    }

    private function transactie(Gebruiker $gebruiker, Evenement $evenement, string $type, int $hoeveelheid, ?Groep $groep = null, int $minutenGeleden = 0): Transactie
    {
        return Transactie::factory()->create([
            'gebruiker_id' => $gebruiker->id,
            'evenement_id' => $evenement->id,
            'groep_id'     => $groep?->id,
            'type'         => $type,
            'hoeveelheid'  => $hoeveelheid,
            'created_at'   => now()->subMinutes($minutenGeleden),
            'updated_at'   => now()->subMinutes($minutenGeleden),
        ]);
    }

    private function munten(Gebruiker $gebruiker, Evenement $evenement, int $hoeveelheid, ?Groep $groep = null): void
    {
        Munt::factory()->create([
            'gebruiker_id' => $gebruiker->id,
            'evenement_id' => $evenement->id,
            'groep_id'     => $groep?->id,
            'hoeveelheid'  => $hoeveelheid,
        ]);
    }

    /** A persoonlijke kaart (no $evenement), or a tijdelijke kaart linked to $evenement. */
    private function kaart(Gebruiker $gebruiker, ?Evenement $evenement, ?string $uid = null, bool $actief = true): Kaart
    {
        $factory = $evenement ? Kaart::factory()->tijdelijkVoor($evenement, $actief) : Kaart::factory();

        return $factory->create(array_filter([
            'gebruiker_id' => $gebruiker->id,
            'uid'          => $uid,
        ], fn ($waarde) => $waarde !== null));
    }

    private function ticket(Evenement $evenement, float $prijs, ?string $naam = null, ?int $munten = null): Ticket
    {
        return Ticket::factory()->create([
            'evenement_id' => $evenement->id,
            'prijs'        => $prijs,
            'naam'         => $naam ?? 'Ticket ' . $prijs,
            'munten'       => $munten,
        ]);
    }

    /** Dev scan of one of my tickets (as if scanned at the entrance). */
    private function devScan(Evenement $evenement, int $ticketId): \Illuminate\Testing\TestResponse
    {
        config(['lagapay.dev_scan' => true]);

        return $this->postJson($this->url("/evenementen/{$evenement->id}/mijn-tickets/{$ticketId}/dev-scan"));
    }

    private function koop(Gebruiker $gebruiker, Ticket $ticket): void
    {
        DB::table('gebruiker_ticket')->insert(['gebruiker_id' => $gebruiker->id, 'ticket_id' => $ticket->id]);
    }
}
