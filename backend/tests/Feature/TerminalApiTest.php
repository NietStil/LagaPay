<?php

namespace Tests\Feature;

use App\Models\Evenement;
use App\Models\Gebruiker;
use App\Models\Groep;
use App\Models\Kaart;
use App\Models\KaartKoppeling;
use App\Models\Munt;
use App\Models\ProductCategorie;
use App\Models\Terminal;
use App\Services\Evenementen\DeelnemersService;
use App\Services\Evenementen\EvenementService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** Bar terminal endpoints (/terminals/*). Run like MobielApiTest (sqlite or a test database). */
class TerminalApiTest extends TestCase
{
    use RefreshDatabase;

    protected function beforeRefreshingDatabase(): void
    {
        $verbinding = config('database.default');
        $database = (string) config("database.connections.{$verbinding}.database");

        if (config("database.connections.{$verbinding}.driver") !== 'sqlite' && ! str_contains($database, 'test')) {
            $this->markTestSkipped("RefreshDatabase zou database [{$database}] leegmaken; gebruik sqlite of een testdatabase.");
        }
    }

    public function test_nieuw_evenement_krijgt_een_terminal_code(): void
    {
        $organisator = Gebruiker::factory()->create();
        $evenement = app(EvenementService::class)->createEvenement($organisator->id, [
            'naam' => 'Feest', 'start_datum' => now(), 'eind_datum' => now()->addDay(), 'telefoon_betaling' => true,
            'munten_terugstorten' => false, 'heeft_tickets' => false, 'munt_prijs' => 2,
        ]);

        $this->assertSame(15, strlen($evenement->terminal_code));
        $this->assertNotSame($evenement->code, $evenement->terminal_code);
    }

    public function test_koppelen_verlaten_en_opnieuw_koppelen_houdt_een_rij(): void
    {
        $ik = $this->inloggen();
        $evenement = $this->evenement();

        $this->postJson($this->url('/terminals/koppelen'), ['code' => 'onbekend1234567'])->assertNotFound();
        $this->postJson($this->url('/terminals/koppelen'), ['code' => $evenement->code])->assertNotFound();
        $this->getJson($this->url("/terminals/{$evenement->id}"))->assertNotFound();

        $this->postJson($this->url('/terminals/koppelen'), ['code' => $evenement->terminal_code])
            ->assertOk()
            ->assertJsonPath('evenement.id', $evenement->id);
        $this->assertDatabaseHas('terminals', ['evenement_id' => $evenement->id, 'user_id' => $ik->id, 'actief' => 1]);
        $this->getJson($this->url('/terminals'))->assertOk()->assertJsonPath('terminals.0.id', $evenement->id);

        $this->postJson($this->url("/terminals/{$evenement->id}/verlaten"))->assertOk();
        $this->assertDatabaseHas('terminals', ['evenement_id' => $evenement->id, 'user_id' => $ik->id, 'actief' => 0]);
        $this->getJson($this->url("/terminals/{$evenement->id}"))->assertNotFound();
        $this->getJson($this->url('/terminals'))->assertExactJson(['terminals' => []]);

        $this->postJson($this->url('/terminals/koppelen'), ['code' => $evenement->terminal_code])->assertOk();
        $this->assertSame(1, Terminal::count());
        $this->assertTrue(Terminal::first()->actief);

        // Blocking from the dashboard stops the terminal, and koppelen is refused while blocked.
        app(DeelnemersService::class)->deelnemerVerwijderen($evenement->id, $ik->id);
        $this->assertFalse(Terminal::first()->actief);
        $this->postJson($this->url('/terminals/koppelen'), ['code' => $evenement->terminal_code])->assertForbidden();

        $gesloten = $this->evenement(['open' => false]);
        $this->postJson($this->url('/terminals/koppelen'), ['code' => $gesloten->terminal_code])->assertForbidden();
    }

    public function test_een_terminal_tegelijk_en_sluiten_logt_uit(): void
    {
        $this->inloggen();
        $eerste = $this->terminalVan();
        $tweede = $this->terminalVan();

        // Joining the second left the first.
        $this->getJson($this->url('/terminals'))->assertJsonCount(1, 'terminals')->assertJsonPath('terminals.0.id', $tweede->id);
        $this->getJson($this->url("/terminals/{$eerste->id}"))->assertNotFound();

        // Closing the evenement (Eloquent) logs its terminals out.
        $tweede->update(['open' => false]);
        $this->assertFalse(Terminal::where('evenement_id', $tweede->id)->first()->actief);
        $this->getJson($this->url('/terminals'))->assertExactJson(['terminals' => []]);
        $this->getJson($this->url("/terminals/{$tweede->id}"))->assertNotFound();

        // Closed straight in the database: the next check logs out too.
        $derde = $this->terminalVan();
        DB::table('evenementen')->where('id', $derde->id)->update(['open' => false]);
        $this->getJson($this->url('/terminals'))->assertExactJson(['terminals' => []]);
        $this->assertFalse(Terminal::where('evenement_id', $derde->id)->first()->actief);
    }

    public function test_overzicht_met_producten_en_categorieen(): void
    {
        $this->inloggen();
        $evenement = $this->terminalVan();
        $bier = ProductCategorie::create(['evenement_id' => $evenement->id, 'naam' => '18+']);
        $fris = ProductCategorie::create(['evenement_id' => $evenement->id, 'naam' => 'Fris']);
        $bier->producten()->create(['naam' => 'Pils', 'prijs' => 3]);
        $chips = $fris->producten()->create(['naam' => 'Chips', 'prijs' => 1]);
        $fris->producten()->create(['naam' => 'Cola', 'prijs' => 2]);
        $this->categorie($this->evenement())->producten()->create(['naam' => 'Ander', 'prijs' => 1]);

        $this->getJson($this->url("/terminals/{$evenement->id}"))
            ->assertOk()
            ->assertJsonPath('categorieen', [['id' => $bier->id, 'naam' => '18+'], ['id' => $fris->id, 'naam' => 'Fris']])
            ->assertJsonCount(3, 'producten')
            ->assertJsonPath('producten.0', ['id' => $chips->id, 'naam' => 'Chips', 'prijs' => 1, 'categorie_id' => $fris->id]);
    }

    public function test_afrekenen_met_persoonlijke_kaart(): void
    {
        $this->inloggen();
        $evenement = $this->terminalVan();
        $pils = $this->categorie($evenement)->producten()->create(['naam' => 'Pils', 'prijs' => 3]);
        $cola = $this->categorie($evenement)->producten()->create(['naam' => 'Cola', 'prijs' => 2]);
        $ander = $this->categorie($this->evenement())->producten()->create(['naam' => 'Ander', 'prijs' => 1]);

        $klant = Gebruiker::factory()->create(['voornaam' => 'Sanne', 'achternaam' => 'Vries']);
        $this->deelnemer($klant, $evenement);
        Kaart::factory()->create(['gebruiker_id' => $klant->id, 'evenement_id' => $evenement->id, 'actief' => true, 'uid' => 'AA11']);
        Munt::factory()->create(['gebruiker_id' => $klant->id, 'evenement_id' => $evenement->id, 'groep_id' => null, 'hoeveelheid' => 10]);

        $url = $this->url("/terminals/{$evenement->id}/afrekenen");
        $bestelling = ['kaart_uid' => 'AA11', 'producten' => [['id' => $pils->id, 'aantal' => 2], ['id' => $cola->id, 'aantal' => 1]]];

        $this->postJson($url, ['kaart_uid' => 'ONBEKEND'] + $bestelling)->assertNotFound();
        $this->postJson($url, ['producten' => [['id' => 9999, 'aantal' => 1]]] + $bestelling)->assertNotFound();
        // A product of another evenement.
        $this->postJson($url, ['producten' => [['id' => $ander->id, 'aantal' => 1]]] + $bestelling)->assertNotFound();

        $this->postJson($url, $bestelling)
            ->assertOk()
            ->assertJsonPath('saldo', 2)
            ->assertJsonPath('transactie.totaal', 8)
            ->assertJsonPath('transactie.naam', 'Sanne Vries')
            ->assertJsonPath('transactie.producten.0', ['naam' => 'Pils', 'aantal' => 2, 'prijs' => 3]);

        $this->assertDatabaseHas('transacties', ['gebruiker_id' => $klant->id, 'type' => 'uitgave', 'hoeveelheid' => 8, 'groep_id' => null]);
        $this->assertSame(2, DB::table('transactie_producten')->count());
        $this->assertDatabaseHas('transactie_producten', ['product' => $pils->id, 'aantal' => 2]);
        $this->assertSame(2, (int) Munt::where('gebruiker_id', $klant->id)->sum('hoeveelheid'));

        // Not enough munten left: nothing is booked.
        $this->postJson($url, $bestelling)->assertUnprocessable();
        $this->assertSame(2, DB::table('transactie_producten')->count());

        $this->getJson($this->url("/terminals/{$evenement->id}/transacties"))
            ->assertOk()
            ->assertJsonCount(1, 'transacties')
            ->assertJsonPath('transacties.0.totaal', 8);
    }

    public function test_afrekenen_met_groepskaart_neemt_groepssaldo(): void
    {
        $this->inloggen();
        $evenement = $this->terminalVan();
        $pils = $this->categorie($evenement)->producten()->create(['naam' => 'Pils', 'prijs' => 3]);

        $klant = Gebruiker::factory()->create();
        $this->deelnemer($klant, $evenement);
        $groep = Groep::factory()->create(['evenement_id' => $evenement->id]);
        $groep->gebruikers()->attach($klant->id);
        $kaart = Kaart::factory()->create(['gebruiker_id' => $klant->id, 'evenement_id' => null, 'actief' => true, 'uid' => 'GR01']);
        KaartKoppeling::create([
            'kaart_id' => $kaart->id, 'gebruiker_id' => $klant->id, 'evenement_id' => $evenement->id,
            'groep_id' => $groep->id, 'soort' => KaartKoppeling::SOORT_GROEP,
        ]);
        Munt::factory()->create(['gebruiker_id' => null, 'evenement_id' => $evenement->id, 'groep_id' => $groep->id, 'hoeveelheid' => 9]);

        $this->postJson($this->url("/terminals/{$evenement->id}/afrekenen"), ['kaart_uid' => 'GR01', 'producten' => [['id' => $pils->id, 'aantal' => 1]]])
            ->assertOk()
            ->assertJsonPath('saldo', 6)
            ->assertJsonPath('transactie.groep.id', $groep->id);
        $this->assertDatabaseHas('transacties', ['gebruiker_id' => $klant->id, 'groep_id' => $groep->id, 'type' => 'uitgave', 'hoeveelheid' => 3]);
    }

    public function test_dev_afrekenen_boekt_zonder_saldo_te_controleren(): void
    {
        $ik = $this->inloggen();
        $evenement = $this->terminalVan();
        $pils = $this->categorie($evenement)->producten()->create(['naam' => 'Pils', 'prijs' => 3]);
        $url = $this->url("/terminals/{$evenement->id}/dev-afrekenen");
        $bestelling = ['producten' => [['id' => $pils->id, 'aantal' => 2]]];

        config(['lagapay.dev_scan' => false]);
        $this->postJson($url, $bestelling)->assertNotFound();
        config(['lagapay.dev_scan' => true]);

        // No linked kaart: booked on the terminal's own wallet, which goes below 0.
        $this->postJson($url, $bestelling)
            ->assertOk()
            ->assertJsonPath('transactie.totaal', 6)
            ->assertJsonPath('saldo', -6);
        $this->assertDatabaseHas('transacties', ['gebruiker_id' => $ik->id, 'type' => 'uitgave', 'hoeveelheid' => 6]);

        // With a linked kaart: its owner pays, also without munten.
        $klant = Gebruiker::factory()->create();
        $this->deelnemer($klant, $evenement);
        Kaart::factory()->create(['gebruiker_id' => $klant->id, 'evenement_id' => $evenement->id, 'actief' => true, 'uid' => 'K1']);

        $this->postJson($url, $bestelling)->assertOk()->assertJsonPath('saldo', -6);
        $this->assertDatabaseHas('transacties', ['gebruiker_id' => $klant->id, 'type' => 'uitgave', 'hoeveelheid' => 6]);
        $this->assertSame(2, DB::table('transactie_producten')->count());
        $this->getJson($this->url("/terminals/{$evenement->id}/transacties"))->assertJsonCount(2, 'transacties');
    }

    public function test_opwaarderen_koppelt_de_transactie_aan_de_opwaardering(): void
    {
        $ik = $this->inloggen();
        $evenement = $this->evenement();
        $this->deelnemer($ik, $evenement);
        config(['lagapay.test_betalingen' => true]);

        $this->postJson($this->url("/evenementen/{$evenement->id}/opwaarderen"), ['munten' => 5, 'voor' => 'persoonlijk'])->assertOk();

        $opwaardering = DB::table('opwaarderingen')->first();
        $this->assertDatabaseHas('transacties', ['type' => 'opwaardering', 'opwaardering_id' => $opwaardering->id]);
    }

    private function url(string $pad): string
    {
        return 'http://api.' . parse_url(env('APP_URL', 'localhost'), PHP_URL_HOST) . $pad;
    }

    private function inloggen(): Gebruiker
    {
        $gebruiker = Gebruiker::factory()->create();
        Sanctum::actingAs($gebruiker);

        return $gebruiker;
    }

    private function evenement(array $attributen = []): Evenement
    {
        return Evenement::factory()->create($attributen + ['open' => true, 'heeft_tickets' => false]);
    }

    /** A new evenement with the logged in gebruiker as its actieve terminal. */
    private function terminalVan(): Evenement
    {
        $evenement = $this->evenement();
        $this->postJson($this->url('/terminals/koppelen'), ['code' => $evenement->terminal_code])->assertOk();

        return $evenement;
    }

    private function categorie(Evenement $evenement): ProductCategorie
    {
        return ProductCategorie::create(['evenement_id' => $evenement->id, 'naam' => 'Algemeen']);
    }

    private function deelnemer(Gebruiker $gebruiker, Evenement $evenement): void
    {
        DB::table('gebruiker_evenement')->insert([
            'gebruiker_id' => $gebruiker->id, 'evenement_id' => $evenement->id, 'geblokkeerd' => false,
            'created_at' => now(), 'updated_at' => now(),
        ]);
    }
}
