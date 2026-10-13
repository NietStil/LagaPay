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

            $this->postJson($this->url("/evenementen/{$evenement->id}/kaarten/permanent"), ['soort' => 'persoonlijk'])
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
            ->assertJsonPath('groep.kaart', null)
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

    public function test_evenement_met_tickets_eerst_tickets_dan_deelnemen(): void
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
            ->assertJsonPath('deelname', ['is_deelnemer' => false, 'heeft_ticket' => false, 'gestart' => false, 'kan_deelnemen' => false]);
        $this->assertDatabaseHas('bekeken_evenementen', ['gebruiker_id' => $ik->id, 'evenement_id' => $evenement->id]);
        $this->assertDatabaseMissing('gebruiker_evenement', ['gebruiker_id' => $ik->id, 'evenement_id' => $evenement->id]);

        $this->getJson($this->url("/evenementen/{$evenement->id}/tickets"))
            ->assertOk()
            ->assertJsonPath('tickets.0.id', $ticket->id)
            ->assertJsonPath('deelname.kan_deelnemen', false);
        $this->getJson($this->url('/tickets'))->assertOk()->assertJsonPath('recent_bekeken.0.id', $evenement->id);

        // Joining needs a ticket, and then the start of the evenement.
        $this->postJson($this->url('/evenementen/join'), ['code' => 'TICKETS-NODIG-1'])
            ->assertForbidden()
            ->assertExactJson(['message' => 'Koop eerst een ticket om mee te doen.', 'reden' => 'ticket_nodig', 'evenement_id' => $evenement->id]);

        $this->koop($ik, $ticket);
        $this->postJson($this->url("/evenementen/{$evenement->id}/deelnemen"))
            ->assertForbidden()
            ->assertJsonPath('reden', 'niet_gestart');
        $this->getJson($this->url('/tickets'))
            ->assertJsonPath('gekocht.0.evenement.is_deelnemer', false)
            ->assertJsonCount(0, 'recent_bekeken');
        $this->assertDatabaseMissing('gebruiker_evenement', ['gebruiker_id' => $ik->id, 'evenement_id' => $evenement->id]);

        $evenement->update(['start_datum' => now()->subMinute()]);
        $this->postJson($this->url('/evenementen/bekijk'), ['code' => 'TICKETS-NODIG-1'])
            ->assertJsonPath('deelname', ['is_deelnemer' => false, 'heeft_ticket' => true, 'gestart' => true, 'kan_deelnemen' => true]);
        $this->postJson($this->url("/evenementen/{$evenement->id}/deelnemen"))
            ->assertOk()
            ->assertJsonPath('evenement.id', $evenement->id)
            ->assertJsonPath('evenement.heeft_tickets', true);
        $this->assertDatabaseHas('gebruiker_evenement', ['gebruiker_id' => $ik->id, 'evenement_id' => $evenement->id, 'geblokkeerd' => false]);
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
            ->assertOk()
            ->assertJsonPath('groep.id', $groep->id);
        $this->assertDatabaseHas('gebruiker_evenement', ['gebruiker_id' => $ik->id, 'evenement_id' => $evenement->id]);
        $this->assertDatabaseHas('gebruiker_groep', ['gebruiker_id' => $ik->id, 'groep_id' => $groep->id]);
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
            ->assertJsonPath('groep.kaart', null)
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

    public function test_ticket_kopen_zonder_betaling(): void
    {
        config(['lagapay.test_betalingen' => true]);
        $ik = $this->inloggen();
        $evenement = $this->evenement(['heeft_tickets' => true, 'code' => 'TICKET-KOPEN-01', 'start_datum' => now()->subHour()]);
        $dag = $this->ticket($evenement, 25, 'Dagticket', 10);
        $zonderMunten = $this->ticket($evenement, 15, 'Avond');
        $ander = $this->ticket($this->evenement(), 5);

        // Before opening the link I can't see (or buy) the tickets.
        $this->postJson($this->url("/evenementen/{$evenement->id}/tickets/{$dag->id}/kopen"))->assertNotFound();
        $this->postJson($this->url('/evenementen/bekijk'), ['code' => 'TICKET-KOPEN-01'])->assertOk();

        $this->postJson($this->url("/evenementen/{$evenement->id}/tickets/{$ander->id}/kopen"))->assertNotFound();

        // Bought: same answer as GET tickets, now with my ticket; and since it has started I can join.
        $this->postJson($this->url("/evenementen/{$evenement->id}/tickets/{$dag->id}/kopen"))
            ->assertOk()
            ->assertJsonPath('tickets.1.id', $dag->id)
            ->assertJsonPath('tickets.1.gekocht', true)
            ->assertJsonPath('deelname', ['is_deelnemer' => false, 'heeft_ticket' => true, 'gestart' => true, 'kan_deelnemen' => true]);
        $this->assertDatabaseHas('gebruiker_ticket', ['gebruiker_id' => $ik->id, 'ticket_id' => $dag->id]);

        $this->postJson($this->url("/evenementen/{$evenement->id}/tickets/{$dag->id}/kopen"))
            ->assertStatus(409)
            ->assertExactJson(['message' => 'Je hebt dit ticket al.']);
        $this->assertSame(1, DB::table('gebruiker_ticket')->where('ticket_id', $dag->id)->count());

        // The included munten land on my persoonlijk saldo (a ticket without munten adds none).
        $this->postJson($this->url("/evenementen/{$evenement->id}/tickets/{$zonderMunten->id}/kopen"))->assertOk();
        $this->postJson($this->url("/evenementen/{$evenement->id}/deelnemen"))->assertOk();
        $this->getJson($this->url("/evenementen/{$evenement->id}"))
            ->assertJsonPath('saldo', 10)
            ->assertJsonCount(1, 'activiteit')
            ->assertJsonPath('activiteit.0.label', 'Ticket: inbegrepen munten');

        $zonderVerkoop = $this->evenement(['heeft_tickets' => false]);
        $this->deelnemer($ik, $zonderVerkoop);
        $verboden = $this->ticket($zonderVerkoop, 5);
        $this->postJson($this->url("/evenementen/{$zonderVerkoop->id}/tickets/{$verboden->id}/kopen"))
            ->assertForbidden()
            ->assertExactJson(['message' => 'Dit evenement heeft geen tickets.']);
    }

    public function test_kaarten_fallback_en_permanente_koppeling(): void
    {
        $ik = $this->inloggen();
        $ander = Gebruiker::factory()->create();
        $evenement = $this->evenement(['open' => true]);
        $this->deelnemer($ik, $evenement);

        $tijdelijk = $this->kaart($ik, $evenement, actief: true, uid: 'xxxxxxabcd');
        $inactief = $this->kaart($ik, $evenement, actief: false);
        $this->kaart($ander, $evenement, actief: true);

        $this->getJson($this->url("/evenementen/{$evenement->id}/kaarten"))
            ->assertOk()
            ->assertExactJson([
                'persoonlijk' => [
                    'id' => $tijdelijk->id, 'uid_laatste4' => 'ABCD', 'permanent' => false, 'actief' => true, 'status' => 'actief',
                    'evenement' => ['id' => $evenement->id, 'naam' => $evenement->naam],
                ],
                'groep'            => null,
                'permanente_kaart' => null,
                'groep_info'       => null,
            ]);

        $this->postJson($this->url("/evenementen/{$evenement->id}/kaarten/permanent"), ['soort' => 'persoonlijk'])
            ->assertNotFound()
            ->assertExactJson(['message' => 'Je hebt geen permanente kaart.']);

        $this->kaart($ik, null, actief: true);
        $permanent = $this->kaart($ik, null, actief: true, uid: 'abcdef9f9f');

        $this->postJson($this->url("/evenementen/{$evenement->id}/kaarten/permanent"), ['soort' => 'iets'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('soort');
        $this->postJson($this->url("/evenementen/{$evenement->id}/kaarten/permanent"), ['soort' => 'groep'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('soort');

        $permanentWeergave = [
            'id' => $permanent->id, 'uid_laatste4' => '9F9F', 'permanent' => true, 'actief' => true, 'status' => 'actief', 'evenement' => null,
        ];

        $this->postJson($this->url("/evenementen/{$evenement->id}/kaarten/permanent"), ['soort' => 'persoonlijk'])
            ->assertOk()
            ->assertJsonPath('persoonlijk', $permanentWeergave)
            ->assertJsonPath('permanente_kaart', $permanentWeergave)
            ->assertJsonPath('groep', null);
        $this->postJson($this->url("/evenementen/{$evenement->id}/kaarten/permanent"), ['soort' => 'persoonlijk'])->assertOk();
        $this->assertSame(1, KaartKoppeling::where('gebruiker_id', $ik->id)->count());

        $groep = Groep::factory()->create(['evenement_id' => $evenement->id]);
        $this->lidVan($ik, $groep);

        $this->postJson($this->url("/evenementen/{$evenement->id}/kaarten/permanent"), ['soort' => 'groep'])
            ->assertOk()
            ->assertJsonPath('groep', $permanentWeergave)
            ->assertJsonPath('groep_info', ['id' => $groep->id, 'naam' => $groep->naam]);
        $this->assertDatabaseHas('kaart_koppelingen', [
            'gebruiker_id' => $ik->id, 'evenement_id' => $evenement->id, 'soort' => 'groep', 'groep_id' => $groep->id, 'kaart_id' => $permanent->id,
        ]);
        $this->getJson($this->url("/evenementen/{$evenement->id}/groep"))->assertJsonPath('groep.kaart', $permanentWeergave);

        $gesloten = $this->evenement(['open' => false]);
        $this->deelnemer($ik, $gesloten);
        $verlopen = $this->kaart($ik, $gesloten, actief: true);
        $this->postJson($this->url("/evenementen/{$gesloten->id}/kaarten/permanent"), ['soort' => 'persoonlijk'])
            ->assertForbidden()
            ->assertExactJson(['message' => 'Dit evenement is gesloten.']);

        $profiel = $this->getJson($this->url('/kaarten'))
            ->assertOk()
            ->assertJsonPath('permanente_kaart', $permanentWeergave);
        $this->assertSame(
            [[$verlopen->id, 'verlopen'], [$inactief->id, 'inactief'], [$tijdelijk->id, 'actief']],
            array_map(fn ($k) => [$k['id'], $k['status']], $profiel->json('tijdelijke_kaarten')),
        );
    }

    public function test_evenement_verwijderen_wordt_niet_geblokkeerd_door_koppelingen(): void
    {
        $ik = Gebruiker::factory()->create();
        $evenement = $this->evenement();
        $groep = Groep::factory()->create(['evenement_id' => $evenement->id]);
        $permanent = $this->kaart($ik, null, actief: true);

        KaartKoppeling::create(['kaart_id' => $permanent->id, 'gebruiker_id' => $ik->id, 'evenement_id' => $evenement->id, 'soort' => 'persoonlijk']);
        KaartKoppeling::create(['kaart_id' => $permanent->id, 'gebruiker_id' => $ik->id, 'evenement_id' => $evenement->id, 'groep_id' => $groep->id, 'soort' => 'groep']);

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
        $this->koop($ik, $gekocht); // duplicate row is shown once

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
                'id'        => $gekocht->id,
                'naam'      => 'Weekend',
                'prijs'     => '40.00',
                'munten'    => 5,
                'status'    => 'geldig',
                'evenement' => [
                    'id'           => $metTicket->id,
                    'naam'         => $metTicket->naam,
                    'start_datum'  => $metTicket->start_datum->toIso8601String(),
                    'eind_datum'   => $metTicket->eind_datum->toIso8601String(),
                    'open'         => true,
                    'is_deelnemer' => true,
                ],
            ])
            ->assertJsonPath('gekocht.1.id', $oudTicket->id)
            ->assertJsonPath('gekocht.1.prijs', '15.50')
            ->assertJsonPath('gekocht.1.status', 'verlopen')
            ->assertJsonPath('gekocht.1.evenement.is_deelnemer', false);

        $this->assertSame([$zonderTickets->id, $ouder->id], array_column($response->json('recent_bekeken'), 'id'));
        $response->assertJsonPath('recent_bekeken.0.vanaf_prijs', null)
            ->assertJsonPath('recent_bekeken.1.vanaf_prijs', '25.00');

        $this->getJson($this->url("/evenementen/{$metTicket->id}/tickets"))
            ->assertOk()
            ->assertJsonPath('evenement.id', $metTicket->id)
            ->assertJsonPath('tickets', [
                ['id' => $dagticket->id, 'naam' => 'Dagticket', 'prijs' => '25.00', 'munten' => null, 'gekocht' => false],
                ['id' => $gekocht->id, 'naam' => 'Weekend', 'prijs' => '40.00', 'munten' => 5, 'gekocht' => true],
            ])
            ->assertJsonPath('deelname', ['is_deelnemer' => true, 'heeft_ticket' => true, 'gestart' => true, 'kan_deelnemen' => false]);

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

    private function kaart(Gebruiker $gebruiker, ?Evenement $evenement, bool $actief, ?string $uid = null): Kaart
    {
        return Kaart::factory()->create(array_filter([
            'gebruiker_id' => $gebruiker->id,
            'evenement_id' => $evenement?->id,
            'actief'       => $actief,
            'uid'          => $uid,
        ], fn ($waarde) => $waarde !== null) + ['evenement_id' => null]);
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

    private function koop(Gebruiker $gebruiker, Ticket $ticket): void
    {
        DB::table('gebruiker_ticket')->insert(['gebruiker_id' => $gebruiker->id, 'ticket_id' => $ticket->id]);
    }
}
