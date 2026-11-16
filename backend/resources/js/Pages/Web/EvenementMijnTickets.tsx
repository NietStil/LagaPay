import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import WebLayout, { EvenementBasis, EvenementKop, Melding, datum } from '../../Components/Web/WebLayout';

/** One of my bought tickets (TicketOverzichtService::mijnEvenementTickets). */
interface MijnTicket {
    id: number;
    qr: string;
    naam: string;
    prijs: string;
    munten: number;
    gebruikt: boolean;
    gebruikt_op: string | null;
    te_geven: boolean;
    gekregen_van: string | null;
}

interface EvenementMijnTicketsProps {
    evenement: EvenementBasis;
    deelname: { is_deelnemer: boolean; heeft_ticket: boolean };
    tickets: MijnTicket[];
    /** My link for friends; `beschikbaar` = tickets still on offer. null until I put one on offer. */
    uitnodiging: { link: string; beschikbaar: number } | null;
    appLink: string;
    /** Buying (more) tickets for this evenement. */
    ticketsUrl: string;
    /** How many tickets I just bought; set right after Afrekenen. */
    gekocht: number | null;
}

/**
 * My tickets of one evenement with their QR codes: the web version of the app's evenement/[id]/mijn-tickets screen.
 * Buying tickets ends here.
 */
export default function EvenementMijnTickets({ evenement, deelname, tickets, uitnodiging, appLink, ticketsUrl, gekocht }: EvenementMijnTicketsProps) {
    return (
        <WebLayout title={`Mijn tickets · ${evenement.naam}`}>
            <div className="space-y-8">
                <EvenementKop evenement={evenement} />

                {gekocht ? (
                    <Melding soort="succes">
                        {gekocht === 1 ? 'Ticket gekocht.' : `${gekocht} tickets gekocht.`} Testmodus: er is nog niet echt betaald.
                    </Melding>
                ) : null}

                {!deelname.is_deelnemer && deelname.heeft_ticket && evenement.open && (
                    <Melding>
                        Laat je ticket scannen bij de ingang, dan doe je mee. Munten kopen en betalen aan de bar doe je met de LagaPay-app.
                    </Melding>
                )}

                <section className="space-y-3">
                    <h2 className="text-lg font-bold text-white">Mijn tickets</h2>
                    {tickets.length === 0 ? (
                        <Melding>Je hebt nog geen tickets voor dit evenement.</Melding>
                    ) : (
                        <>
                            <p className="text-sm text-zinc-400">Laat de QR-code scannen bij de ingang. Je vindt je tickets ook in de app.</p>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {tickets.map((t) => (
                                    <MijnTicketKaart key={t.id} ticket={t} />
                                ))}
                            </div>
                        </>
                    )}
                </section>

                {uitnodiging && uitnodiging.beschikbaar > 0 && (
                    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 space-y-2">
                        <h2 className="font-semibold text-white">Tickets voor vrienden</h2>
                        <p className="text-sm text-zinc-400">
                            Deel deze link: je vrienden openen hem in de LagaPay-app en krijgen dan een van je tickets.
                        </p>
                        <code className="block break-all rounded-lg bg-zinc-950 px-3 py-2 text-sm text-purple-300">{uitnodiging.link}</code>
                    </section>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                    {evenement.open && evenement.heeft_tickets && (
                        <a
                            href={ticketsUrl}
                            className="flex-1 py-3.5 px-4 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 text-zinc-100 text-center font-semibold rounded-xl transition-colors"
                        >
                            Meer tickets kopen
                        </a>
                    )}
                    <a
                        href={appLink}
                        className="flex-1 py-3.5 px-4 text-center text-sm font-semibold text-purple-400 hover:text-purple-300"
                    >
                        Open dit evenement in de app
                    </a>
                </div>
            </div>
        </WebLayout>
    );
}

function MijnTicketKaart({ ticket }: { ticket: MijnTicket }) {
    const [qr, setQr] = useState<string | null>(null);

    useEffect(() => {
        QRCode.toDataURL(ticket.qr, { margin: 1, width: 480 }).then(setQr, () => setQr(null));
    }, [ticket.qr]);

    const status = ticket.gebruikt
        ? `Gescand${ticket.gebruikt_op ? ` op ${datum(ticket.gebruikt_op)}` : ''}`
        : ticket.te_geven
          ? 'Voor een vriend, nog niet opgehaald'
          : ticket.gekregen_van
            ? `Gekregen van ${ticket.gekregen_van}`
            : 'Geldig';

    return (
        <div className={`rounded-2xl border border-zinc-800 p-4 ${ticket.gebruikt ? 'bg-[#111113]' : 'bg-zinc-900'}`}>
            {/* Like the app's Mijn tickets: once scanned, the QR fades out under a tilted "Gebruikt" tag. */}
            <div className="relative mx-auto w-full max-w-[240px]" aria-label={ticket.gebruikt ? 'QR-code, gebruikt' : 'QR-code om te scannen bij de ingang'}>
                <div className={`aspect-square w-full rounded-xl bg-white p-2 ${ticket.gebruikt ? 'opacity-20' : ''}`}>
                    {qr && <img src={qr} alt={`QR-code van je ticket ${ticket.naam}`} className="h-full w-full" />}
                </div>
                {ticket.gebruikt && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <span className="-rotate-12 rounded-xl border-2 border-zinc-300 bg-zinc-950/90 px-5 py-2 text-xl font-extrabold uppercase tracking-[3px] text-zinc-100">
                            Gebruikt
                        </span>
                    </div>
                )}
            </div>
            <p className={`mt-3 font-semibold ${ticket.gebruikt ? 'text-zinc-400' : 'text-white'}`}>{ticket.naam}</p>
            <p className="text-sm text-zinc-400">{status}</p>
        </div>
    );
}

