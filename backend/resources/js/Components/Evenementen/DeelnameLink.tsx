import React, { useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';
import QRCode from 'qrcode';
import type { Evenement } from '../../types/type';

interface DeelnameLinkProps {
    evenement: Evenement;
}

// Same colors as the app: zinc-950 modules on white, so the code scans well on screen and on paper.
const QR_OPTIES = {
    errorCorrectionLevel: 'M' as const,
    margin: 2,
    color: { dark: '#09090b', light: '#ffffff' },
};

function bestandsnaam(naam: string): string {
    const slug = naam
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return `lagapay-${slug || 'evenement'}-qr`;
}

function download(href: string, naam: string) {
    const a = document.createElement('a');
    a.href = href;
    a.download = naam;
    document.body.appendChild(a);
    a.click();
    a.remove();
}

function dataUrlNaarBestand(dataUrl: string, naam: string): File {
    const [kop, data] = dataUrl.split(',');
    const type = kop.match(/data:(.*?);/)?.[1] ?? 'image/png';
    const bytes = Uint8Array.from(atob(data), (teken) => teken.charCodeAt(0));
    return new File([bytes], naam, { type });
}

async function kopieer(tekst: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(tekst);
        return true;
    } catch {
        // navigator.clipboard only exists on https/localhost; fall back to the old copy command.
        const veld = document.createElement('textarea');
        veld.value = tekst;
        veld.style.position = 'fixed';
        veld.style.opacity = '0';
        document.body.appendChild(veld);
        veld.select();
        const gelukt = document.execCommand('copy');
        veld.remove();
        return gelukt;
    }
}

/**
 * Join link + QR code of an evenement ({link_url}/e/{code}), with copy, share and PNG/SVG download.
 * Visitors scan the QR code in the LagaPay app or open the link on their phone.
 */
export default function DeelnameLink({ evenement }: DeelnameLinkProps) {
    const { link_url } = usePage().props as unknown as { link_url: string };
    const link = evenement.code ? `${link_url}/e/${evenement.code}` : null;

    const [svg, setSvg] = useState<string | null>(null);
    // 1024px PNG, sharp enough to print on a poster. Made up front: iOS Safari only allows
    // navigator.share directly in the click, without slow async work before it.
    const [png, setPng] = useState<string | null>(null);
    const [gekopieerd, setGekopieerd] = useState(false);
    const [fout, setFout] = useState<string | null>(null);
    const kanDelen = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

    useEffect(() => {
        if (!link) return;
        let actief = true;
        Promise.all([
            QRCode.toString(link, { ...QR_OPTIES, type: 'svg' }),
            QRCode.toDataURL(link, { ...QR_OPTIES, width: 1024 }),
        ])
            .then(([svgResultaat, pngResultaat]) => {
                if (!actief) return;
                setSvg(svgResultaat);
                setPng(pngResultaat);
            })
            .catch(() => actief && setFout('De QR-code kon niet worden gemaakt.'));
        return () => {
            actief = false;
        };
    }, [link]);

    if (!link) {
        return null;
    }

    const naam = bestandsnaam(evenement.naam);

    const handleKopieer = async () => {
        setFout(null);
        if (await kopieer(link)) {
            setGekopieerd(true);
            setTimeout(() => setGekopieerd(false), 2000);
        } else {
            setFout('Kopiëren lukte niet. Selecteer de link en kopieer hem handmatig.');
        }
    };

    const handleDownloadPng = () => {
        if (png) download(png, `${naam}.png`);
    };

    const handleDownloadSvg = () => {
        if (!svg) return;
        const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
        download(url, `${naam}.svg`);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    const handleDelen = async () => {
        setFout(null);
        const tekst = `Doe mee met ${evenement.naam} in de LagaPay app.`;
        try {
            // Share the QR image along with the link where the browser supports sharing files.
            const bestand = png ? dataUrlNaarBestand(png, `${naam}.png`) : null;
            if (bestand && navigator.canShare?.({ files: [bestand] })) {
                await navigator.share({ title: evenement.naam, text: tekst, url: link, files: [bestand] });
            } else {
                await navigator.share({ title: evenement.naam, text: tekst, url: link });
            }
        } catch (e) {
            // Closing the share sheet is not an error.
            if (!(e instanceof DOMException && e.name === 'AbortError')) {
                setFout('Delen lukte niet. Kopieer de link of download de QR-code.');
            }
        }
    };

    const knop = 'inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors';

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-lg">
            <h2 className="text-lg font-bold text-white pb-3 border-b border-zinc-800 flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V6a2 2 0 012-2h2M16 4h2a2 2 0 012 2v2M20 16v2a2 2 0 01-2 2h-2M8 20H6a2 2 0 01-2-2v-2" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9h2v2H9zM13 13h2v2h-2zM13 9h2M9 13v2" />
                </svg>
                Deelnemen
            </h2>

            <div className="flex flex-col sm:flex-row gap-6">
                <div className="w-44 h-44 shrink-0 rounded-xl bg-white p-2 mx-auto sm:mx-0 flex items-center justify-center">
                    {svg ? (
                        <img
                            src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`}
                            alt={`QR-code om deel te nemen aan ${evenement.naam}`}
                            className="w-full h-full"
                        />
                    ) : (
                        <div className="w-full h-full rounded-lg bg-zinc-200 animate-pulse" />
                    )}
                </div>

                <div className="flex-1 min-w-0 space-y-4">
                    <p className="text-sm text-zinc-400">
                        Bezoekers scannen deze QR-code in de LagaPay app of openen de link op hun telefoon.
                        Daarna zijn ze deelnemer van dit evenement.
                    </p>

                    <div className="flex items-center gap-2">
                        <input
                            readOnly
                            value={link}
                            onFocus={(e) => e.currentTarget.select()}
                            className="flex-1 min-w-0 px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl font-mono text-xs sm:text-sm text-purple-300 focus:outline-none focus:border-purple-500"
                        />
                        <button
                            onClick={handleKopieer}
                            className={`${knop} shrink-0 bg-purple-700 hover:bg-purple-800 text-white shadow-md shadow-purple-950/40`}
                        >
                            {gekopieerd ? 'Gekopieerd' : 'Kopieer link'}
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {kanDelen && (
                            <button onClick={handleDelen} className={`${knop} bg-zinc-800 hover:bg-zinc-700 text-zinc-100`}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7M16 6l-4-4-4 4M12 2v13" />
                                </svg>
                                Delen
                            </button>
                        )}
                        <button
                            onClick={handleDownloadPng}
                            disabled={!png}
                            className={`${knop} bg-zinc-800 hover:bg-zinc-700 text-zinc-100 disabled:opacity-50`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                            </svg>
                            Download PNG
                        </button>
                        <button
                            onClick={handleDownloadSvg}
                            disabled={!svg}
                            className={`${knop} bg-zinc-800 hover:bg-zinc-700 text-zinc-100 disabled:opacity-50`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                            </svg>
                            Download SVG
                        </button>
                    </div>

                    {!evenement.open && (
                        <p className="text-xs text-zinc-500">
                            Dit evenement is gesloten. Nieuwe deelnemers kunnen niet meer meedoen via deze link.
                        </p>
                    )}
                    {fout && <p className="text-xs text-red-400">{fout}</p>}
                </div>
            </div>
        </div>
    );
}
