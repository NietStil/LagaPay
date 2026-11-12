import { Head } from '@inertiajs/react';

interface LandingProps {
    /** The dashboard on the organisator subdomain. */
    organisatorUrl: string;
}

const STAPPEN = [
    {
        titel: 'Koop je ticket',
        tekst: 'Via de link van het evenement, in een paar tikken.',
    },
    {
        titel: 'Waardeer munten op',
        tekst: 'Voor jezelf, of samen met je vrienden in een groep.',
    },
    {
        titel: 'Betaal met je kaart',
        tekst: 'Eén tik aan de bar, het saldo zie je meteen in de app.',
    },
];

/** Public landing page on the main domain. */
export default function Landing({ organisatorUrl }: LandingProps) {
    return (
        <div className="min-h-screen bg-zinc-950 flex flex-col font-sans text-zinc-100 selection:bg-purple-900 selection:text-white">
            <Head title="Betalen op evenementen" />

            <header className="w-full border-b border-zinc-800/80 px-4 sm:px-6 h-16 flex items-center justify-between">
                <span className="font-bold text-lg tracking-tight text-white select-none">
                    Laga<span className="text-purple-400">Pay</span>
                </span>
                <a
                    href={organisatorUrl}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-sm transition-colors border border-zinc-700/60"
                >
                    Voor organisatoren
                </a>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-16">
                <div className="text-center max-w-2xl">
                    <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-5">
                        Betalen op evenementen, <span className="text-purple-400">zonder gedoe</span>
                    </h1>
                    <p className="text-zinc-400 text-base sm:text-lg leading-relaxed">
                        Met LagaPay koop je je ticket, waardeer je munten op en betaal je aan de bar met één kaart.
                        Alleen of samen met je groep.
                    </p>
                </div>

                <ol className="mt-12 grid w-full max-w-4xl gap-4 sm:grid-cols-3">
                    {STAPPEN.map((stap, i) => (
                        <li key={stap.titel} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-purple-700/20 text-sm font-bold text-purple-300">
                                {i + 1}
                            </span>
                            <h2 className="mt-4 font-semibold text-white">{stap.titel}</h2>
                            <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{stap.tekst}</p>
                        </li>
                    ))}
                </ol>
            </main>

            <footer className="border-t border-zinc-800/80 px-4 sm:px-6 py-6 text-center text-xs text-zinc-500">
                © {new Date().getFullYear()} LagaPay
            </footer>
        </div>
    );
}
