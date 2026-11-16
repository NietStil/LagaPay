import React from 'react';
import { Head, router, usePage } from '@inertiajs/react';

interface WebLayoutProps {
    title: string;
    children: React.ReactNode;
}

/** Shell of the public website on the main domain (ticket pages), in the style of the landing page. */
export default function WebLayout({ title, children }: WebLayoutProps) {
    return (
        <div className="min-h-screen bg-zinc-950 flex flex-col font-sans text-zinc-100 selection:bg-purple-900 selection:text-white">
            <Head title={title} />

            <WebHeader />

            <main className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-10">{children}</main>

            <footer className="border-t border-zinc-800/80 px-4 sm:px-6 py-6 text-center text-xs text-zinc-500">
                © {new Date().getFullYear()} LagaPay
            </footer>
        </div>
    );
}

/** Top bar of the main domain: the logo, and top right "Inloggen" or, when logged in, my name with a menu. */
export function WebHeader() {
    const { auth } = usePage().props as { auth?: { user?: { voornaam?: string } | null } };
    const gebruiker = auth?.user;

    return (
        <header className="relative z-20 w-full border-b border-zinc-800/80 px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
            <a href="/" className="font-bold text-lg tracking-tight text-white select-none">
                Laga<span className="text-purple-400">Pay</span>
            </a>
            {gebruiker ? (
                <GebruikerMenu naam={gebruiker.voornaam ?? 'Account'} />
            ) : (
                <a
                    href="/login"
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-sm transition-colors border border-zinc-700/60"
                >
                    Inloggen
                </a>
            )}
        </header>
    );
}

/**
 * My name; hovering (or focusing, so a tap on a phone and the keyboard work too) opens the menu.
 * The menu hangs from the name with padding instead of a margin, so moving the mouse down doesn't close it.
 */
function GebruikerMenu({ naam }: { naam: string }) {
    const item = 'block w-full px-4 py-2.5 text-left text-sm hover:bg-zinc-800 focus:bg-zinc-800 focus:outline-none transition-colors';

    return (
        <div className="group relative">
            <button
                type="button"
                aria-haspopup="menu"
                className="flex max-w-[60vw] items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-zinc-200 transition-colors hover:bg-zinc-800/70 group-focus-within:bg-zinc-800/70"
            >
                <span className="truncate">{naam}</span>
                <svg className="h-4 w-4 shrink-0 text-zinc-400 transition-transform group-hover:rotate-180 group-focus-within:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            <div className="invisible absolute right-0 top-full pt-2 opacity-0 transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                <div role="menu" className="w-48 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 py-1 shadow-xl">
                    <a role="menuitem" href="/mijn-tickets" className={`${item} text-zinc-200 hover:text-white`}>
                        Mijn tickets
                    </a>
                    <button role="menuitem" type="button" onClick={() => router.post('/logout')} className={`${item} text-rose-300 hover:text-rose-200`}>
                        Uitloggen
                    </button>
                </div>
            </div>
        </div>
    );
}

/** A coloured message block: info, succes (e.g. tickets bought) or fout. */
export function Melding({ soort = 'info', children }: { soort?: 'info' | 'succes' | 'fout'; children: React.ReactNode }) {
    const stijl = {
        info: 'bg-zinc-900 border-zinc-800 text-zinc-300',
        succes: 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300',
        fout: 'bg-rose-950/40 border-rose-800/50 text-rose-300',
    }[soort];

    return <div className={`p-4 rounded-xl border text-sm font-medium ${stijl}`}>{children}</div>;
}

/** € 12,10 */
export function euro(bedrag: number): string {
    return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(bedrag);
}

/** za 14 jun 2026, 20:00 */
export function datum(iso: string | null): string | null {
    if (!iso) return null;
    return new Intl.DateTimeFormat('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

/** The evenement fields every ticket page gets (Weergave::evenementBasis). */
export interface EvenementBasis {
    id: number;
    naam: string;
    open: boolean;
    start_datum: string | null;
    eind_datum: string | null;
    heeft_tickets: boolean;
}

export function EvenementKop({ evenement }: { evenement: EvenementBasis }) {
    const start = datum(evenement.start_datum);
    const eind = datum(evenement.eind_datum);

    return (
        <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-purple-300">Evenement</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-white">{evenement.naam}</h1>
            {start && (
                <p className="mt-2 text-sm text-zinc-400">
                    {start}
                    {eind ? ` – ${eind}` : ''}
                </p>
            )}
        </div>
    );
}
