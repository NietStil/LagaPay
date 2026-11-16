<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Http\Requests\TicketsKopenRequest;
use App\Models\Evenement;
use App\Services\Mobiel\BetaalService;
use App\Services\Mobiel\DeelnameService;
use App\Services\Mobiel\Exceptions\DeelnameGeweigerd;
use App\Services\Mobiel\Exceptions\TicketsUitverkocht;
use App\Services\Mobiel\TicketOverzichtService;
use App\Services\Mobiel\ToegangService;
use App\Services\Mobiel\Weergave;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * Buying tickets on the website, for people without the app. Uses the same services as the app's API
 * (DeelnameService::bekijk, TicketOverzichtService, BetaalService::koopTickets), so the rules, prices,
 * capaciteit and the tickets bought are exactly the same; only the answer is a page instead of JSON.
 */
class TicketsController extends Controller
{
    public function __construct(
        protected DeelnameService $deelname,
        protected TicketOverzichtService $ticketOverzicht,
        protected BetaalService $betaal,
        protected ToegangService $toegang,
        protected Weergave $weergave,
    ) {}

    /** The shared evenement link: tries to open the app, otherwise on to buying tickets here. */
    public function link(string $code)
    {
        $evenement = Evenement::where('code', $code)->firstOrFail();

        return Inertia::render('Web/EvenementLink', [
            'evenement'      => $this->weergave->evenementBasis($evenement),
            'appLink'        => config('lagapay.app_scheme') . '://e/' . $code,
            'androidPackage' => config('lagapay.android_package'),
            'ticketsUrl'     => route('web.tickets', $code),
        ]);
    }

    /** Like opening the link in the app: remembers the view, then the tickets screen and my tickets with QR codes. */
    public function tickets(Request $request, string $code)
    {
        $gebruiker = $request->user();
        $appLink = config('lagapay.app_scheme') . '://e/' . $code;

        try {
            $bekeken = $this->deelname->bekijk($gebruiker, $code);
        } catch (ModelNotFoundException) {
            abort(404);
        } catch (DeelnameGeweigerd $e) {
            return Inertia::render('Web/Tickets', [
                'evenement' => $this->weergave->evenementBasis(Evenement::where('code', $code)->firstOrFail()),
                'geweigerd' => $e->getMessage(),
                'appLink'   => $appLink,
            ])->toResponse($request)->setStatusCode(403);
        }

        $evenement = Evenement::where('code', $code)->firstOrFail();

        try {
            $tekoop = $this->ticketOverzicht->evenementTickets($gebruiker, $evenement);
        } catch (\DomainException $e) {
            $tekoop = null;
        }

        return Inertia::render('Web/Tickets', [
            'evenement'      => $bekeken['evenement'],
            'deelname'       => $bekeken['deelname'],
            'tickets'        => $tekoop['tickets'] ?? null,
            'appLink'        => $appLink,
            'kopenUrl'       => route('web.tickets.kopen', $code),
            'mijnTicketsUrl' => route('web.evenement.mijn-tickets', $code),
        ]);
    }

    /** My tickets of one evenement with their QR codes (the app's evenement/[id]/mijn-tickets screen). */
    public function mijnTickets(Request $request, string $code)
    {
        $evenement = $this->zichtbaarEvenement($request, $code);
        $mijn = $this->ticketOverzicht->mijnEvenementTickets($request->user(), $evenement);

        return Inertia::render('Web/EvenementMijnTickets', [
            'evenement'   => $mijn['evenement'],
            'deelname'    => $mijn['deelname'],
            'tickets'     => $mijn['tickets'],
            'uitnodiging' => $mijn['uitnodiging'],
            'appLink'     => config('lagapay.app_scheme') . '://e/' . $code,
            'ticketsUrl'  => route('web.tickets', $code),
            // How many I just bought (flashed by kopen()).
            'gekocht'     => $request->session()->get('gekocht'),
        ]);
    }

    /** All my tickets, per evenement: the app's Tickets tab (TicketOverzichtService::mijnTickets) on the website. */
    public function overzicht(Request $request)
    {
        $overzicht = $this->ticketOverzicht->mijnTickets($request->user());

        // The website links by evenement code (/e/{code}/tickets), the app's data only has ids.
        $ids = array_merge(
            array_map(fn (array $kaart) => $kaart['evenement']['id'], $overzicht['gekocht']),
            array_column($overzicht['recent_bekeken'], 'id'),
        );
        $codes = Evenement::whereIn('id', $ids)->pluck('code', 'id');

        return Inertia::render('Web/MijnTickets', [
            // Evenementen with tickets open my tickets, the ones I only looked at open buying.
            'gekocht'        => array_map(
                fn (array $kaart) => $kaart + ['url' => route('web.evenement.mijn-tickets', $codes[$kaart['evenement']['id']])],
                $overzicht['gekocht'],
            ),
            'recent_bekeken' => array_map(
                fn (array $evenement) => $evenement + ['url' => route('web.tickets', $codes[$evenement['id']])],
                $overzicht['recent_bekeken'],
            ),
        ]);
    }

    public function kopen(TicketsKopenRequest $request, string $code)
    {
        $evenement = $this->zichtbaarEvenement($request, $code);
        $bestelling = $request->bestelling();

        try {
            $this->betaal->koopTickets($request->user(), $evenement, $bestelling);
        } catch (ModelNotFoundException) {
            return back()->withErrors(['tickets' => 'Ticket niet gevonden.']);
        } catch (TicketsUitverkocht|\DomainException $e) {
            return back()->withErrors(['tickets' => $e->getMessage()]);
        }

        // Bought: straight to my tickets with the QR codes, like the app does.
        return redirect()
            ->route('web.evenement.mijn-tickets', $code)
            ->with('gekocht', array_sum(array_column($bestelling, 'aantal')));
    }

    /**
     * The evenement when I may see its tickets, otherwise 404. Same rule as the app's EvenementZichtbaar
     * middleware: a deelnemer, someone with a ticket or who opened the link, and not blocked.
     */
    protected function zichtbaarEvenement(Request $request, string $code): Evenement
    {
        $evenementId = Evenement::where('code', $code)->value('id');
        $evenement = $evenementId ? $this->toegang->zichtbaarEvenement($request->user(), $evenementId) : null;

        if (! $evenement) {
            abort(404);
        }

        return $evenement;
    }
}
