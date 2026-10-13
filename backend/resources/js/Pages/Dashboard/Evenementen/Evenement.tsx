import React, { useState, useEffect, useRef } from 'react';
import { router, Link } from '@inertiajs/react';
import type { Evenement } from '../../../types/type';

interface SelectedEvenementProps {
    evenement: Evenement;
    setPage?: (e: any, page: any) => void;
    producten_verkoop?: {
        uren: string[];
        totaal_per_uur?: number[];
        producten: Array<{
            id: number;
            naam: string;
            prijs: number;
            verkoop_per_uur: number[];
        }>;
    };
}

export default function Evenement({ evenement, producten_verkoop }: SelectedEvenementProps) {
    const groepenCount = evenement.groepen_count ?? evenement.groepen?.length ?? 0;
    const ticketsCount = evenement.tickets_count ?? evenement.tickets?.length ?? 0;
    const productenCount = evenement.producten_count ?? evenement.producten?.length ?? 0;

    const [muntWaarde] = useState<number>(Number(evenement.munt_prijs) || 1.50);

    // Multi-select state
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>(['all']);
    const [showDropdown, setShowDropdown] = useState<boolean>(false);
    const [hoveredHourIdx, setHoveredHourIdx] = useState<number | null>(null);

    const dropdownRef = useRef<HTMLDivElement | null>(null);

    // Total tickets sold calculation
    const totalTicketsSold = (evenement.tickets || []).reduce(
        (sum, ticket) => sum + (ticket.gebruikers_count ?? ticket.gebruikers?.length ?? 0),
        0
    );

    // Close multi-select dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        if (showDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showDropdown]);

    // Color Palette for overlayed product series
    const COLOR_PALETTE = [
        { name: 'purple', bg: 'bg-purple-500', border: 'border-purple-400', text: 'text-purple-400', fill: 'bg-gradient-to-t from-purple-800 to-purple-500 shadow-purple-950/60', badge: 'bg-purple-950/80 text-purple-300 border-purple-800/60' },
        { name: 'emerald', bg: 'bg-emerald-500', border: 'border-emerald-400', text: 'text-emerald-400', fill: 'bg-gradient-to-t from-emerald-800 to-emerald-500 shadow-emerald-950/60', badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60' },
        { name: 'amber', bg: 'bg-amber-500', border: 'border-amber-400', text: 'text-amber-400', fill: 'bg-gradient-to-t from-amber-800 to-amber-500 shadow-amber-950/60', badge: 'bg-amber-950/80 text-amber-300 border-amber-800/60' },
        { name: 'blue', bg: 'bg-blue-500', border: 'border-blue-400', text: 'text-blue-400', fill: 'bg-gradient-to-t from-blue-800 to-blue-500 shadow-blue-950/60', badge: 'bg-blue-950/80 text-blue-300 border-blue-800/60' },
        { name: 'rose', bg: 'bg-rose-500', border: 'border-rose-400', text: 'text-rose-400', fill: 'bg-gradient-to-t from-rose-800 to-rose-500 shadow-rose-950/60', badge: 'bg-rose-950/80 text-rose-300 border-rose-800/60' },
        { name: 'cyan', bg: 'bg-cyan-500', border: 'border-cyan-400', text: 'text-cyan-400', fill: 'bg-gradient-to-t from-cyan-800 to-cyan-500 shadow-cyan-950/60', badge: 'bg-cyan-950/80 text-cyan-300 border-cyan-800/60' },
    ];

    // Chart data setup
    const chartUren = producten_verkoop?.uren || [
        "10:00", "11:00", "12:00", "13:00", "14:00", "15:00",
        "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"
    ];

    const chartProducts = producten_verkoop?.producten || [];

    const isAllSelected = selectedProductIds.includes('all');

    // Toggle function for multi-select
    const handleToggleProduct = (id: string) => {
        if (id === 'all') {
            setSelectedProductIds(['all']);
            return;
        }

        let updated = selectedProductIds.filter((pId) => pId !== 'all');
        if (updated.includes(id)) {
            updated = updated.filter((pId) => pId !== id);
        } else {
            updated.push(id);
        }

        if (updated.length === 0) {
            setSelectedProductIds(['all']);
        } else {
            setSelectedProductIds(updated);
        }
    };

    // Construct active series to render on chart
    const activeSeries = isAllSelected
        ? [{
            id: 'all',
            naam: 'Totaal (Alle Producten)',
            prijs: 1,
            verkoop_per_uur: chartUren.map((_, hIdx) => chartProducts.reduce((sum, p) => sum + (p.verkoop_per_uur[hIdx] || 0), 0)),
            color: COLOR_PALETTE[0]
        }]
        : chartProducts
            .filter((p) => selectedProductIds.includes(String(p.id)))
            .map((p, pIdx) => ({
                ...p,
                color: COLOR_PALETTE[pIdx % COLOR_PALETTE.length]
            }));

    // Calculate maximum single value across all active series for scaling
    const maxVal = Math.max(
        ...activeSeries.flatMap((s) => s.verkoop_per_uur),
        1
    );

    // Calculate totals & peak hour across selected products
    const hourlyTotals: number[] = chartUren.map((_, hourIdx) =>
        activeSeries.reduce((sum, s) => sum + (s.verkoop_per_uur[hourIdx] || 0), 0)
    );

    const grandTotal = hourlyTotals.reduce((a, b) => a + b, 0);
    const peakIndex = hourlyTotals.indexOf(Math.max(...hourlyTotals));
    const peakUur = chartUren[peakIndex] || '-';
    const gemAantal = Math.round(grandTotal / (chartUren.length || 1));

    // Summary button label text
    const getButtonLabel = () => {
        if (isAllSelected) return 'Totaal (Alle Producten)';
        if (selectedProductIds.length === 1) {
            const p = chartProducts.find((item) => String(item.id) === selectedProductIds[0]);
            return p ? p.naam : '1 Product geselecteerd';
        }
        return `${selectedProductIds.length} Producten geselecteerd`;
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans p-4 sm:p-6 lg:p-8">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header Card */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl flex items-center justify-between">
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
                            {evenement.naam}
                        </h1>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        evenement.open
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                            : 'bg-zinc-800 text-zinc-400 border border-zinc-700/60'
                    }`}>
                        {evenement.open ? 'Open' : 'Gesloten'}
                    </span>
                </div>

                {/* 1. Evenement Details Section */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-lg">
                    <h2 className="text-lg font-bold text-white pb-3 border-b border-zinc-800 flex items-center gap-2">
                        <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Evenement Details
                    </h2>

                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center py-1">
                            <span className="text-zinc-400 font-medium">Status</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                evenement.open
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                                    : 'bg-zinc-800 text-zinc-400'
                            }`}>
                                {evenement.open ? 'Open' : 'Gesloten'}
                            </span>
                        </div>

                        <div className="flex justify-between items-center py-1 border-t border-zinc-800/60">
                            <span className="text-zinc-400 font-medium">Toegangscode</span>
                            <span className="font-mono text-purple-300 bg-zinc-950 px-2.5 py-1 rounded border border-zinc-800">
                                {evenement.code || 'Geen code'}
                            </span>
                        </div>

                        <div className="flex justify-between items-center py-1 border-t border-zinc-800/60">
                            <span className="text-zinc-400 font-medium">Startdatum</span>
                            <span className="text-white font-medium">
                                {evenement.start_datum
                                    ? new Date(evenement.start_datum).toLocaleString('nl-NL', { dateStyle: 'medium', timeStyle: 'short' })
                                    : 'Niet ingesteld'}
                            </span>
                        </div>

                        <div className="flex justify-between items-center py-1 border-t border-zinc-800/60">
                            <span className="text-zinc-400 font-medium">Einddatum</span>
                            <span className="text-white font-medium">
                                {evenement.eind_datum
                                    ? new Date(evenement.eind_datum).toLocaleString('nl-NL', { dateStyle: 'medium', timeStyle: 'short' })
                                    : 'Niet ingesteld'}
                            </span>
                        </div>

                        <div className="flex justify-between items-center py-1 border-t border-zinc-800/60">
                            <span className="text-zinc-400 font-medium">Telefoon betaling</span>
                            <span className="text-zinc-200 font-medium">
                                {evenement.telefoon_betaling ? 'Ingeschakeld' : 'Uitgeschakeld'}
                            </span>
                        </div>

                        <div className="flex justify-between items-center py-1 border-t border-zinc-800/60">
                            <span className="text-zinc-400 font-medium">Munten terugstorten</span>
                            <span className="text-zinc-200 font-medium">
                                {evenement.munten_terugstorten ? 'Toegestaan' : 'Niet toegestaan'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 2. Tickets Section (With Total Sold and Per-Ticket Breakdown) */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-zinc-800/80">
                        <div className="space-y-1">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                                </svg>
                                Tickets
                            </h2>
                            <div className="flex items-center gap-2.5 text-xs text-zinc-400 flex-wrap">
                                <span>
                                    Ticket types: <strong className="text-white font-extrabold ml-0.5">{ticketsCount}</strong>
                                </span>
                                <span>&bull;</span>
                                <span>
                                    Totaal verkocht: <strong className="text-emerald-400 font-extrabold ml-0.5">{totalTicketsSold}</strong>
                                </span>
                            </div>
                        </div>

                        <Link
                            href={`/dashboard/evenementen/${evenement.id}?tab=tickets`}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-semibold text-xs sm:text-sm transition-all shadow-md shadow-purple-950/40 shrink-0"
                        >
                            <span>Bekijk Tickets</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                        </Link>
                    </div>

                    {/* Small Breakdown per Ticket Type */}
                    {evenement.tickets && evenement.tickets.length > 0 ? (
                        <div className="flex items-center gap-2 flex-wrap pt-0.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mr-1">Verkoop per type:</span>
                            {evenement.tickets.map((ticket) => {
                                const soldCount = ticket.gebruikers_count ?? ticket.gebruikers?.length ?? 0;
                                return (
                                    <div
                                        key={ticket.id}
                                        className="bg-zinc-950 border border-zinc-800 px-3 py-1 rounded-xl text-xs flex items-center gap-2"
                                    >
                                        <span className="font-semibold text-zinc-300">{ticket.naam}:</span>
                                        <span className="font-bold text-purple-300 font-mono">{soldCount} verkocht</span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-xs text-zinc-500 italic">
                            Geen ticket types ingesteld.
                        </div>
                    )}
                </div>

                {/* 3. Producten Section */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg flex items-center justify-between">
                    <div className="space-y-1">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                            Producten
                        </h2>
                        <p className="text-xs text-zinc-400">
                            Aantal producten in assortiment: <strong className="text-white font-extrabold text-sm ml-1">{productenCount}</strong>
                        </p>
                    </div>

                    <Link
                        href={`/dashboard/evenementen/${evenement.id}?tab=producten`}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-semibold text-xs sm:text-sm transition-all shadow-md shadow-purple-950/40"
                    >
                        <span>Bekijk Producten</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                    </Link>
                </div>

                {/* Product Sales per Hour Graph (Commented Out) */}
                {/*
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5 shadow-xl">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block mb-0.5">
                                Live Statistieken &bull; Uuranalyse
                            </span>
                            <h3 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
                                <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                Productverkoop per Uur
                            </h3>
                        </div>

                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setShowDropdown(!showDropdown)}
                                className="px-3.5 py-2 bg-zinc-950 border border-zinc-800 hover:border-purple-500/80 rounded-xl text-xs font-semibold text-purple-300 flex items-center gap-2 transition-colors cursor-pointer"
                            >
                                <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
                                <span>{getButtonLabel()}</span>
                                <svg className={`w-3.5 h-3.5 transition-transform ${showDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {showDropdown && (
                                <div className="absolute right-0 mt-2 z-40 w-64 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-3 py-1.5 border-b border-zinc-800/80">
                                        Selecteer Weergave
                                    </div>

                                    <button
                                        onClick={() => handleToggleProduct('all')}
                                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                                            isAllSelected ? 'bg-purple-950/80 text-purple-300 border border-purple-800/60' : 'text-zinc-300 hover:bg-zinc-800/80'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                                            <span>Totaal (Alle Producten)</span>
                                        </div>
                                        {isAllSelected && (
                                            <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </button>

                                    <div className="border-t border-zinc-800/80 my-1" />

                                    <div className="max-h-48 overflow-y-auto space-y-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                                        {chartProducts.map((p, idx) => {
                                            const isChecked = !isAllSelected && selectedProductIds.includes(String(p.id));
                                            const palette = COLOR_PALETTE[idx % COLOR_PALETTE.length];

                                            return (
                                                <button
                                                    key={p.id}
                                                    onClick={() => handleToggleProduct(String(p.id))}
                                                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                                                        isChecked ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2 truncate pr-2">
                                                        <span className={`w-2.5 h-2.5 rounded-full ${palette.bg}`} />
                                                        <span className="truncate">{p.naam}</span>
                                                    </div>
                                                    {isChecked && (
                                                        <svg className={`w-4 h-4 ${palette.text}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-zinc-950 border border-zinc-800/80 p-3.5 rounded-2xl text-center space-y-0.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Totaal verkocht</span>
                            <span className="text-xl font-black text-emerald-400 tracking-tight">{grandTotal}</span>
                        </div>
                        <div className="bg-zinc-950 border border-zinc-800/80 p-3.5 rounded-2xl text-center space-y-0.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Piek uur</span>
                            <span className="text-xl font-black text-purple-400 tracking-tight">{peakUur}</span>
                        </div>
                        <div className="bg-zinc-950 border border-zinc-800/80 p-3.5 rounded-2xl text-center space-y-0.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Gem. / Uur</span>
                            <span className="text-xl font-black text-zinc-200 tracking-tight">{gemAantal}</span>
                        </div>
                    </div>

                    {!isAllSelected && activeSeries.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap pt-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mr-1">Overlays:</span>
                            {activeSeries.map((s) => (
                                <span key={s.id} className={`px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center gap-1.5 ${s.color.badge}`}>
                                    <span className={`w-2 h-2 rounded-full ${s.color.bg}`} />
                                    <span>{s.naam}</span>
                                </span>
                            ))}
                        </div>
                    )}

                    <div className="relative pt-4 pb-2 bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-4 space-y-2">
                        {hoveredHourIdx !== null && (
                            <div className="absolute top-3 right-4 bg-zinc-900 border border-purple-500/80 px-3.5 py-2 rounded-xl shadow-2xl text-right z-30 min-w-44 animate-in fade-in zoom-in-95 duration-150">
                                <div className="text-[10px] font-mono text-purple-300 font-bold pb-1 border-b border-zinc-800">
                                    Om {chartUren[hoveredHourIdx]}
                                </div>
                                <div className="space-y-1 py-1.5">
                                    {activeSeries.map((s) => {
                                        const count = s.verkoop_per_uur[hoveredHourIdx] || 0;
                                        const euroVal = (count * (s.id === 'all' ? 1.5 : (s.prijs || 1) * muntWaarde)).toFixed(2).replace('.', ',');

                                        return (
                                            <div key={s.id} className="flex items-center justify-between text-xs gap-3">
                                                <span className={`font-semibold flex items-center gap-1.5 ${s.color.text}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${s.color.bg}`} />
                                                    {s.naam}:
                                                </span>
                                                <span className="font-bold text-white font-mono">{count} &bull; &euro;{euroVal}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                {activeSeries.length > 1 && (
                                    <div className="pt-1 border-t border-zinc-800 text-[10px] font-extrabold text-emerald-400">
                                        Som: {hourlyTotals[hoveredHourIdx]} verkocht
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="h-56 flex items-end justify-between gap-1.5 pt-6 px-1 border-b border-zinc-800/80">
                            {chartUren.map((uur, hourIdx) => {
                                const isPeakHour = hourIdx === peakIndex;
                                const isHovered = hoveredHourIdx === hourIdx;

                                return (
                                    <div
                                        key={hourIdx}
                                        onMouseEnter={() => setHoveredHourIdx(hourIdx)}
                                        onMouseLeave={() => setHoveredHourIdx(null)}
                                        className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative"
                                    >
                                        {hourlyTotals[hourIdx] > 0 && (
                                            <span className={`text-[9px] font-mono font-bold mb-1 transition-opacity ${isHovered || isPeakHour ? 'opacity-100 text-purple-300' : 'opacity-0'}`}>
                                                {hourlyTotals[hourIdx]}
                                            </span>
                                        )}

                                        <div className="w-full flex items-end justify-center gap-0.5 h-full">
                                            {activeSeries.map((s) => {
                                                const val = s.verkoop_per_uur[hourIdx] || 0;
                                                const heightPercent = Math.max(6, Math.round((val / maxVal) * 100));

                                                return (
                                                    <div
                                                        key={s.id}
                                                        style={{ height: `${heightPercent}%` }}
                                                        className={`flex-1 rounded-t-md transition-all duration-200 ${s.color.fill} ${
                                                            isHovered ? 'brightness-125 scale-105' : 'opacity-90 hover:opacity-100'
                                                        }`}
                                                    />
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex justify-between text-[9px] font-mono text-zinc-500 pt-1 px-1">
                            {chartUren.map((uur, idx) => (
                                <div
                                    key={idx}
                                    className={`text-center flex-1 transition-colors ${
                                        hoveredHourIdx === idx ? 'text-purple-300 font-bold' : ''
                                    }`}
                                >
                                    {idx % 2 === 0 ? uur : ''}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                */}

                {/* 4. Groepen Section */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg flex items-center justify-between">
                    <div className="space-y-1">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            Groepen
                        </h2>
                        <p className="text-xs text-zinc-400">
                            Aantal aangemaakte groepen: <strong className="text-white font-extrabold text-sm ml-1">{groepenCount}</strong>
                        </p>
                    </div>

                    <Link
                        href={`/dashboard/evenementen/${evenement.id}?tab=groepen`}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-semibold text-xs sm:text-sm transition-all shadow-md shadow-purple-950/40"
                    >
                        <span>Bekijk Groepen</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                    </Link>
                </div>
            </div>
        </div>
    );
}
