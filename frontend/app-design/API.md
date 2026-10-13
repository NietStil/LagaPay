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
- **Deelname** (who may become deelnemer): the evenement is open and I'm not blocked. With `heeft_tickets` I also need a ticket
  (`gebruiker_ticket`) and the evenement must have started (`start_datum <= now`). Applies to `POST /evenementen/join`,
  `POST /evenementen/{id}/deelnemen` and `POST /groepen/join`. Existing deelnemers stay deelnemers (joining again is a no-op).
- **Bekeken**: opening an evenement link without being a deelnemer stores a `bekeken_evenementen` row (also when a groep link is refused
  for `ticket_nodig` / `niet_gestart`). It gives access to the evenement's tickets.
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
  heeft_ticket: boolean;   // any ticket of mine for this evenement
  gestart: boolean;        // start_datum <= now
  kan_deelnemen: boolean;  // not a deelnemer yet, and the deelname rules allow it now
}
DeelnameWeigering (403 body) = {
  message: string;
  reden: 'gesloten' | 'geblokkeerd' | 'ticket_nodig' | 'niet_gestart';
  evenement_id: number;
}
```
The app: `is_deelnemer` → open the evenement; `kan_deelnemen` → `POST /evenementen/join`, then open it; otherwise open the tickets screen.

`POST /evenementen/join` `{ code }` → `{ evenement: EvenementBasis }`
Makes me a deelnemer (deelname rules). 404 unknown code; 403 DeelnameWeigering. Already a deelnemer: 200.

`POST /evenementen/{id}/deelnemen` → `{ evenement: EvenementBasis }`
Same as join, by id: the "Deelnemen" button on the tickets screen once I have a ticket and the evenement has started.

`GET /evenementen/{id}` → overzicht (persoonlijk)
```ts
{
  evenement: EvenementBasis;
  saldo: number;
  activiteit: Transactie[];      // latest 5 persoonlijke transacties
  groep: { id: number; naam: string } | null;
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

`POST /evenementen/{id}/groepen` `{ naam }` → 201 `{ groep: GroepDetail }`
Creates a groep with me as its first lid and a new 10-character code (nanoid alphabet). Groepen are made by visitors in the app, not in the dashboard.
422 naam missing or longer than 50; 403 evenement gesloten; 409 I'm already in a groep of this evenement.

`POST /groepen/join` `{ code }` → `{ groep: { id, naam }, evenement_id }`
Joins the groep and also adds me as deelnemer of its evenement (same deelname rules as evenement join).
404 unknown code; 403 DeelnameWeigering (for `ticket_nodig` / `niet_gestart` the app opens the evenement's tickets);
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
  gekocht: {
    id: number; naam: string; prijs: string; munten: number | null;
    status: 'geldig' | 'verlopen';
    evenement: {
      id: number; naam: string; start_datum: string; eind_datum: string; open: boolean;
      is_deelnemer: boolean;     // false: "Bekijk" opens the tickets screen (with "Deelnemen" once started)
    };
  }[];                            // via gebruiker_ticket (each ticket once), open evenementen first, then start_datum desc
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
  tickets: { id: number; naam: string; prijs: string; munten: number | null; gekocht: boolean }[];  // prijs asc
  deelname: Deelname;
}
```
Access: non-blocked deelnemer, ticket holder, or someone who opened the link; otherwise 404. 403 when `heeft_tickets` is false.

`POST /evenementen/{id}/tickets/{ticket}/kopen` → same shape as `GET /evenementen/{id}/tickets` *(test betaling)*
Adds the `gebruiker_ticket` row; included munten go to my persoonlijk saldo as a `ticket` transactie. Same access as the tickets.
404 ticket not of this evenement; 403 gesloten / no tickets / test betalingen off; 409 I already have this ticket.

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
- Groep: `https://lagapay.nl/g/{groep.code}` and `lagapay://g/{code}` → app route `src/app/g/[code].tsx` → `POST /groepen/join`
  (refused with `ticket_nodig` / `niet_gestart` → the evenement's tickets screen).
- The QR code on screen 4 contains the evenement link. The scanner accepts any URL whose path is `/e/{code}` or `/g/{code}`.
