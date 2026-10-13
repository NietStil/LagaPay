# LagaPay app: design and functional spec

This folder holds the design of the LagaPay mobile app and a description of how the app should work.

- `README.md`: this document.
- `screens/`: 16 HTML pages, one per app screen (390 px wide phone layout).

## How to view the screens

Open `screens/Main.dc.html` in a browser. The screens link to each other, so you can click through the app.
The pages were exported from a design canvas. They are plain HTML and CSS and need no build step.
The `<script src="./support.js">` line points to a file that is not included. You can ignore the console error.

Published canvas (private link, owner only): https://claude.ai/artifact/QfXBxy5wdfFoXZASjHS2YQ

All names, amounts and dates in the screens are sample data.

---

## 1. What the app is

LagaPay is a payment app for evenementen. A visitor:

1. Joins an evenement (QR code or link).
2. Optionally buys a ticket.
3. Tops up **munten** (coins) through Mollie.
4. Pays at the bar with NFC (phone or kaart).
5. Gets the remaining munten back after the evenement has closed.

Organisers manage evenementen in the web dashboard. The mobile app is for visitors.

- Platform: Expo (React Native), file-based routing with `expo-router`.
- Language: Dutch for all user-facing text and API field names.
- Style: dark (zinc-950 background), purple accent, rounded cards. This matches the existing login and register screens.

## 2. Navigation

Bottom tab bar with three tabs. This is the final order.

| Position | Tab | Screen |
|---|---|---|
| Left | Tickets | `MijnTickets.dc.html` |
| Center (default) | Evenementen | `Main.dc.html` |
| Right | Profiel | `Profiel.dc.html` |

The old Kaarten tab is removed. Kaarten now live in Profiel (permanent kaart) and inside each evenement (kaart per evenement).

Everything else is a pushed screen without the tab bar.

```
Tickets tab ──> Tickets kopen (13)
Evenementen tab ──> Evenement toevoegen (4)
                └─> Evenement open (5 persoonlijk / 6 groep) ──> Opwaarderen (14), Betalen (15),
                    │                                            Transacties (16), Kaart persoonlijk (9)
                    │                                            Kaart groep (11)
                    └─> Evenement gesloten (7 persoonlijk / 8 groep)
Profiel tab (persoonlijke gegevens, bankkaart, permanente en tijdelijke kaarten)
```

## 3. Core concepts

- **Evenement**: can be open or gesloten. It has a start and eind datum and a `munt_prijs`.
  Three options affect the app:
  - `heeft_tickets`: tickets can be bought. Without it there are no tickets, and people join by QR or link.
  - `telefoon_betaling`: paying with the phone via NFC is available.
  - `munten_terugstorten`: munten can be returned after the evenement.
- **Munten**: the coin balance per evenement. There is a personal balance and a group balance.
- **Persoonlijk | Groep**: inside every evenement a tab bar at the top switches between your own pages and the pages of your groep.
  These are separate pages.
- **Kaarten**:
  - One kaart per evenement for persoonlijk and one for groep.
  - One permanent kaart per account (in Profiel). It can be chosen when linking a kaart.
- **Joining**: by scanning a QR code. The evenement code is only used inside the link that the QR code (and shared links) point to. The user never types a code.

## 4. Screens

Each entry names the file in `screens/`.

### 4.1 Tabs

**1. Tickets tab (`MijnTickets.dc.html`)**
- "Gekocht": ticket cards with evenement name, ticket type, dates, status (Geldig), included munten.
- "Recent bekeken, nog geen ticket": evenementen the user visited but has not bought a ticket for, each with a "Koop ticket" button that opens screen 13.
- Bottom tab bar, Tickets active.

**2. Evenementen tab (`Main.dc.html`)**
- Title "Evenementen". No greeting, no filters, no "+" button.
- "Evenement toevoegen" row at the top, with a separating line underneath. It opens screen 4.
- Compact evenement cards:
  - Name and dates on the left.
  - Saldo in the bottom right, with an arrow above it.
  - No "open"/"gesloten" text. Open evenementen are purple. Closed evenementen are grey and slightly dimmed.
- An open card opens screen 5. A closed card opens screen 7.

**3. Profiel tab (`Profiel.dc.html`)**
- Persoonlijke gegevens are visible immediately (voornaam, tussenvoegsel, achternaam, e-mailadres). No sub tab.
- "Wachtwoord wijzigen" is a button.
- No Google account row.
- **Bankkaart**: the user's bank card is shown (brand, masked number, expiry).
- **Kaarten**: the permanent kaart plus the tijdelijke kaarten per evenement, each with a status.
- Uitloggen.

### 4.2 Joining an evenement

**4. Evenement toevoegen (`Toevoegen.dc.html`)**
- QR scanning only. No code field.
- A note says that opening a link also adds you to the evenement.

### 4.3 Inside an open evenement

**5. Evenement open, persoonlijk (`Overzicht.dc.html`)**
- Header with name, dates and an "Open" pill. Tab bar **Persoonlijk | Groep** below it.
- Hero card with only the big munten amount (no "Jouw saldo" label, no "1 munt = ..." line, no "waarde") and an **Opwaarderen** button.
- Two tiles: **Betalen** and **Kaarten**. There is no Tickets tile and no Transacties tile.
- **Activiteit** as a timeline (vertical line with dots, green for money in, red for money out), with "Alles bekijken" linking to screen 16.
- No terugstorten option while the evenement is open.

**6. Evenement open, groep (`Groep.dc.html`)**
- Same layout idea as screen 5.
- Hero with the groep name and groep balance, plus Opwaarderen.
- A shareable **link** (not a code) with a "Delen" button.
- **Groepskaart** row, linking to screen 11.
- **Leden**: members with the number of munten each has bought.
- **Groepsactiviteit** timeline.

**9. Kaart persoonlijk (`EvenementKaarten.dc.html`)**
- Separate page with the tab bar Persoonlijk | Groep.
- Exactly one kaart slot. Shows the linked kaart (type, masked UID, status) and "Kaart vervangen".

**10. Kaart koppelen, persoonlijk (`KaartKoppelen.dc.html`)**
- Label "Voor: Persoonlijk".
- Scan prompt with an NFC animation: "Scan je kaart".
- Bottom option: "Gebruik mijn permanente kaart".

**11. Kaart groep (`KaartenGroep.dc.html`)**
- Separate page for the groep kaart. Exactly one slot.
- Empty state "Nog geen kaart gekoppeld" with "Kaart koppelen".

**12. Kaart koppelen, groep (`KaartKoppelenGroep.dc.html`)**
- Same as screen 10, labelled "Voor: Groep · Team Rood".

**14. Opwaarderen (`Opwaarderen.dc.html`)**
- The munten amount to buy is big at the top.
- Below it the selectable amounts (5, 10, 20, 50). Each shows its price in euros in small text underneath.
- A minus and plus button for a custom amount.
- Payment goes through **Mollie**. The user chooses the payment method on Mollie's page, so the app has no payment method list.
- Button: "Verder naar betalen · € 30,00".

**15. Betalen (`Betalen.dc.html`)**
- NFC only. No QR code.
- Calm full-screen state: animated rings and "Klaar om te scannen", with the available saldo at the bottom.
- Only available when `telefoon_betaling` is on for the evenement.

**16. Transacties (`Transacties.dc.html`)**
- Full history as a timeline with day headings.
- Filter chips: Alles, Opwaarderingen, Uitgaven.

### 4.4 Inside a closed evenement

**7. Evenement gesloten, persoonlijk (`OverzichtGesloten.dc.html`)**
- Grey "Gesloten" pill. Tab bar Persoonlijk | Groep.
- Hero with the remaining munten and one button: **Munten terugstorten**.
  - It returns every single munt in one action.
  - There is no amount selection and there is no separate terugstorten page.
- Activity timeline.
- No Betalen and no Opwaarderen.

**8. Evenement gesloten, groep (`GroepGesloten.dc.html`)**
- Shows **your share** of the groep balance and the button "Aandeel terugstorten".
- Leden list with munten gekocht and each member's aandeel.

### 4.5 Tickets

**13. Tickets kopen (`Tickets.dc.html`)**
- Opened from the Tickets tab ("Koop ticket").
- Ticket types with price and included munten, one selected, a total bar with "Afrekenen".
- Only for evenementen with `heeft_tickets` on.

## 5. Rules that were decided

1. Bottom tabs are Tickets, Evenementen, Profiel (in that order). No Kaarten tab.
2. Joining an evenement works with QR codes. The code is only part of the link.
3. Inside an evenement, Persoonlijk and Groep are separate pages reached through a tab bar at the top.
4. One kaart per evenement for persoonlijk and one for groep. Linking is done by scanning the kaart, or by choosing the permanent kaart at the bottom.
5. Temporary kaarten belong to an evenement. The permanent kaart belongs to the account and is managed in Profiel.
6. Munten terugstorten only exists when the evenement is closed, and returns all munten at once. In a groep each member receives their own share.
7. Opwaarderen is paid via Mollie.
8. Phone payment is NFC only.
9. Persoonlijke gegevens are shown directly in Profiel. Wachtwoord wijzigen is a button. The user can see a bankkaart in their profile.
10. Timelines are used for activity and for the transaction history.

## 6. Assumptions in the design (please confirm)

These were my choices and are not decided yet.

1. **Where munten are returned to**: the bankkaart in Profiel. Mollie refunds normally go back to the original payment method, so this needs a decision.
2. **Groep share**: proportional to the munten each member bought (example: 20 of 80 bought = 25% of the remaining balance).
3. **Permanent kaart**: may be used in both the persoonlijk and the groep slot.
4. **Groep kaart slot**: only shown when the user is in a groep for that evenement.
5. **Closed evenement**: Betalen and Opwaarderen are hidden. The Kaarten tile is hidden as well.
6. **Persoonlijk and groep balances** are separate wallets in the same evenement.
7. **Bankkaart**: view only in the mockup. Adding or changing it is not designed.
8. **Recently viewed evenementen** (Tickets tab): the rule for what counts as "recently viewed" is not defined.

## 7. Backend

### Already built
- Evenement creation with naam, start/eind datum, `telefoon_betaling`, `munten_terugstorten`, `heeft_tickets`, `munt_prijs`, and a generated 15-character nanoid code.
- `gebruiker_evenement` table linking gebruikers to evenementen (works for free evenementen without tickets), with a `geblokkeerd` flag. Kicking a deelnemer blocks them and keeps their ticket.
- `POST /api/evenementen/join` with a `code` of 15 characters (404 unknown code, 403 closed or blocked).
- Ticket creation is refused when `heeft_tickets` is off.
- Deleting an evenement removes its dependent data and detaches kaarten.
- Dashboard pages for evenementen, tickets, producten, groepen, deelnemers and transacties.
- App API for every screen except Mollie and NFC (contract and data rules: `API.md`):
  evenementen list/overzicht/transacties, groep detail + `POST /groepen/join`, kaarten (Profiel, per evenement,
  permanente kaart koppelen via the new `kaart_koppelingen` table), Tickets tab + tickets per evenement,
  profiel update and wachtwoord wijzigen. Feature tests: `backend/tests/Feature/MobielApiTest.php`.
- Join links: `/e/{evenement code}` and `/g/{groep code}` (app routes `e/[code]` and `g/[code]`, QR scanner on screen 4).

### Still needed
- **Mollie**: create payment and redirect, webhook that updates the status, return to the app. Used by Opwaarderen (14),
  Tickets kopen (13) and terugstorten (7, 8). These buttons now show "Nog niet beschikbaar".
- **Bankkaart** in Profiel: comes with Mollie (customers and mandates). Never store full card numbers.
- **NFC**: Betalen (15), and scanning a kaart on Kaart koppelen (10, 12). Only "Gebruik mijn permanente kaart" works now.
- **Terugstorten**: a single action for a closed evenement with `munten_terugstorten`, for persoonlijk and the groep share
  (the share is already calculated by `GET /evenementen/{id}/groep`).
- **Universal links**: `https://lagapay.nl/e/...` only opens the app after `associatedDomains` / `intentFilters` are set in
  `app.json` and the server hosts the matching files. `lagapay://` links work now.
- **Groep codes**: nothing generates them yet and `groepen.code` has no unique index.
