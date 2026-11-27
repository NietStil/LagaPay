<?php

namespace Tests\Feature;

use App\Models\Evenement;
use App\Models\Gebruiker;
use App\Models\Ticket;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\GoogleProvider as Provider;
use Laravel\Socialite\Two\User as SocialiteUser;
use Mockery;
use Tests\TestCase;

/**
 * Buying tickets on the website (main domain) without the app: routes/web.php, Web\TicketsController and
 * Web\AccountController. Uses the same services as the app, so this checks the web flow, not the rules again
 * (those are in MobielApiTest).
 *
 * Inside the docker container the env vars from .env win over phpunit.xml, so pass phpunit's values explicitly
 * (APP_ENV=local keeps the CSRF check on, the database session/cache drivers need tables):
 *   docker exec -e APP_ENV=testing -e SESSION_DRIVER=array -e CACHE_STORE=array -e DB_CONNECTION=sqlite \
 *     -e DB_DATABASE=:memory: -e DB_URL= laravel-app php artisan test
 */
class WebTicketsTest extends TestCase
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

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        config([
            'lagapay.test_betalingen' => true,
            // Inertia's default is js/pages; this project uses js/Pages (case matters on Linux).
            'inertia.pages.paths'     => [resource_path('js/Pages')],
        ]);
    }

    public function test_de_evenement_link_is_openbaar_en_probeert_de_app(): void
    {
        $this->evenement('WEB-LINK-000001', ['naam' => 'Zomerfeest']);

        $this->get($this->url('/e/WEB-LINK-000001'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Web/EvenementLink')
                ->where('evenement.naam', 'Zomerfeest')
                ->where('appLink', 'lagapay://e/WEB-LINK-000001')
                ->where('ticketsUrl', route('web.tickets', 'WEB-LINK-000001')));

        $this->get($this->url('/e/BESTAAT-NIET-01'))->assertNotFound();
    }

    public function test_tickets_kopen_vraagt_eerst_om_in_te_loggen_en_gaat_daarna_terug(): void
    {
        $this->evenement('WEB-LOGIN-00001');
        $gebruiker = Gebruiker::factory()->create(['email' => 'koper@example.com']);

        $this->get($this->url('/e/WEB-LOGIN-00001/tickets'))->assertRedirect(route('web.login'));

        // A normal account may log in here (unlike organisator.*), and lands back on the tickets.
        $this->post($this->url('/login'), ['email' => 'Koper@Example.com ', 'wachtwoord' => 'password'])
            ->assertRedirect(route('web.tickets', 'WEB-LOGIN-00001'));
        $this->assertAuthenticatedAs($gebruiker);

        // Logged in, /login sends me to the main domain's home, not to the organisator dashboard.
        $this->get($this->url('/login'))->assertRedirect(route('landing'));
    }

    public function test_verkeerd_wachtwoord_geeft_dezelfde_melding_als_in_de_app(): void
    {
        Gebruiker::factory()->create(['email' => 'koper@example.com']);

        $this->from($this->url('/login'))
            ->post($this->url('/login'), ['email' => 'koper@example.com', 'wachtwoord' => 'fout'])
            ->assertRedirect($this->url('/login'))
            ->assertSessionHasErrors(['email' => 'De opgegeven inloggegevens zijn onjuist.']);
        $this->assertGuest();
    }

    public function test_registreren_op_de_website(): void
    {
        $this->post($this->url('/register'), [
            'voornaam'   => 'Sam',
            'achternaam' => 'Jansen',
            'email'      => ' Sam@Example.com',
            'wachtwoord' => 'geheim123',
        ])->assertRedirect(route('landing'));

        $sam = Gebruiker::where('email', 'sam@example.com')->firstOrFail();
        $this->assertAuthenticatedAs($sam);
        $this->assertSame('gebruiker', $sam->fresh()->rol);

        // The same email can't register twice.
        $this->post($this->url('/logout'));
        $this->post($this->url('/register'), [
            'voornaam' => 'Sam', 'achternaam' => 'Twee', 'email' => 'sam@example.com', 'wachtwoord' => 'geheim123',
        ])->assertSessionHasErrors('email');
    }

    public function test_inloggen_en_registreren_bieden_google_aan(): void
    {
        $this->get($this->url('/login'))
            ->assertInertia(fn (Assert $page) => $page->component('Auth/Login')->where('googleUrl', route('web.google')));
        $this->get($this->url('/register'))
            ->assertInertia(fn (Assert $page) => $page->component('Web/Register')->where('googleUrl', route('web.google')));

        // Registering with a tussenvoegsel, like the app's register screen.
        $this->post($this->url('/register'), [
            'voornaam' => 'Daan', 'tussenvoegsels' => 'van', 'achternaam' => 'Dijk', 'email' => 'daan@example.com', 'wachtwoord' => 'geheim123',
        ])->assertRedirect(route('landing'));
        $this->assertSame('van', Gebruiker::where('email', 'daan@example.com')->value('tussenvoegsels'));
    }

    public function test_google_login_op_de_website(): void
    {
        $this->evenement('WEB-GOOGLE-0001');

        // Sent to login from the tickets, then on to Google with the shared redirect URI and our own state.
        $this->get($this->url('/e/WEB-GOOGLE-0001/tickets'));
        $naarGoogle = $this->get($this->url('/auth/google'))->assertRedirect();
        parse_str(parse_url($naarGoogle->headers->get('Location'), PHP_URL_QUERY), $query);
        $this->assertSame(config('services.google.redirect'), $query['redirect_uri']);
        $this->assertSame(['flow' => 'web', 'nonce' => session('google_web_nonce')], json_decode(Crypt::decryptString($query['state']), true));

        // Google sends me back to the shared callback: handled here (not forwarded), new account, back to the tickets.
        $this->fakeGoogle('google-123', 'Lisa@Example.com', 'Lisa', 'Smit');
        $this->get($this->url('/auth/google/callback?code=abc&state=' . urlencode($query['state'])))
            ->assertRedirect(route('web.tickets', 'WEB-GOOGLE-0001'));

        $lisa = Gebruiker::where('email', 'lisa@example.com')->firstOrFail();
        $this->assertAuthenticatedAs($lisa);
        $this->assertSame(['google-123', 'Lisa', 'Smit'], [$lisa->google_id, $lisa->voornaam, $lisa->achternaam]);
    }

    public function test_google_state_van_een_andere_sessie_logt_niet_in(): void
    {
        $this->fakeGoogle('google-456', 'mallory@example.com', 'Mallory', 'X');
        $vreemdeState = Crypt::encryptString(json_encode(['flow' => 'web', 'nonce' => 'niet-van-deze-sessie']));

        $this->get($this->url('/auth/google/callback?code=abc&state=' . urlencode($vreemdeState)))
            ->assertRedirect(route('web.login'))
            ->assertSessionHasErrors('email');
        $this->assertGuest();
        $this->assertFalse(Gebruiker::where('email', 'mallory@example.com')->exists());
    }

    public function test_google_callback_stuurt_app_en_dashboard_nog_steeds_door(): void
    {
        $host = parse_url(config('app.url'));
        $poort = isset($host['port']) ? ':' . $host['port'] : '';

        // The app's state is an encrypted deep link: on to api.*
        $appState = urlencode(Crypt::encryptString('exp://192.168.1.5:8081/--/login'));
        $naar = $this->get($this->url("/auth/google/callback?code=abc&state={$appState}"))->headers->get('Location');
        $this->assertStringStartsWith("{$host['scheme']}://api.{$host['host']}{$poort}/auth/google/callback?code=abc", $naar);

        // The dashboard's state is Socialite's random string: on to organisator.*
        $naar = $this->get($this->url('/auth/google/callback?code=abc&state=willekeurig40tekens'))->headers->get('Location');
        $this->assertStringStartsWith("{$host['scheme']}://organisator.{$host['host']}{$poort}/auth/google/callback?code=abc", $naar);
    }

    public function test_tickets_kopen_op_de_website_werkt_zoals_in_de_app(): void
    {
        $evenement = $this->evenement('WEB-KOPEN-00001');
        $dag = $this->ticket($evenement, 25, 'Dag');
        $vip = $this->ticket($evenement, 60, 'VIP', capaciteit: 1);
        $ik = Gebruiker::factory()->create();
        $this->actingAs($ik);

        // Opening the tickets page counts as opening the link (like the app's bekijk), so I may buy.
        $this->get($this->url('/e/WEB-KOPEN-00001/tickets'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Web/Tickets')
                ->has('tickets', 2)
                ->where('tickets.0.naam', 'Dag')
                ->where('tickets.1.beschikbaar', 1)
                ->missing('mijnTickets')
                ->where('kopenUrl', route('web.tickets.kopen', 'WEB-KOPEN-00001'))
                ->where('mijnTicketsUrl', route('web.evenement.mijn-tickets', 'WEB-KOPEN-00001')));
        $this->assertTrue(DB::table('bekeken_evenementen')->where('gebruiker_id', $ik->id)->where('evenement_id', $evenement->id)->exists());

        $kopen = $this->url('/e/WEB-KOPEN-00001/tickets');

        // Same validation as the app (TicketsKopenRequest).
        $this->post($kopen, ['tickets' => [['id' => $dag->id, 'aantal' => 11]]])
            ->assertSessionHasErrors('tickets.0.aantal');
        // Same capaciteit check (BetaalService): only 1 VIP left.
        $this->post($kopen, ['tickets' => [['id' => $vip->id, 'aantal' => 2]]])
            ->assertSessionHasErrors(['tickets' => 'Er zijn nog maar 1 tickets van VIP beschikbaar.']);
        $this->assertSame(0, DB::table('gebruiker_ticket')->count());

        // Bought: on to my tickets (a separate page), with how many I just bought.
        $this->followingRedirects()
            ->post($kopen, ['tickets' => [['id' => $dag->id, 'aantal' => 2], ['id' => $vip->id, 'aantal' => 1]]])
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Web/EvenementMijnTickets')
                ->where('gekocht', 3)
                // My tickets with QR codes, each with its own link for a friend, like in the app.
                ->has('tickets', 3)
                ->where('tickets.0.qr', fn ($qr) => str_ends_with($qr, DB::table('gebruiker_ticket')->where('gebruiker_id', $ik->id)->orderBy('id')->value('code')))
                ->where('tickets.0.deel_link', fn ($link) => str_ends_with($link, '/t/' . DB::table('gebruiker_ticket')->where('gebruiker_id', $ik->id)->orderBy('id')->value('deel_code')))
                ->where('weggegeven', [])
                ->where('deelname.heeft_ticket', true)
                ->where('ticketsUrl', route('web.tickets', 'WEB-KOPEN-00001')));

        $this->assertSame(3, DB::table('gebruiker_ticket')->where('gebruiker_id', $ik->id)->count());
        $this->assertSame(3, DB::table('gebruiker_ticket')->where('gebruiker_id', $ik->id)->whereNotNull('deel_code')->count());

        // The "just bought" message is only shown once.
        $this->get($this->url('/e/WEB-KOPEN-00001/mijn-tickets'))->assertInertia(fn (Assert $page) => $page->where('gekocht', null));

        // The buying page now shows the VIP uitverkocht and how many I have.
        $this->get($this->url('/e/WEB-KOPEN-00001/tickets'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('tickets.0.aantal_gekocht', 2)
                ->where('tickets.1.beschikbaar', 0));
    }

    public function test_mijn_tickets_overzicht_linkt_per_evenement_naar_de_tickets(): void
    {
        $this->get($this->url('/mijn-tickets'))->assertRedirect(route('web.login'));

        $evenement = $this->evenement('WEB-OVERZICHT-1', ['naam' => 'Festival']);
        $this->evenement('WEB-OVERZICHT-2', ['naam' => 'Alleen bekeken']);
        $dag = $this->ticket($evenement, 25, 'Dag');
        $ik = Gebruiker::factory()->create();
        $this->actingAs($ik);

        $this->get($this->url('/e/WEB-OVERZICHT-1/tickets'));
        $this->get($this->url('/e/WEB-OVERZICHT-2/tickets'));
        $this->post($this->url('/e/WEB-OVERZICHT-1/tickets'), ['tickets' => [['id' => $dag->id, 'aantal' => 2]]]);

        $this->get($this->url('/mijn-tickets'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Web/MijnTickets')
                ->has('gekocht', 1)
                ->where('gekocht.0.evenement.naam', 'Festival')
                ->where('gekocht.0.aantal', 2)
                ->where('gekocht.0.url', route('web.evenement.mijn-tickets', 'WEB-OVERZICHT-1'))
                ->has('recent_bekeken', 1)
                ->where('recent_bekeken.0.url', route('web.tickets', 'WEB-OVERZICHT-2')));
    }

    public function test_zonder_de_link_te_openen_of_geblokkeerd_geen_tickets(): void
    {
        $evenement = $this->evenement('WEB-TOEGANG-001');
        $dag = $this->ticket($evenement, 25);
        $ik = Gebruiker::factory()->create();
        $this->actingAs($ik);

        // Buying straight away, without opening the tickets page first: same 404 as the app's EvenementZichtbaar.
        // My tickets page follows the same rule.
        $this->post($this->url('/e/WEB-TOEGANG-001/tickets'), ['tickets' => [['id' => $dag->id, 'aantal' => 1]]])->assertNotFound();
        $this->get($this->url('/e/WEB-TOEGANG-001/mijn-tickets'))->assertNotFound();

        DB::table('gebruiker_evenement')->insert([
            'gebruiker_id' => $ik->id, 'evenement_id' => $evenement->id, 'geblokkeerd' => true, 'created_at' => now(), 'updated_at' => now(),
        ]);

        $this->get($this->url('/e/WEB-TOEGANG-001/tickets'))
            ->assertForbidden()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Web/Tickets')
                ->where('geweigerd', 'Je bent geblokkeerd voor dit evenement.')
                ->missing('tickets'));
        $this->post($this->url('/e/WEB-TOEGANG-001/tickets'), ['tickets' => [['id' => $dag->id, 'aantal' => 1]]])->assertNotFound();
        $this->assertSame(0, DB::table('gebruiker_ticket')->count());
    }

    /** Google answers the callback with this user, without a real request. */
    private function fakeGoogle(string $id, string $email, string $voornaam, string $achternaam): void
    {
        $googleUser = (new SocialiteUser())
            ->setRaw(['given_name' => $voornaam, 'family_name' => $achternaam])
            ->map(['id' => $id, 'email' => $email, 'name' => "{$voornaam} {$achternaam}"]);

        $provider = Mockery::mock(Provider::class);
        $provider->shouldReceive('stateless')->andReturnSelf();
        $provider->shouldReceive('user')->andReturn($googleUser);
        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);
    }

    private function url(string $pad): string
    {
        // The main domain route group in routes/web.php.
        return 'http://' . parse_url(config('app.url'), PHP_URL_HOST) . $pad;
    }

    private function evenement(string $code, array $attributen = []): Evenement
    {
        return Evenement::factory()->create($attributen + [
            'code'          => $code,
            'open'          => true,
            'heeft_tickets' => true,
            'start_datum'   => now()->addWeek(),
        ]);
    }

    private function ticket(Evenement $evenement, float $prijs, ?string $naam = null, ?int $capaciteit = null): Ticket
    {
        return Ticket::factory()->create([
            'evenement_id' => $evenement->id,
            'prijs'        => $prijs,
            'naam'         => $naam ?? 'Ticket ' . $prijs,
            'munten'       => 0,
            'capaciteit'   => $capaciteit,
        ]);
    }
}
