import { useEffect, useState } from 'react';
import WebLayout, { EvenementBasis, EvenementKop } from '../../Components/Web/WebLayout';

interface EvenementLinkProps {
    evenement: EvenementBasis;
    /** lagapay://e/{code}: the app's own deep link for this evenement (src/app/e/[code].tsx). */
    appLink: string;
    androidPackage: string;
    /** Buying online (login first), absolute URL. */
    ticketsUrl: string;
}

type Apparaat = 'android' | 'ios' | 'anders';

function apparaat(): Apparaat {
    const ua = navigator.userAgent;
    if (/Android/i.test(ua)) return 'android';
    // iPadOS reports itself as a Mac, but has touch.
    if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
    return 'anders';
}

/**
 * Android: an intent link opens the app when it's installed; when it isn't, Chrome goes to the fallback URL itself,
 * so people without the app land on buying tickets online.
 */
function androidLink(appLink: string, androidPackage: string, fallback: string): string {
    const [scheme, pad] = appLink.split('://');
    return `intent://${pad}#Intent;scheme=${scheme};package=${androidPackage};S.browser_fallback_url=${encodeURIComponent(fallback)};end`;
}

/**
 * The evenement link that organisatoren share ({link_url}/e/{code}). On a phone it first tries to open the app,
 * which then does what it always did; without the app you end up at buying tickets on the website.
 */
export default function EvenementLink({ evenement, appLink, androidPackage, ticketsUrl }: EvenementLinkProps) {
    const [soort, setSoort] = useState<Apparaat>('anders');
    const [proberen, setProberen] = useState(false);
    const teKoop = evenement.open && evenement.heeft_tickets;

    useEffect(() => {
        const s = apparaat();
        setSoort(s);
        if (s === 'anders') return;

        // Only try on its own once per tab, so "back" from the store or the tickets page doesn't bounce again.
        const sleutel = `lagapay-app-geprobeerd:${appLink}`;
        try {
            if (sessionStorage.getItem(sleutel)) return;
            sessionStorage.setItem(sleutel, '1');
        } catch {
            // No sessionStorage (private mode): just try.
        }

        setProberen(true);
        const fallback = teKoop ? ticketsUrl : window.location.href;

        if (s === 'android') {
            window.location.href = androidLink(appLink, androidPackage, fallback);
            return;
        }

        // iOS has no fallback for custom schemes: if the page is still in front after a moment, the app didn't open.
        const timer = window.setTimeout(() => {
            setProberen(false);
            if (document.visibilityState === 'visible' && teKoop) window.location.href = ticketsUrl;
        }, 1600);
        const weg = () => {
            if (document.visibilityState === 'hidden') window.clearTimeout(timer);
        };
        document.addEventListener('visibilitychange', weg);
        window.location.href = appLink;

        return () => {
            window.clearTimeout(timer);
            document.removeEventListener('visibilitychange', weg);
        };
    }, [appLink, androidPackage, ticketsUrl, teKoop]);

    const openAppHref = soort === 'android' ? androidLink(appLink, androidPackage, window.location.href) : appLink;

    return (
        <WebLayout title={evenement.naam}>
            <div className="space-y-8">
                <EvenementKop evenement={evenement} />

                <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 space-y-5">
                    {proberen ? (
                        <div className="flex items-center gap-3 text-sm text-zinc-300">
                            <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                            De LagaPay-app openen…
                        </div>
                    ) : (
                        <p className="text-sm leading-relaxed text-zinc-400">
                            {teKoop
                                ? 'Heb je de LagaPay-app? Open het evenement daar. Geen app? Koop je tickets hier online, je hebt alleen een account nodig.'
                                : !evenement.open
                                  ? 'Dit evenement is gesloten. Je kunt geen tickets meer kopen.'
                                  : 'Dit evenement heeft geen tickets. Doe mee via de LagaPay-app.'}
                        </p>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3">
                        {teKoop && (
                            <a
                                href={ticketsUrl}
                                className="flex-1 py-3.5 px-4 bg-purple-700 hover:bg-purple-800 text-white text-center font-semibold rounded-xl transition-colors"
                            >
                                Koop tickets online
                            </a>
                        )}
                        {soort !== 'anders' && (
                            <a
                                href={openAppHref}
                                className="flex-1 py-3.5 px-4 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 text-zinc-100 text-center font-semibold rounded-xl transition-colors"
                            >
                                Open in de app
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </WebLayout>
    );
}
