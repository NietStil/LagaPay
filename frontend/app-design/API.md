# LagaPay app API contract

The mobile app talks to the Laravel API subdomain (`backend/routes/api.php`).
All endpoints below require `auth:sanctum` (Bearer token) and return JSON.
TypeScript mirrors of these shapes live in `src/lib/api/types.ts`; the fetch functions in `src/lib/api/lagapay.ts`.

Out of scope for now: **Mollie** and **NFC** (betalen, kaart scannen).
Until Mollie exists, opwaarderen and tickets kopen are **test betalingen**: booked straight away without a payment, only while
`config('lagapay.test_betalingen')` is on (env `LAGAPAY_TEST_BETALINGEN`, default on for `APP_ENV=local` only; off → 403
"Betalen is nog niet beschikbaar."). Terugstorten and the bankkaart still show a "nog niet beschikbaar" message in the app.

## Conventions

- Dates: ISO 8601 strings (`2026-07-18T14:00:00+02:00`, Laravel's default `toIso8601String()`).
- Money in euros: decimal string with 2 decimals (`"1.50"`), as Laravel's `decimal:2` cast returns it.
- Munten: integers.
- `bedrag` on a transactie is **signed**: positive = munten in, negative = munten out.
- Errors: `{ "message": "..." }` with 403 (no access / closed / blocked), 404 (not found), 409 (conflict), 422 (validation, Laravel shape with `errors`).
- Access to `/evenementen/{id}` and `/evenementen/{id}/*` requires a **non-blocked** row in `gebruiker_evenement` for the current user; otherwise 404 with `{ "message": "Evenement niet gevonden." }`.
  Exceptions: `/evenementen/{id}/tickets` and `/evenementen/{id}/deelnemen` are also open to (non-blocked) users with a ticket for the evenement or who opened its link (`bekeken_evenementen`).

## Data model rules

- **Persoonlijk wallet**: `munten` rows with `gebruiker_id = me`, `evenement_id = X`, `groep_id IS NULL`. Saldo = SUM(hoeveelheid).
- **Groep wallet**: `munten` rows with `groep_id = G`. Saldo = SUM(hoeveelheid).
- **Persoonlijke activiteit**: `transacties` with `gebruiker_id = me`, `evenement_id = X`, `groep_id IS NULL`.
- **Groepsactiviteit**: `transacties` with `groep_id = G` (any member).
- **Mijn groep** in an evenement: the first groep (lowest id) of `evenement_id = X` that I'm a member of (`gebruiker_groep`). A user is in at most one groep per evenement (creating or joining one through the app).
- **Transactie types** and sign: `opwaardering` (+), `ticket` (+), `uitgave` (−), `terugstorting` (−). Unknown types are treated as + . Stored `hoeveelheid` is positive; the API applies the sign.
  Labels: `opwaardering` → "Opwaardering", `ticket` → "Ticket: inbegrepen munten", `uitgave` → "Uitgave", `terugstorting` → "Terugstorting", other → ucfirst(type).
- **Munten gekocht** per groep lid: SUM(hoeveelheid) of that member's transacties in the groep with type `opwaardering` or `ticket`.
- **Aandeel** per groep lid: groep saldo split proportional to munten gekocht, rounded with the largest-remainder method so the shares add up to the saldo exactly. If nobody bought anything, every aandeel is 0.
  Ties on the remainder go to the higher munten gekocht, then to the lower gebruiker id (so every lid sees the same split).
- **Kaarten**:
  - Permanente kaart: `kaarten` row with `evenement_id IS NULL` (the most recent one if there are several).
  - Tijdelijke kaart: `kaarten` row with `evenement_id` set.
  - Slots: new table `kaart_koppelingen` (`id`, `kaart_id`, `gebruiker_id`, `evenement_id`, `groep_id` nullable, `soort` = `persoonlijk`|`groep`, timestamps, unique `gebruiker_id + evenement_id + soort`).
  - Persoonlijk slot = koppeling with `soort = persoonlijk`, **falling back** to my most recent `actief` tijdelijke kaart for that evenement when there is no koppeling.
  - Groep slot = koppeling with `soort = groep` (no fallback). Only returned when I'm in a groep and the koppeling's `groep_id` is that groep (a koppeling from a groep I left is ignored).
  - Status: `inactief` when `actief = false`; otherwise `verlopen` when the kaart is tijdelijk and its evenement is gesloten; otherwise `actief`.
  - Never expose the full `uid`; only `uid_laatste4` (last 4 chars, uppercase).
- **Ticket status**: `geldig` when the evenement is open, `verlopen` when gesloten.
- **Gekochte tickets**: every `gebruiker_ticket` row is one bought ticket with its own `code` (20 nanoid characters) for its QR code
  (QR content `LAGAPAY-TICKET:{code}`). Scanning at the entrance sets `gebruikt` and `gebruikt_op`. Rows added without a code
  (seeders, `attach()`) get one when their owner opens `mijn-tickets`.
- **Tickets for friends**: `gebruiker_id` is the holder, `gekocht_door` the buyer. The buyer can put tickets on offer (`te_geven`)
  and shares one link per evenement (`ticket_uitnodigingen`, `{link_url}/t/{code}`). A friend opening it takes the oldest ticket on
  offer: the row moves to the friend (`overgedragen_op`), gets a **new code** (the buyer's QR stops working) and the friend joins the
  evenement when the deelname rules allow it. A friend takes at most one ticket per link, and not when they already have a ticket
  of their own for that evenement.
- **Munten of a ticket** (`tickets.munten`) are credited to the **holder as soon as they are a deelnemer** (one `ticket` transactie
  per payout, `gebruiker_ticket.munten_uitgekeerd`): when a deelnemer buys, when someone joins, when a friend takes a ticket, and
  when the buyer takes a ticket back. A ticket on offer credits nobody. A ticket whose munten were paid out can't be put on offer.
  Tickets bought before this existed count as paid out.
- **Deelname** (who may become deelnemer): the evenement is open and I'm not blocked. With `heeft_tickets` one of my tickets must
  have been scanned at the entrance (`gebruiker_ticket.gebruikt`); the start date doesn't matter. The scan (`POST /tickets/scan`) makes the
  holder a deelnemer right away, so for evenementen with tickets that is the way in, and only then can I opwaarderen (buy munten).
  Applies to `POST /evenementen/join`, `POST /evenementen/{id}/deelnemen` and `POST /groepen/join`. Existing deelnemers stay deelnemers (joining again is a no-op).
- **Bekeken**: opening an evenement link without being a deelnemer stores a `bekeken_evenementen` row (also when a groep link is refused
  for `ticket_nodig` / `niet_gescand`). It gives access to the evenement's tickets.
- **Recent bekeken** (Tickets tab): evenementen I opened the link of (`bekeken_evenementen`) or am a non-blocked deelnemer of, with `heeft_tickets = true`, `open = true`, not blocked, and no ticket of mine for that evenement; newest of the two timestamps first, max 10.

## Shapes

```ts
EvenementBasis = {
  id: number; naam: string; open: boolean;
  start_datum: string; eind_datum: string;
  telefoon_betaling: boolean; munten_terugstorten: boolean; heeft_tickets: boolean;
  munt_prijs: string;            // euros per munt, "1.50"
}
EvenementSamenvatting = EvenementBasis & { saldo: number }   // persoonlijk saldo

Transactie = {
  id: number; type: string; label: string;
  bedrag: number;                // signed
  datum: string;                 // created_at
  gebruiker: { id: number; voornaam: string } | null   // set for groepsactiviteit, null otherwise
}

GroepLid = {
  id: number; naam: string;      // "Lisa de Vries" (voornaam tussenvoegsels achternaam)
  initialen: string;             // "LV" (first letter voornaam + first letter achternaam)
  is_ik: boolean;
  munten_gekocht: number; aandeel: number;
}

Kaart = {
  id: number; uid_laatste4: string; permanent: boolean; actief: boolean;
  status: 'actief' | 'inactief' | 'verlopen';
  evenement: { id: number; naam: string } | null      // null for the permanente kaart
}
```

## Endpoints

### Evenementen

`GET /evenementen` → `{ evenementen: EvenementSamenvatting[] }`
My non-blocked evenementen. Open first, then by `start_datum` descending.

`POST /evenementen/bekijk` `{ code }` → `{ evenement: EvenementBasis; deelname: Deelname }`
Opening an evenement link (deep link / QR). Doesn't make me a deelnemer; stores the view when I'm not one.
404 unknown code; 403 (DeelnameWeigering) `gesloten` or `geblokkeerd` when I'm not a deelnemer. A deelnemer may open a gesloten evenement.
```ts
Deelname = {
  is_deelnemer: boolean;   // non-blocked row in gebruiker_evenement
  heeft_ticket: boolean;   // a ticket of mine for this evenement (not on offer for a friend)
  ticket_gescand: boolean; // one of my tickets was scanned at the entrance
  gestart: boolean;        // start_datum <= now (informational, not a deelname rule)
  kan_deelnemen: boolean;  // not a deelnemer yet, and the deelname rules allow it now
}
DeelnameWeigering (403 body) = {
  message: string;
  reden: 'gesloten' | 'geblokkeerd' | 'ticket_nodig' | 'niet_gescand';
  evenement_id: number;
}
```
The app: `is_deelnemer` → open the evenement; `kan_deelnemen` → `POST /evenementen/join`, then open it; otherwise open the tickets screen.

`POST /evenementen/join` `{ code }` → `{ evenement: EvenementBasis }`
Makes me a deelnemer (deelname rules). 404 unknown code; 403 DeelnameWeigering. Already a deelnemer: 200.

`POST /evenementen/{id}/deelnemen` → `{ evenement: EvenementBasis }`
Same as join, by id: the "Deelnemen" button on the tickets screen when my ticket was scanned but I'm not a deelnemer yet.

`GET /evenementen/{id}` → overzicht (persoonlijk)
```ts
{
  evenement: EvenementBasis;
  saldo: number;
  activiteit: Transactie[];      // latest 5 persoonlijke transacties
  groep: { id: number; naam: string } | null;
  betaalbron: number | null;     // my groep's id when I last switched to Groep (and am still in it): the app opens on Groep
}
```

`POST /evenementen/{id}/opwaarderen` `{ munten, voor }` → `{ saldo: number }` *(test betaling)*
`munten` 1–500, `voor` = `persoonlijk` | `groep`. Books an `opwaarderingen` row (`status` paid, `method` test, `mollie_id` `test_…`,
`amount` = munten × munt_prijs), an `opwaardering` transactie (with `groep_id` for groep) and the munten on that wallet.
Returns the new saldo of that wallet. 403 gesloten / test betalingen off; 422 validation, or `voor = groep` while I'm not in a groep.

`GET /evenementen/{id}/transacties?filter=alles|opwaarderingen|uitgaven` → `{ transacties: Transactie[] }`
Persoonlijke transacties, newest first, max 200. `opwaarderingen` = bedrag > 0, `uitgaven` = bedrag < 0. Missing `filter` = `alles`; any other value is a 422.

### Groepen

`GET /evenementen/{id}/groep` → `{ groep: GroepDetail | null }` (null when I'm not in a groep)
```ts
GroepDetail = {
  id: number; naam: string; saldo: number;
  uitnodigingslink: string;      // "https://lagapay.nl/g/{groep.code}" (base from config('lagapay.link_url'), env LAGAPAY_LINK_URL)
  leden: GroepLid[];             // me first, then by munten_gekocht desc
  mijn_aandeel: number;
  kaart: Kaart | null;           // my groep slot
  activiteit: Transactie[];      // latest 10 groepstransacties, with gebruiker set
}
```

`PUT /evenementen/{id}/betaalbron` `{ soort: 'persoonlijk' | 'groep' }` → `{ betaalbron: number | null }`
Called by the app when I switch between the Persoonlijk and Groep pages (overzicht and kaarten). Stores
`gebruiker_evenement.betaalbron`: my groep's id for `groep`, null for `persoonlijk` (also null when I'm not in a groep).
It records which saldo I pay from at this evenement, for card payments later (not used for payments yet). Per evenement;
deleting the groep sets it back to null. 422 invalid `soort`.

`POST /evenementen/{id}/groepen` `{ naam }` → 201 `{ groep: GroepDetail }`
Creates a groep with me as its first lid and a new 10-character code (nanoid alphabet). Groepen are made by visitors in the app, not in the dashboard.
422 naam missing or longer than 50; 403 evenement gesloten; 409 I'm already in a groep of this evenement.

`POST /groepen/join` `{ code }` → `{ groep: { id, naam }, evenement_id }`
Joins the groep and also adds me as deelnemer of its evenement (same deelname rules as evenement join).
404 unknown code; 403 DeelnameWeigering (for `ticket_nodig` / `niet_gescand` the app opens the evenement's tickets);
409 I'm already in another groep of that evenement. Joining a groep I'm already in returns 200.
Checks run in that order (404, 403, then 200 when already in this groep, then 409); nothing is written on an error.

### Kaarten

`GET /kaarten` → Profiel
```ts
{ permanente_kaart: Kaart | null; tijdelijke_kaarten: Kaart[] }   // tijdelijk: newest first
```

`GET /evenementen/{id}/kaarten`
```ts
{
  persoonlijk: Kaart | null;
  groep: Kaart | null;
  permanente_kaart: Kaart | null;
  groep_info: { id: number; naam: string } | null;   // my groep in this evenement
}
```

`POST /evenementen/{id}/kaarten/permanent` `{ soort: 'persoonlijk' | 'groep' }` → same shape as `GET /evenementen/{id}/kaarten`
Links my permanente kaart to that slot (upsert koppeling). 404 no permanente kaart; 403 evenement gesloten; 422 `soort = groep` while not in a groep (error on `soort`).
Checks run in the order 422 invalid `soort`, 403, 404, 422 not in a groep.

### Tickets

`GET /tickets` → Tickets tab
```ts
{
  gekocht: {                     // one card per evenement; open evenementen first, then start_datum desc
    evenement: {
      id: number; naam: string; start_datum: string; eind_datum: string; open: boolean;
      is_deelnemer: boolean;
    };
    status: 'geldig' | 'verlopen';
    aantal: number;               // tickets I bought for this evenement
    aantal_gebruikt: number;      // of which scanned at the entrance
    aantal_te_geven: number;      // of which put on offer for friends
    soorten: { naam: string; aantal: number }[];  // per ticket type, prijs asc ("2× Dagticket")
    munten: number;               // included munten of all those tickets
  }[];
  recent_bekeken: {
    id: number; naam: string; start_datum: string; eind_datum: string;
    vanaf_prijs: string | null;  // lowest ticket prijs, null when the evenement has no tickets yet
  }[];
}
```

`GET /evenementen/{id}/tickets` → Tickets kopen (also the screen an evenement link opens before deelname)
```ts
{
  evenement: EvenementBasis;
  tickets: {
    id: number; naam: string; prijs: string; munten: number | null;
    gekocht: boolean; aantal_gekocht: number;   // how many of this type I have
  }[];                                          // prijs asc
  deelname: Deelname;
}
```
Access: non-blocked deelnemer, ticket holder, or someone who opened the link; otherwise 404. 403 when `heeft_tickets` is false.

`POST /evenementen/{id}/tickets/kopen` `{ tickets: { id, aantal }[] }` → same shape as `GET /evenementen/{id}/tickets` *(test betaling)*
Several types and numbers in one go (`aantal` 1–10, each `id` once, max 20 lines). One `gebruiker_ticket` row with its own code per
ticket. `voor_vrienden` (optional, 0–`aantal`) of them are put on offer for friends (see "Tickets for friends"); the others are mine and
their munten are credited as soon as I'm a deelnemer. Same access as the tickets.
Body line: `{ id: number; aantal: number; voor_vrienden?: number }`.
404 a ticket not of this evenement; 403 gesloten / no tickets / test betalingen off; 422 validation (also `voor_vrienden > aantal`).

`GET /evenementen/{id}/mijn-tickets` → the "Mijn tickets" QR screen
```ts
{
  evenement: EvenementBasis;
  tickets: {
    id: number; code: string;
    qr: string;                  // QR content: "LAGAPAY-TICKET:{code}"
    naam: string; prijs: string; munten: number | null;
    gebruikt: boolean; gebruikt_op: string | null;
    te_geven: boolean;           // on offer for a friend
    kan_geven: boolean;          // can be put on offer / taken back: mine, unused, evenement open, munten not paid out yet
    gekregen_van: string | null; // voornaam of the buyer when a friend gave me this ticket
  }[];                           // tickets I hold: my own first, then those on offer; prijs asc, then bought first
  uitnodiging: {                 // null until I put a ticket on offer
    code: string;
    link: string;                // "{link_url}/t/{code}"
    beschikbaar: number;         // tickets still on offer
    vergeven: number;            // tickets friends took
    genomen: { naam: string; datum: string }[];   // who took one, oldest first
  } | null;
  deelname: Deelname;
}
```
Same access as the tickets (ticket holders are allowed).

`PUT /evenementen/{id}/mijn-tickets/{ticket}` `{ te_geven: boolean }` → same shape as `GET /evenementen/{id}/mijn-tickets`
Puts one of my tickets on offer for a friend (creating my uitnodigingslink if needed), or takes it back (its munten are then credited
when I'm a deelnemer). Only for tickets I bought; 404 not mine; 403 given to me / gesloten; 409 already used, or its munten are
already on my saldo; 422 validation.

`POST /ticket-uitnodigingen/{code}/accepteren` → `{ resultaat, evenement: EvenementBasis, van: string | null, deelname: Deelname }`
Opening a buyer's uitnodigingslink (the app route `t/[code]`). Takes one ticket on offer, then joins the evenement when
`deelname.kan_deelnemen` (in practice: the friend becomes a deelnemer when the ticket is scanned at the entrance).
`resultaat`: `gekregen` | `al_ontvangen` (I took one before) | `al_ticket` (I have my own ticket) | `eigen_link` (it's my link).
404 unknown code; 403 DeelnameWeigering `gesloten` / `geblokkeerd`; 409 `{ message, reden: 'vol', evenement_id }` all tickets are given away.

`POST /tickets/scan` `{ code, evenement_id? }` → `{ ticket: GescandTicket }` (organiser of the evenement, or `rol` admin)
Marks the ticket as used and makes its holder a deelnemer (crediting the munten of their tickets), unless the evenement is gesloten
or the holder is blocked. `code` is the QR content or the typed code. There is no scanner screen yet; this is the API for one.
```ts
GescandTicket = {
  id: number; naam: string; evenement: { id: number; naam: string };
  eigenaar: string;              // naam of the buyer
  gebruikt: boolean; gebruikt_op: string | null;
}
```
404 unknown code; 403 not the organiser; 422 `evenement_id` given and the ticket is for another evenement;
409 already used. 422 and 409 also return `ticket`, so the scanner can show which ticket it was.

`POST /evenementen/{id}/mijn-tickets/{ticket}/dev-scan` → same shape as `GET /evenementen/{id}/mijn-tickets`
Development only (`config('lagapay.dev_scan')`, env `LAGAPAY_DEV_SCAN`, on by default for `APP_ENV=local`; otherwise 404). Scans one of
my own tickets of this evenement as if at the entrance (same effect as `POST /tickets/scan`). 404 not my ticket; 409 already used.
The app shows it as "Scan (dev)" on Mijn tickets in development builds (`__DEV__`).

### Profiel

`GET /user` *(already exists)* → `User`

`PUT /profiel` `{ voornaam, tussenvoegsels?, achternaam, email }` → `{ user: User }`
Validation: voornaam/achternaam required max 255, tussenvoegsels nullable max 255, email required email unique on gebruikers (ignoring me).
The email is trimmed and lowercased before validation and storage (same as register).

`PUT /profiel/wachtwoord` `{ huidig_wachtwoord?, wachtwoord, wachtwoord_confirmation }` → `{ message }`
`huidig_wachtwoord` is required and must match when I already have a wachtwoord (Google-only accounts have none). `wachtwoord` min 8, confirmed. Stored hashed.

## Deep links

- Evenement: `https://lagapay.nl/e/{evenement.code}` and `lagapay://e/{code}` → app route `src/app/e/[code].tsx` → `POST /evenementen/bekijk`,
  then the evenement, `POST /evenementen/join` + the evenement, or the tickets screen (see `src/lib/deelnemen.ts`).
- Ticket for a friend: `https://lagapay.nl/t/{code}` and `lagapay://t/{code}` → app route `src/app/t/[code].tsx` →
  `POST /ticket-uitnodigingen/{code}/accepteren`, then the evenement (deelnemer) or its tickets screen.
- Groep: `https://lagapay.nl/g/{groep.code}` and `lagapay://g/{code}` → app route `src/app/g/[code].tsx` → `POST /groepen/join`
  (refused with `ticket_nodig` / `niet_gescand` → the evenement's tickets screen).
- The QR code on screen 4 contains the evenement link. The scanner accepts any URL whose path is `/e/{code}`, `/g/{code}` or `/t/{code}`.
