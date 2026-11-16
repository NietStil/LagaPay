import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import WebLayout, { EvenementBasis, EvenementKop, Melding, euro } from '../../Components/Web/WebLayout';

/** A ticket type for sale (TicketOverzichtService::evenementTickets), the same data the app's tickets screen gets. */
interface TicketTeKoop {
    id: number;
    naam: string;
    prijs: string;
    munten: number;
    aantal_gekocht: number;
    /** Still for sale (0 = uitverkocht), null = onbeperkt. */
    beschikbaar: number | null;
}

interface Deelname {
    is_deelnemer: boolean;
    heeft_ticket: boolean;
}

interface TicketsProps {
    evenement: EvenementBasis;
    appLink: string;
    /** Set when I may not see this evenement (gesloten or geblokkeerd); nothing else is sent then. */
    geweigerd?: string;
    deelname?: Deelname;
    /** null: the evenement has no tickets. */
    tickets?: TicketTeKoop[] | null;
    kopenUrl?: string;
    /** My tickets of this evenement with the QR codes (a separate page; buying ends there). */
    mijnTicketsUrl?: string;
}

// Same limits as the app (and TicketsKopenRequest): at most 10 of a type per order.
const MAX_PER_SOORT = 10;

const maxVoor = (t: TicketTeKoop) => Math.min(MAX_PER_SOORT, t.beschikbaar ?? MAX_PER_SOORT);

/**
 * Buying tickets on the website: the web version of the app's tickets screen (frontend/src/app/evenement/[id]/tickets.tsx),
 * with the same bestelling (aantal + voor vrienden per type). After Afrekenen the server sends me on to my tickets.
 */
export default function Tickets(props: TicketsProps) {
    const { evenement, geweigerd, appLink } = props;

    if (geweigerd) {
        return (
            <WebLayout title={evenement.naam}>
                <div className="space-y-6">
                    <EvenementKop evenement={evenement} />
                    <Melding soort="fout">{geweigerd}</Melding>
                </div>
            </WebLayout>
        );
    }

    return <TicketsKopen {...props} appLink={appLink} />;
}

function TicketsKopen({ evenement, deelname, tickets, kopenUrl, mijnTicketsUrl, appLink }: TicketsProps) {
    const { errors } = usePage().props as { errors: Record<string, string> };
    const fout = Object.values(errors ?? {})[0];
    const [bezig, setBezig] = useState(false);
    const [aantallen, setAantallen] = useState<Record<number, number> | null>(null);
    const [voorVrienden, setVoorVrienden] = useState<Record<number, number>>({});

    const lijst = tickets ?? [];
    // Like the app: one of the cheapest ticket that isn't uitverkocht, while I have none yet.
    const eersteTeKoop = lijst.find((t) => t.beschikbaar !== 0);
    const gekozen: Record<number, number> =
        aantallen ?? (deelname?.heeft_ticket || !evenement.open || !eersteTeKoop ? {} : { [eersteTeKoop.id]: 1 });

    const zetAantal = (ticket: TicketTeKoop, n: number) => {
        const nieuw = Math.max(0, Math.min(maxVoor(ticket), n));
        setAantallen({ ...gekozen, [ticket.id]: nieuw });
        if ((voorVrienden[ticket.id] ?? 0) > nieuw) setVoorVrienden({ ...voorVrienden, [ticket.id]: nieuw });
    };
    const zetVoorVrienden = (ticket: TicketTeKoop, n: number) =>
        setVoorVrienden({ ...voorVrienden, [ticket.id]: Math.max(0, Math.min(gekozen[ticket.id] ?? 0, n)) });

    const bestelling = lijst
        .filter((t) => (gekozen[t.id] ?? 0) > 0)
        .map((t) => ({ id: t.id, aantal: gekozen[t.id], voor_vrienden: voorVrienden[t.id] ?? 0 }));
    const aantalGekozen = bestelling.reduce((som, r) => som + r.aantal, 0);
    const aantalVoorVrienden = bestelling.reduce((som, r) => som + r.voor_vrienden, 0);
    // In cents, so 3 × € 12,10 doesn't become € 36,300000000000004.
    const totaalCenten = lijst.reduce((som, t) => som + Math.round(Number(t.prijs) * 100) * (gekozen[t.id] ?? 0), 0);
    const inBezit = lijst.reduce((som, t) => som + t.aantal_gekocht, 0);

    const afrekenen = () => {
        if (!kopenUrl || aantalGekozen === 0) return;
        setBezig(true);
        // Bought: the server redirects to my tickets. On an error it comes back here.
        router.post(kopenUrl, { tickets: bestelling }, {
            preserveScroll: true,
            // E.g. sold out meanwhile: the page reloads with the numbers left, so start from those again.
            onError: () => setAantallen(null),
            onFinish: () => setBezig(false),
        });
    };

    return (
        <WebLayout title={`Tickets · ${evenement.naam}`}>
            <div className="space-y-8">
                <EvenementKop evenement={evenement} />

                {inBezit > 0 && mijnTicketsUrl && (
                    <a
                        href={mijnTicketsUrl}
                        className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:border-zinc-700"
                    >
                        <div>
                            <p className="font-semibold text-white">Mijn tickets</p>
                            <p className="mt-0.5 text-sm text-zinc-400">
                                {inBezit} {inBezit === 1 ? 'ticket' : 'tickets'} · bekijk de QR-codes
                            </p>
                        </div>
                        <span className="text-xl text-zinc-500" aria-hidden="true">›</span>
                    </a>
                )}

                {fout ? <Melding soort="fout">{fout}</Melding> : null}

                {!evenement.open ? (
                    <Melding>Dit evenement is gesloten. Je kunt geen tickets meer kopen.</Melding>
                ) : tickets === null ? (
                    <Melding>Dit evenement heeft geen tickets.</Melding>
                ) : (
                    <section className="space-y-3">
                        <h2 className="text-lg font-bold text-white">Tickets kopen</h2>
                        {lijst.map((ticket) => (
                            <TicketKaart
                                key={ticket.id}
                                ticket={ticket}
                                aantal={gekozen[ticket.id] ?? 0}
                                voorVrienden={voorVrienden[ticket.id] ?? 0}
                                onAantal={ticket.beschikbaar !== 0 ? (n) => zetAantal(ticket, n) : undefined}
                                onVoorVrienden={(n) => zetVoorVrienden(ticket, n)}
                            />
                        ))}

                        <div className="sticky bottom-4 mt-4 flex items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/95 backdrop-blur p-4">
                            <div>
                                <p className="text-xs text-zinc-400">
                                    {aantalGekozen > 0
                                        ? `Totaal · ${aantalGekozen} ${aantalGekozen === 1 ? 'ticket' : 'tickets'}` +
                                          (aantalVoorVrienden > 0 ? ` (${aantalVoorVrienden} voor vrienden)` : '')
                                        : 'Totaal'}
                                </p>
                                <p className="text-2xl font-bold text-white">{euro(totaalCenten / 100)}</p>
                            </div>
                            <button
                                type="button"
                                onClick={afrekenen}
                                disabled={aantalGekozen === 0 || bezig}
                                className="min-w-[140px] py-3.5 px-5 bg-purple-700 hover:bg-purple-800 text-white font-semibold rounded-xl transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {bezig ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Afrekenen'}
                            </button>
                        </div>
                    </section>
                )}

                {deelname && !deelname.is_deelnemer && !deelname.heeft_ticket && evenement.open && tickets !== null && (
                    <Melding>Koop een ticket om mee te doen. Bij de ingang wordt je ticket gescand, daarna doe je mee.</Melding>
                )}

                <p className="text-center text-sm text-zinc-500">
                    Heb je de app?{' '}
                    <a href={appLink} className="font-semibold text-purple-400 hover:text-purple-300">
                        Open dit evenement in de app
                    </a>
                </p>
            </div>
        </WebLayout>
    );
}

function TicketKaart({
    ticket,
    aantal,
    voorVrienden,
    onAantal,
    onVoorVrienden,
}: {
    ticket: TicketTeKoop;
    aantal: number;
    voorVrienden: number;
    onAantal?: (n: number) => void;
    onVoorVrienden: (n: number) => void;
}) {
    return (
        <div className={`rounded-2xl border p-4 transition-colors ${aantal > 0 ? 'border-purple-600/70 bg-purple-950/20' : 'border-zinc-800 bg-zinc-900'}`}>
            <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                    <p className="font-semibold text-white">{ticket.naam}</p>
                    <p className="mt-0.5 text-sm text-zinc-400">
                        {euro(Number(ticket.prijs))}
                        {ticket.munten > 0 ? ` · ${ticket.munten} munten inbegrepen` : ''}
                    </p>
                    {ticket.beschikbaar === 0 ? (
                        <p className="mt-1 text-xs font-semibold text-rose-400">Uitverkocht</p>
                    ) : ticket.beschikbaar !== null && ticket.beschikbaar <= 20 ? (
                        <p className="mt-1 text-xs font-semibold text-amber-300">Nog {ticket.beschikbaar} beschikbaar</p>
                    ) : null}
                    {ticket.aantal_gekocht > 0 && <p className="mt-1 text-xs font-semibold text-emerald-300">Je hebt er {ticket.aantal_gekocht}</p>}
                </div>
                {onAantal && <Teller naam={ticket.naam} aantal={aantal} max={maxVoor(ticket)} onAantal={onAantal} />}
            </div>

            {onAantal && aantal > 0 && (
                <div className="mt-4 flex items-center justify-between gap-4 border-t border-zinc-800 pt-3">
                    <p className="text-sm text-zinc-400">Waarvan voor vrienden</p>
                    <Teller naam={`${ticket.naam} voor vrienden`} aantal={voorVrienden} max={aantal} onAantal={onVoorVrienden} />
                </div>
            )}
        </div>
    );
}

function Teller({ naam, aantal, max, onAantal }: { naam: string; aantal: number; max: number; onAantal: (n: number) => void }) {
    const knop =
        'w-9 h-9 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 text-lg font-bold text-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed';

    return (
        <div className="flex items-center gap-3 shrink-0">
            <button type="button" aria-label={`Eén ${naam} minder`} className={knop} disabled={aantal <= 0} onClick={() => onAantal(aantal - 1)}>
                −
            </button>
            <span aria-label={`${aantal} × ${naam}`} className={`min-w-[22px] text-center text-lg font-bold ${aantal > 0 ? 'text-white' : 'text-zinc-500'}`}>
                {aantal}
            </span>
            <button type="button" aria-label={`Eén ${naam} meer`} className={knop} disabled={aantal >= max} onClick={() => onAantal(aantal + 1)}>
                +
            </button>
        </div>
    );
}
