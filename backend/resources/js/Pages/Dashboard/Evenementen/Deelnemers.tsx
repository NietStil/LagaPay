import React, { useState, useEffect, useRef } from 'react';
import { router } from '@inertiajs/react';
import type { Evenement } from '../../../types/type';

interface SelectedEvenementProps {
    evenement: Evenement;
    deelnemers: any;
    setPage?: (page: any) => void;
    transacties: any;
}

export default function Deelnemers({ evenement, deelnemers, transacties }: SelectedEvenementProps) {
    const getInitialSearch = () => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            return params.get('search') || '';
        }
        return '';
    };

    const [searchQuery, setSearchQuery] = useState(getInitialSearch());
    const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
    const [selectedGebruiker, setSelectedGebruiker] = useState<any | null>(null);
    const menuRef = useRef<HTMLTableCellElement | null>(null);

    const list: any[] = Array.isArray(deelnemers)
        ? deelnemers
        : (deelnemers?.data || []);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setActiveMenuId(null);
            }
        };

        if (activeMenuId !== null) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [activeMenuId]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setSearchQuery(val);

        router.get(
            `/dashboard/evenementen/${evenement.id}`,
            { tab: 'deelnemers', search: val },
            { preserveState: true, replace: true, preserveScroll: true }
        );
    };

    const handleKickUser = (gebruikerId: number) => {
        if (confirm('Weet je zeker dat je deze deelnemer wilt blokkeren voor dit evenement?')) {
            router.delete(`/dashboard/evenementen/${evenement.id}/deelnemers/${gebruikerId}`, {
                preserveScroll: true,
                onSuccess: () => setActiveMenuId(null),
            });
        }
    };

    const handleUnblock = (gebruikerId: number) => {
        router.post(`/dashboard/evenementen/${evenement.id}/deelnemers/${gebruikerId}/deblokkeren`, {}, {
            preserveScroll: true,
            onSuccess: () => setActiveMenuId(null),
        });
    };

    const handleDisableKaarten = (gebruikerId: number) => {
        if (confirm('Weet je zeker dat je alle kaarten van deze deelnemer wilt deactiveren?')) {
            router.post(`/dashboard/evenementen/${evenement.id}/deelnemers/${gebruikerId}/disable-kaarten`, {}, {
                preserveScroll: true,
                onSuccess: () => setActiveMenuId(null),
            });
        }
    };

    const handleKickGroepen = (gebruikerId: number) => {
        if (confirm('Weet je zeker dat je deze deelnemer wilt verwijderen uit alle groepen van dit evenement?')) {
            router.post(`/dashboard/evenementen/${evenement.id}/deelnemers/${gebruikerId}/kick-groepen`, {}, {
                preserveScroll: true,
                onSuccess: () => setActiveMenuId(null),
            });
        }
    };

    const totalDeelnemersCount = deelnemers?.total ?? list.length;

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header Card */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-2 shadow-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.get('/dashboard/evenementen')}
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                            title="Terug naar evenementen"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <h1 className="text-2xl font-extrabold text-white tracking-tight">
                            Deelnemers &mdash; <span className="text-purple-400">{evenement.naam}</span>
                        </h1>
                    </div>

                    <div className="text-sm font-semibold text-zinc-400">
                        Totaal: <span className="text-purple-400 font-bold">{totalDeelnemersCount}</span> deelnemers
                    </div>
                </div>

                {/* Search Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={handleSearchChange}
                            placeholder="Zoek deelnemer op naam of e-mail..."
                            className="w-full pl-9 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
                        />
                        <svg className="w-4 h-4 text-zinc-500 absolute left-3 top-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                    </div>
                </div>

                {/* Deelnemers Table */}
                {list.length === 0 ? (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-zinc-950 border border-zinc-800 text-purple-400 flex items-center justify-center mx-auto">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-bold text-white">Geen deelnemers gevonden</h3>
                        <p className="text-sm text-zinc-400 max-w-md mx-auto">
                            {searchQuery
                                ? `Er zijn geen deelnemers die overeenkomen met "${searchQuery}".`
                                : 'Er zijn momenteel geen geregistreerde deelnemers gekoppeld aan dit evenement.'}
                        </p>
                    </div>
                ) : (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-zinc-950 text-zinc-400 text-xs uppercase font-semibold border-b border-zinc-800">
                                    <tr>
                                        <th className="px-6 py-4">Deelnemer</th>
                                        <th className="px-6 py-4">E-mail</th>
                                        <th className="px-6 py-4">Ticket</th>
                                        <th className="px-6 py-4">Groep(en)</th>
                                        <th className="px-6 py-4">NFC Kaart</th>
                                        <th className="px-6 py-4 text-right">Saldo</th>
                                        <th className="px-6 py-4 text-center">Acties</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800/60 text-zinc-200">
                                    {list.map((gebruiker, index) => {
                                        const nameParts = [gebruiker.voornaam, gebruiker.tussenvoegsels, gebruiker.achternaam].filter(Boolean);
                                        const fullName = nameParts.join(' ') || 'Onbekende Deelnemer';
                                        const isMenuOpen = activeMenuId === gebruiker.id;
                                        const isSelected = selectedGebruiker?.id === gebruiker.id;
                                        const isNearBottom = index >= list.length - 3 && list.length >= 3;

                                        return (
                                            <React.Fragment key={gebruiker.id}>
                                                <tr
                                                    onClick={() => setSelectedGebruiker(isSelected ? null : gebruiker)}
                                                    className={`cursor-pointer transition-colors select-none ${
                                                        isSelected ? 'bg-zinc-900/90 border-l-4 border-l-purple-500' : 'hover:bg-zinc-800/40'
                                                    }`}
                                                >
                                                    <td className="px-6 py-4 font-bold text-white whitespace-nowrap flex items-center gap-2">
                                                        <svg
                                                            className={`w-4 h-4 text-purple-400 transition-transform duration-200 shrink-0 ${
                                                                isSelected ? 'rotate-180' : ''
                                                            }`}
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="2"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                        <span>{fullName}</span>
                                                        {gebruiker.geblokkeerd ? (
                                                            <span className="px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800/50 text-[10px] font-semibold">
                                                                Geblokkeerd
                                                            </span>
                                                        ) : null}
                                                    </td>
                                                    <td className="px-6 py-4 text-zinc-400 text-xs">
                                                        {gebruiker.email}
                                                    </td>
                                                    <td className="px-6 py-4 text-xs font-medium text-purple-300">
                                                        {gebruiker.ticket_naam || '-'}
                                                    </td>
                                                    <td className="px-6 py-4 text-xs">
                                                        {gebruiker.groepen_namen ? (
                                                            <span className="px-2 py-0.5 rounded bg-zinc-950 text-zinc-300 border border-zinc-800 font-medium">
                                                                {gebruiker.groepen_namen}
                                                            </span>
                                                        ) : (
                                                            <span className="text-zinc-500 italic">-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-xs">
                                                        {gebruiker.kaarten_uids ? (
                                                            <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 font-mono text-purple-300">
                                                                {gebruiker.kaarten_uids.slice(0, 8)}...
                                                            </span>
                                                        ) : (
                                                            <span className="text-zinc-500 italic">Geen kaart</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-extrabold text-emerald-400 whitespace-nowrap">
                                                        {gebruiker.saldo ?? 0} munten
                                                    </td>
                                                    <td
                                                        className="px-6 py-4 text-center relative"
                                                        ref={isMenuOpen ? menuRef : null}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <button
                                                            onClick={() => setActiveMenuId(isMenuOpen ? null : gebruiker.id)}
                                                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
                                                            title="Opties"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                                                            </svg>
                                                        </button>

                                                        {isMenuOpen && (
                                                            <div
                                                                className={`absolute right-6 z-30 w-56 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl py-1 text-left ${
                                                                    isNearBottom ? 'bottom-12' : 'top-12'
                                                                }`}
                                                            >
                                                                {gebruiker.geblokkeerd ? (
                                                                <button
                                                                    onClick={() => handleUnblock(gebruiker.id)}
                                                                    className="w-full px-4 py-2.5 text-xs font-semibold text-emerald-400 hover:bg-zinc-800/80 flex items-center gap-2 transition-colors"
                                                                >
                                                                    <span>Deblokkeer deelnemer</span>
                                                                </button>
                                                                ) : (
                                                                <button
                                                                    onClick={() => handleKickUser(gebruiker.id)}
                                                                    className="w-full px-4 py-2.5 text-xs font-semibold text-red-400 hover:bg-zinc-800/80 flex items-center gap-2 transition-colors"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6h12a6 6 0 00-6-6zM21 12h-6" />
                                                                    </svg>
                                                                    <span>Blokkeer uit evenement</span>
                                                                </button>
                                                                )}

                                                                <button
                                                                    onClick={() => handleDisableKaarten(gebruiker.id)}
                                                                    className="w-full px-4 py-2.5 text-xs font-semibold text-amber-400 hover:bg-zinc-800/80 flex items-center gap-2 transition-colors"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                                                    </svg>
                                                                    <span>Deactiveer kaarten</span>
                                                                </button>

                                                                <button
                                                                    onClick={() => handleKickGroepen(gebruiker.id)}
                                                                    className="w-full px-4 py-2.5 text-xs font-semibold text-purple-300 hover:bg-zinc-800/80 flex items-center gap-2 transition-colors"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                                    </svg>
                                                                    <span>Verwijder uit alle groepen</span>
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>

                                                {/* Dropdown Panel attached directly to the participant row */}
                                                {isSelected && (
                                                    <tr className="bg-zinc-900/90 border-l-4 border-l-purple-500 border-b border-b-zinc-800">
                                                        <td colSpan={7} className="px-8 pt-2 pb-6">
                                                            <div className="pt-3 border-t border-zinc-800/80">
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                                                                    {/* Section 1: Details Info */}
                                                                    <div className="space-y-3">
                                                                        <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
                                                                            <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
                                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                                                </svg>
                                                                                Deelnemer Details
                                                                            </h4>
                                                                        </div>

                                                                        <div className="divide-y divide-zinc-800/50 pr-2">
                                                                            <div className="py-2 flex items-center justify-between gap-2">
                                                                                <span className="text-xs font-semibold text-zinc-400">Volledige Naam</span>
                                                                                <span className="text-xs font-medium text-white">{fullName}</span>
                                                                            </div>
                                                                            <div className="py-2 flex items-center justify-between gap-2">
                                                                                <span className="text-xs font-semibold text-zinc-400">E-mailadres</span>
                                                                                <span className="text-xs font-medium text-white">{gebruiker.email}</span>
                                                                            </div>
                                                                            <div className="py-2 flex items-center justify-between gap-2">
                                                                                <span className="text-xs font-semibold text-zinc-400">Ticket</span>
                                                                                <span className="text-xs font-medium text-purple-300">{gebruiker.ticket_naam || '-'}</span>
                                                                            </div>
                                                                            <div className="py-2 flex items-center justify-between gap-2">
                                                                                <span className="text-xs font-semibold text-zinc-400">Gekoppelde Groep(en)</span>
                                                                                <span className="text-xs font-medium text-zinc-200">{gebruiker.groepen_namen || '-'}</span>
                                                                            </div>
                                                                            <div className="py-2 flex items-center justify-between gap-2">
                                                                                <span className="text-xs font-semibold text-zinc-400">Actieve NFC Kaart</span>
                                                                                <span className="text-xs font-mono text-purple-300">{gebruiker.kaarten_uids || 'Geen kaart'}</span>
                                                                            </div>
                                                                            <div className="py-2 flex items-center justify-between gap-2">
                                                                                <span className="text-xs font-semibold text-zinc-400">Munten Saldo</span>
                                                                                <span className="text-xs font-bold text-emerald-400">{gebruiker.saldo ?? 0} munten</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* Section 2: Transacties Timeline */}
                                                                    {(() => {
                                                                        const currentGebruikerTxData = Array.isArray(transacties)
                                                                            ? transacties.find((t: any) => Number(t.id) === Number(gebruiker.id))
                                                                            : null;

                                                                        const txItems: any[] = currentGebruikerTxData?.transacties || [];

                                                                        return (
                                                                            <div className="space-y-3">
                                                                                <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
                                                                                    <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
                                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                                                        </svg>
                                                                                        Transacties
                                                                                    </h4>
                                                                                    <span className="text-xs font-bold text-zinc-400">
                                                                                        {txItems.length}
                                                                                    </span>
                                                                                </div>

                                                                                {txItems.length > 0 ? (
                                                                                    <div className="relative max-h-60 overflow-y-auto pr-2 space-y-4 pt-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                                                                                        {txItems.map((tx: any, idx: number) => {
                                                                                            const formattedTime = tx.timestamp
                                                                                                ? new Date(tx.timestamp).toLocaleString('nl-NL', { dateStyle: 'short', timeStyle: 'short' })
                                                                                                : '-';
                                                                                            const isLast = idx === txItems.length - 1;

                                                                                            const messageLower = (tx.bericht || tx.description || '').toLowerCase();
                                                                                            let dotColor = 'bg-purple-500 border-purple-950 shadow-purple-950/50';

                                                                                            if (messageLower.includes('uitgegeven') || messageLower.includes('uitgave')) {
                                                                                                dotColor = 'bg-red-500 border-red-950 shadow-red-950/50';
                                                                                            } else if (messageLower.includes('gekocht') || messageLower.includes('opwaardering')) {
                                                                                                dotColor = 'bg-emerald-500 border-emerald-950 shadow-emerald-950/50';
                                                                                            }

                                                                                            return (
                                                                                                <div key={idx} className="relative pl-6">
                                                                                                    {/* Light grey vertical connecting line */}
                                                                                                    {!isLast && (
                                                                                                        <span className="absolute left-1.5 top-3 -bottom-5 w-0.5 bg-zinc-600" />
                                                                                                    )}
                                                                                                    {/* Timeline node dot */}
                                                                                                    <span className={`absolute left-0 top-1.5 w-3 h-3 rounded-full border-2 border-zinc-900 shadow ${dotColor}`} />

                                                                                                    {/* Message on top, tiny date underneath */}
                                                                                                    <div className="space-y-0.5">
                                                                                                        <div className="text-xs font-medium text-zinc-100 leading-snug">
                                                                                                            {tx.bericht || tx.description || 'Transactie'}
                                                                                                        </div>
                                                                                                        <div className="text-[10px] text-zinc-500 font-mono">
                                                                                                            {formattedTime}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </div>
                                                                                            );
                                                                                        })}
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="py-8 text-center text-zinc-500 italic text-xs">
                                                                                        Geen transacties gevonden voor deze deelnemer.
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Links */}
                        {deelnemers?.links && deelnemers.links.length > 3 && (
                            <div className="p-4 border-t border-zinc-800 flex items-center justify-center gap-1.5 flex-wrap">
                                {deelnemers.links.map((link: any, i: number) => (
                                    <button
                                        key={i}
                                        disabled={!link.url}
                                        onClick={() => link.url && router.get(link.url, {}, { preserveScroll: true, preserveState: true })}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                            link.active
                                                ? 'bg-purple-700 text-white shadow-md'
                                                : link.url
                                                ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white'
                                                : 'bg-zinc-950 text-zinc-600 border border-zinc-800 cursor-not-allowed'
                                        }`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
