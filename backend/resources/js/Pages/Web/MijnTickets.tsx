import WebLayout, { datum, euro } from '../../Components/Web/WebLayout';

/** One evenement I have tickets for (TicketOverzichtService::mijnTickets, like the app's Tickets tab). */
interface GekochteTickets {
    evenement: { id: number; naam: string; start_datum: string | null; open: boolean };
    status: 'geldig' | 'verlopen';
    aantal: number;
    aantal_gebruikt: number;
    soorten: { naam: string; aantal: number }[];
    /** /e/{code}/tickets: buy more and the QR codes. */
    url: string;
}

/** An evenement with tickets that I opened but have no ticket for yet. */
interface RecentBekeken {
    id: number;
    naam: string;
    start_datum: string | null;
    vanaf_prijs: string | null;
    url: string;
}

interface MijnTicketsProps {
    gekocht: GekochteTickets[];
    recent_bekeken: RecentBekeken[];
}

/** All my tickets on the website, grouped per evenement; each card opens that evenement's tickets with the QR codes. */
export default function MijnTickets({ gekocht, recent_bekeken }: MijnTicketsProps) {
    return (
        <WebLayout title="Mijn tickets">
            <div className="space-y-8">
                <h1 className="text-3xl font-extrabold tracking-tight text-white">Mijn tickets</h1>

                {gekocht.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-center">
                        <p className="font-semibold text-white">Nog geen tickets</p>
                        <p className="mt-1 text-sm text-zinc-400">Open de link van een evenement om tickets te kopen.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {gekocht.map((kaart) => {
                            const geldig = kaart.aantal - kaart.aantal_gebruikt;
                            const start = datum(kaart.evenement.start_datum);

                            return (
                                <a
                                    key={kaart.evenement.id}
                                    href={kaart.url}
                                    className={`block rounded-2xl border border-zinc-800 p-5 transition-colors hover:border-zinc-700 ${kaart.status === 'geldig' ? 'bg-zinc-900' : 'bg-[#111113]'}`}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0">
                                            <p className={`font-semibold ${kaart.status === 'geldig' ? 'text-white' : 'text-zinc-400'}`}>{kaart.evenement.naam}</p>
                                            {start && <p className="mt-0.5 text-sm text-zinc-400">{start}</p>}
                                        </div>
                                        <span
                                            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${kaart.status === 'geldig' ? 'bg-emerald-950/60 text-emerald-300' : 'bg-zinc-800 text-zinc-400'}`}
                                        >
                                            {kaart.status === 'geldig' ? 'Geldig' : 'Verlopen'}
                                        </span>
                                    </div>
                                    <p className="mt-3 text-sm text-zinc-300">
                                        {kaart.soorten.map((s) => `${s.aantal}× ${s.naam}`).join(' · ')}
                                    </p>
                                    <p className="mt-1 text-xs text-zinc-500">
                                        {kaart.aantal_gebruikt > 0 ? `${kaart.aantal_gebruikt} gebruikt · ` : ''}
                                        {geldig} nog te gebruiken
                                    </p>
                                </a>
                            );
                        })}
                    </div>
                )}

                {recent_bekeken.length > 0 && (
                    <section className="space-y-3">
                        <h2 className="text-lg font-bold text-white">Recent bekeken</h2>
                        {recent_bekeken.map((evenement) => (
                            <a
                                key={evenement.id}
                                href={evenement.url}
                                className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:border-zinc-700"
                            >
                                <div className="min-w-0">
                                    <p className="font-semibold text-white">{evenement.naam}</p>
                                    {evenement.start_datum && <p className="mt-0.5 text-sm text-zinc-400">{datum(evenement.start_datum)}</p>}
                                </div>
                                <span className="shrink-0 text-sm font-semibold text-purple-300">
                                    {evenement.vanaf_prijs !== null ? `Vanaf ${euro(Number(evenement.vanaf_prijs))}` : 'Tickets'}
                                </span>
                            </a>
                        ))}
                    </section>
                )}
            </div>
        </WebLayout>
    );
}
