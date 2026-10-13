import React, { useState, useEffect, useRef } from 'react';
import { router } from '@inertiajs/react';
import type { Evenement, Groep } from '../../../types/type';

interface SelectedEvenementProps {
    evenement: Evenement;
    groepen?: any;
    transacties?: any;
    setPage?: (page: any) => void;
}

export default function Groepen({ evenement, groepen, transacties }: SelectedEvenementProps) {
    const getInitialSearch = () => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            return params.get('search') || '';
        }
        return '';
    };

    const [searchQuery, setSearchQuery] = useState(getInitialSearch());
    const [showAddModal, setShowAddModal] = useState(false);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
    const [selectedGroep, setSelectedGroep] = useState<Groep | any | null>(null);
    const menuRef = useRef<HTMLTableCellElement | null>(null);

    const [newNaam, setNewNaam] = useState('');
    const [newCode, setNewCode] = useState('');

    const list: Groep[] = Array.isArray(groepen)
        ? groepen
        : (groepen?.data || evenement.groepen || []);

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
            { tab: 'groepen', search: val },
            { preserveState: true, replace: true, preserveScroll: true }
        );
    };

    const handleCopyCode = (code: string) => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(code);
            setCopiedCode(code);
            setTimeout(() => setCopiedCode(null), 2000);
        }
    };

    const handleDeleteGroep = (groepId: number) => {
        if (confirm('Weet je zeker dat je deze groep wilt verwijderen?')) {
            router.delete(`/dashboard/evenementen/${evenement.id}/groepen/${groepId}`, {
                preserveScroll: true,
                onSuccess: () => {
                    setActiveMenuId(null);
                    if (selectedGroep?.id === groepId) {
                        setSelectedGroep(null);
                    }
                },
            });
        }
    };

    const totalGroepenCount = groepen?.total ?? list.length;

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
                            Groepen &mdash; <span className="text-purple-400">{evenement.naam}</span>
                        </h1>
                    </div>

                    <div className="text-sm font-semibold text-zinc-400">
                        Totaal: <span className="text-purple-400 font-bold">{totalGroepenCount}</span> groepen
                    </div>
                </div>

                {/* Search Bar & Action Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={handleSearchChange}
                            placeholder="Zoek groep op naam of code..."
                            className="w-full pl-9 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
                        />
                        <svg className="w-4 h-4 text-zinc-500 absolute left-3 top-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                    </div>
                </div>

                {/* Groepen Table */}
                {list.length === 0 ? (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-zinc-950 border border-zinc-800 text-purple-400 flex items-center justify-center mx-auto">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-bold text-white">Geen groepen gevonden</h3>
                        <p className="text-sm text-zinc-400 max-w-md mx-auto">
                            {searchQuery
                                ? `Er zijn geen groepen die overeenkomen met "${searchQuery}".`
                                : 'Er zijn nog geen groepen aangemaakt voor dit evenement.'}
                        </p>
                    </div>
                ) : (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-zinc-950 text-zinc-400 text-xs uppercase font-semibold border-b border-zinc-800">
                                    <tr>
                                        <th className="px-6 py-4">Groepsnaam</th>
                                        <th className="px-6 py-4 text-right">Munten</th>
                                        <th className="px-6 py-4 text-center">Leden</th>
                                        <th className="px-6 py-4 text-center">Acties</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800/60 text-zinc-200">
                                    {list.map((groep, index) => {
                                        const memberCount = groep.gebruikers_count ?? groep.gebruikers?.length ?? 0;
                                        const isMenuOpen = activeMenuId === groep.id;
                                        const isSelected = selectedGroep?.id === groep.id;
                                        const isNearBottom = index >= list.length - 3 && list.length >= 3;

                                        return (
                                            <React.Fragment key={groep.id}>
                                                <tr
                                                    onClick={() => setSelectedGroep(isSelected ? null : groep)}
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
                                                        <span>{groep.naam}</span>
                                                        {groep.code && (
                                                            <span className="ml-2 px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 font-mono text-purple-300 text-[11px]">
                                                                {groep.code}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-extrabold text-emerald-400 whitespace-nowrap">
                                                        {(groep as any).munten ?? 0} munten
                                                    </td>
                                                    <td className="px-6 py-4 text-center font-semibold text-white">
                                                        {memberCount}
                                                    </td>
                                                    <td
                                                        className="px-6 py-4 text-center relative"
                                                        ref={isMenuOpen ? menuRef : null}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <button
                                                            onClick={() => setActiveMenuId(isMenuOpen ? null : groep.id)}
                                                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
                                                            title="Opties"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                                                            </svg>
                                                        </button>

                                                        {isMenuOpen && (
                                                            <div
                                                                className={`absolute right-6 z-30 w-52 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl py-1 text-left ${
                                                                    isNearBottom ? 'bottom-12' : 'top-12'
                                                                }`}
                                                            >
                                                                {groep.code && (
                                                                    <button
                                                                        onClick={() => {
                                                                            handleCopyCode(groep.code);
                                                                            setActiveMenuId(null);
                                                                        }}
                                                                        className="w-full px-4 py-2.5 text-xs font-semibold text-purple-300 hover:bg-zinc-800/80 flex items-center gap-2 transition-colors"
                                                                    >
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                                        </svg>
                                                                        <span>Kopieer code</span>
                                                                    </button>
                                                                )}

                                                                <button
                                                                    onClick={() => handleDeleteGroep(groep.id)}
                                                                    className="w-full px-4 py-2.5 text-xs font-semibold text-red-400 hover:bg-zinc-800/80 flex items-center gap-2 transition-colors"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                    </svg>
                                                                    <span>Verwijder groep</span>
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>

                                                {/* Dropdown Panel attached directly to the group row */}
                                                {isSelected && (
                                                    <tr className="bg-zinc-900/90 border-l-4 border-l-purple-500 border-b border-b-zinc-800">
                                                        <td colSpan={4} className="px-8 pt-2 pb-6">
                                                            <div className="pt-3 border-t border-zinc-800/80">
                                                                {/* Two Side-by-Side Sections */}
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                                                                    {/* Section 1: Gebruikers List */}
                                                                    <div className="space-y-3">
                                                                        <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
                                                                            <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
                                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                                                                </svg>
                                                                                Deelnemers
                                                                            </h4>
                                                                            <span className="text-xs font-bold text-zinc-400">
                                                                                {memberCount}
                                                                            </span>
                                                                        </div>

                                                                        {groep.gebruikers && groep.gebruikers.length > 0 ? (
                                                                            <div className="max-h-60 overflow-y-auto divide-y divide-zinc-800/50 pr-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                                                                                {groep.gebruikers.map((g: any) => {
                                                                                    const fullName = [g.voornaam, g.tussenvoegsels, g.achternaam].filter(Boolean).join(' ') || 'Onbekende Deelnemer';
                                                                                    const joinedAt = g.pivot?.created_at
                                                                                        ? new Date(g.pivot.created_at).toLocaleString('nl-NL', { dateStyle: 'short', timeStyle: 'short' })
                                                                                        : null;

                                                                                    return (
                                                                                        <div key={g.id} className="py-2.5 flex items-center justify-between gap-2 hover:bg-zinc-800/40 px-1 rounded-lg transition-colors">
                                                                                            <div className="min-w-0 space-y-0.5">
                                                                                                <div className="text-xs font-medium text-zinc-100 truncate">{fullName}</div>
                                                                                                <div className="text-[11px] text-zinc-400 truncate">{g.email}</div>
                                                                                            </div>
                                                                                            {joinedAt && (
                                                                                                <div className="shrink-0 text-[10px] text-zinc-500 font-mono">
                                                                                                    Lid sinds: {joinedAt}
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        ) : (
                                                                            <div className="py-8 text-center text-zinc-500 italic text-xs">
                                                                                Geen gebruikers gekoppeld aan deze groep.
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* Section 2: Transacties Timeline */}
                                                                    {(() => {
                                                                        const currentGroupTxData = Array.isArray(transacties)
                                                                            ? transacties.find((t: any) => Number(t.id) === Number(groep.id))
                                                                            : null;

                                                                        const txItems: any[] = currentGroupTxData?.transacties || [];

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
                                                                                        Geen transacties gevonden voor deze groep.
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
                        {groepen?.links && groepen.links.length > 3 && (
                            <div className="p-4 border-t border-zinc-800 flex items-center justify-center gap-1.5 flex-wrap">
                                {groepen.links.map((link: any, i: number) => (
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
