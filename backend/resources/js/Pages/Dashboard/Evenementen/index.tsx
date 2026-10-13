import React, { useState } from 'react';
import DashboardLayout from '../../Layouts/DashboardLayout';
import { router, useForm } from '@inertiajs/react';

export interface Evenement {
    id: number;
    naam: string;
    open: boolean;
    start_datum: string | null;
    eind_datum: string | null;
    telefoon_betaling: boolean;
    munten_terugstorten: boolean;
    heeft_tickets: boolean;
    code: string | null;
    groepen_count?: number;
    transacties_count?: number;
}

interface Props {
    evenementen?: Evenement[];
}

export default function Evenementen({ evenementen = [] }: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'closed'>('all');

    // Filter logic
    const filteredEvents = evenementen.filter((event) => {
        const matchesSearch =
            event.naam.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (event.code && event.code.toLowerCase().includes(searchQuery.toLowerCase()));

        if (filterStatus === 'open') return matchesSearch && event.open;
        if (filterStatus === 'closed') return matchesSearch && !event.open;
        return matchesSearch;
    });

    const [showModal, setShowModal] = useState(false);
    const form = useForm({
        naam: '',
        start_datum: '',
        eind_datum: '',
        telefoon_betaling: false,
        munten_terugstorten: false,
        heeft_tickets: false,
        munt_prijs: '',
    });

    const closeModal = () => {
        setShowModal(false);
        form.reset();
        form.clearErrors();
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/dashboard/evenementen', {
            onSuccess: () => closeModal(),
        });
    };

    const inputClass =
        'w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors';

    const openCount = evenementen.filter((e) => e.open).length;
    const closedCount = evenementen.length - openCount;

    return (
        <DashboardLayout>
            <div className="flex flex-col md:flex-row w-full min-h-[calc(100vh-8rem)] -m-4 sm:-m-6 lg:-m-8">
                {/* Left Column: Filters */}
                <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-zinc-800 p-6 bg-zinc-900/40 shrink-0 space-y-6">
                    <div>
                        <h2 className="text-base font-bold text-white tracking-wide">
                            filters:
                        </h2>
                    </div>

                    {/* Search Filter */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
                            Zoeken
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Zoek evenement..."
                                className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
                            />
                            <svg className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                        </div>
                    </div>

                    {/* Status Filter */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
                            Status
                        </label>
                        <div className="flex flex-col gap-1.5">
                            <button
                                onClick={() => setFilterStatus('all')}
                                className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
                                    filterStatus === 'all'
                                        ? 'bg-purple-950/80 text-purple-200 border border-purple-800/60'
                                        : 'bg-zinc-950/60 text-zinc-400 border border-zinc-800/60 hover:text-zinc-200 hover:bg-zinc-900'
                                }`}
                            >
                                <span>Alle</span>
                                <span className="px-2 py-0.5 rounded-md bg-zinc-900/80 text-zinc-400 text-[10px]">
                                    {evenementen.length}
                                </span>
                            </button>
                            <button
                                onClick={() => setFilterStatus('open')}
                                className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
                                    filterStatus === 'open'
                                        ? 'bg-purple-950/80 text-purple-200 border border-purple-800/60'
                                        : 'bg-zinc-950/60 text-zinc-400 border border-zinc-800/60 hover:text-zinc-200 hover:bg-zinc-900'
                                }`}
                            >
                                <span>Open</span>
                                <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-400 text-[10px]">
                                    {openCount}
                                </span>
                            </button>
                            <button
                                onClick={() => setFilterStatus('closed')}
                                className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
                                    filterStatus === 'closed'
                                        ? 'bg-purple-950/80 text-purple-200 border border-purple-800/60'
                                        : 'bg-zinc-950/60 text-zinc-400 border border-zinc-800/60 hover:text-zinc-200 hover:bg-zinc-900'
                                }`}
                            >
                                <span>Gesloten</span>
                                <span className="px-2 py-0.5 rounded-md bg-zinc-900/80 text-zinc-400 text-[10px]">
                                    {closedCount}
                                </span>
                            </button>
                        </div>
                    </div>
                </aside>

                {/* Right Column: Main Content */}
                <main className="flex-1 p-6 space-y-6 bg-zinc-950 min-w-0">
                    {/* Header Row: Evenementen Title & Nieuw + Button */}
                    <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80 gap-4">
                        <h2 className="text-xl font-bold text-white tracking-tight">
                            Evenementen
                        </h2>
                        <button
                            onClick={() => setShowModal(true)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-semibold text-sm transition-all shadow-md shadow-purple-950/40"
                        >
                            <span>Nieuw</span>
                            <span className="text-base leading-none">+</span>
                        </button>
                    </div>

                    {/* Cards Container */}
                    {filteredEvents.length === 0 ? (
                        <div className="bg-zinc-900 rounded-2xl p-12 text-center border border-zinc-800 space-y-3">
                            <div className="w-12 h-12 rounded-2xl bg-zinc-950 border border-zinc-800 text-purple-400 flex items-center justify-center mx-auto">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                    <line x1="16" y1="2" x2="16" y2="6" />
                                    <line x1="8" y1="2" x2="8" y2="6" />
                                    <line x1="3" y1="10" x2="21" y2="10" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-white">Geen evenementen gevonden</h3>
                            <p className="text-sm text-zinc-400 max-w-md mx-auto">
                                {searchQuery
                                    ? `Er zijn geen evenementen die overeenkomen met "${searchQuery}".`
                                    : 'Er zijn momenteel nog geen evenementen aangemaakt.'}
                            </p>
                            <button
                                onClick={() => setShowModal(true)}
                                className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-semibold text-xs transition-all"
                            >
                                Eerste Evenement Aanmaken
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {filteredEvents.map((event) => (
                                <div
                                    key={event.id}
                                    className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 hover:border-purple-800/60 transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                                    onClick={() => {router.get(`/dashboard/evenementen/${event.id}`)}}
                                >
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-lg font-bold text-white">
                                                {event.naam}
                                            </h3>
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                                event.open
                                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/50'
                                                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700/50'
                                            }`}>
                                                {event.open ? 'Open' : 'Gesloten'}
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                                            {event.code && (
                                                <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 font-mono text-purple-300">
                                                    Code: {event.code}
                                                </span>
                                            )}
                                            {event.start_datum && (
                                                <span>Start: <strong className="text-zinc-200">{new Date(event.start_datum).toLocaleDateString('nl-NL')}</strong></span>
                                            )}
                                            {event.eind_datum && (
                                                <span>Eind: <strong className="text-zinc-200">{new Date(event.eind_datum).toLocaleDateString('nl-NL')}</strong></span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 text-xs text-zinc-400 sm:border-l sm:border-zinc-800 sm:pl-6 shrink-0">
                                        <div>
                                            <p className="text-zinc-500">Groepen</p>
                                            <p className="text-sm font-bold text-white">{event.groepen_count ?? 0}</p>
                                        </div>
                                        <div>
                                            <p className="text-zinc-500">Transacties</p>
                                            <p className="text-sm font-bold text-white">{event.transacties_count ?? 0}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            </div>
            {showModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
                    onClick={closeModal}
                >
                    <form
                        onSubmit={submit}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4"
                    >
                        <h3 className="text-lg font-bold text-white">Nieuw evenement</h3>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Naam</label>
                            <input
                                type="text"
                                value={form.data.naam}
                                onChange={(e) => form.setData('naam', e.target.value)}
                                className={inputClass}
                                required
                            />
                            {form.errors.naam && <p className="text-xs text-red-400">{form.errors.naam}</p>}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Start datum</label>
                                <input
                                    type="datetime-local"
                                    value={form.data.start_datum}
                                    onChange={(e) => form.setData('start_datum', e.target.value)}
                                    className={inputClass}
                                    required
                                />
                                {form.errors.start_datum && <p className="text-xs text-red-400">{form.errors.start_datum}</p>}
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Eind datum</label>
                                <input
                                    type="datetime-local"
                                    value={form.data.eind_datum}
                                    onChange={(e) => form.setData('eind_datum', e.target.value)}
                                    className={inputClass}
                                    required
                                />
                                {form.errors.eind_datum && <p className="text-xs text-red-400">{form.errors.eind_datum}</p>}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Munt prijs (€)</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={form.data.munt_prijs}
                                onChange={(e) => form.setData('munt_prijs', e.target.value)}
                                className={inputClass}
                                required
                            />
                            {form.errors.munt_prijs && <p className="text-xs text-red-400">{form.errors.munt_prijs}</p>}
                        </div>

                        <label className="flex items-center gap-2 text-sm text-zinc-200">
                            <input
                                type="checkbox"
                                checked={form.data.telefoon_betaling}
                                onChange={(e) => form.setData('telefoon_betaling', e.target.checked)}
                                className="accent-purple-600"
                            />
                            Telefoon betaling
                        </label>
                        <label className="flex items-center gap-2 text-sm text-zinc-200">
                            <input
                                type="checkbox"
                                checked={form.data.munten_terugstorten}
                                onChange={(e) => form.setData('munten_terugstorten', e.target.checked)}
                                className="accent-purple-600"
                            />
                            Munten terugstorten
                        </label>
                        <label className="flex items-center gap-2 text-sm text-zinc-200">
                            <input
                                type="checkbox"
                                checked={form.data.heeft_tickets}
                                onChange={(e) => form.setData('heeft_tickets', e.target.checked)}
                                className="accent-purple-600"
                            />
                            Tickets
                        </label>

                        {(form.errors as Record<string, string>).error && (
                            <p className="text-xs text-red-400">{(form.errors as Record<string, string>).error}</p>
                        )}

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={closeModal}
                                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-semibold transition-all"
                            >
                                Annuleren
                            </button>
                            <button
                                type="submit"
                                disabled={form.processing}
                                className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 disabled:opacity-60 text-white text-sm font-semibold transition-all"
                            >
                                Aanmaken
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </DashboardLayout>
    );
}
