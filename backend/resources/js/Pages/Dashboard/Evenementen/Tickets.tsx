import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import type { Evenement, Ticket } from '../../../types/type';

interface SelectedEvenementProps {
    evenement: Evenement;
    setPage: (number: any) => void;
}

export default function Tickets({ evenement }: SelectedEvenementProps) {
    const [showAddModal, setShowAddModal] = useState(false);

    // Form state for creating a new ticket
    const [formNaam, setFormNaam] = useState('');
    const [formPrijs, setFormPrijs] = useState('');
    const [formMunten, setFormMunten] = useState('');
    const [formCapaciteit, setFormCapaciteit] = useState('');

    // "Tickets toevoegen": the ticket type whose capaciteit is being raised, and by how many
    const [toevoegenTicket, setToevoegenTicket] = useState<Ticket | null>(null);
    const [formExtra, setFormExtra] = useState('');

    const tickets: Ticket[] = evenement.tickets || [];

    const handleStoreTicket = () => {
        if (!formNaam.trim()) return;

        router.post(`/dashboard/evenementen/${evenement.id}/tickets`, {
            naam: formNaam.trim(),
            prijs: formPrijs === '' ? 0 : Number(formPrijs),
            munten: formMunten === '' ? 0 : Number(formMunten),
            capaciteit: formCapaciteit === '' ? null : Number(formCapaciteit),
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setShowAddModal(false);
                setFormNaam('');
                setFormPrijs('');
                setFormMunten('');
                setFormCapaciteit('');
            }
        });
    };

    const handleCapaciteitToevoegen = () => {
        const extra = Number(formExtra);
        if (!toevoegenTicket || !Number.isInteger(extra) || extra < 1) return;

        router.post(`/dashboard/evenementen/${evenement.id}/tickets/${toevoegenTicket.id}/capaciteit`, { extra }, {
            preserveScroll: true,
            onSuccess: () => {
                setToevoegenTicket(null);
                setFormExtra('');
            }
        });
    };

    const handleDeleteTicket = (ticketId: number) => {
        if (confirm('Weet je zeker dat je dit ticket type wilt verwijderen?')) {
            router.delete(`/dashboard/evenementen/${evenement.id}/tickets/${ticketId}`, {
                preserveScroll: true,
            });
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header Card with Add Button */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
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
                            Tickets &mdash; <span className="text-purple-400">{evenement.naam}</span>
                        </h1>
                    </div>

                    <button
                        onClick={() => setShowAddModal(true)}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-semibold text-sm transition-all shadow-md shadow-purple-950/40 shrink-0"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Nieuw Ticket Type</span>
                    </button>
                </div>

                {/* Ticket Title Cards Grid */}
                {tickets.length === 0 ? (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-zinc-950 border border-zinc-800 text-purple-400 flex items-center justify-center mx-auto">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-bold text-white">Geen tickets gevonden</h3>
                        <p className="text-sm text-zinc-400 max-w-md mx-auto">
                            Er zijn nog geen ticket types ingesteld voor dit evenement.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {tickets.map((ticket) => {
                            const userCount = ticket.gebruikers_count ?? ticket.gebruikers?.length ?? 0;
                            const hasMunten = ticket.munten !== null && ticket.munten !== undefined && Number(ticket.munten) > 0;

                            return (
                                <div
                                    key={ticket.id}
                                    className="bg-zinc-900 border border-zinc-800 hover:border-purple-700/80 rounded-2xl overflow-hidden transition-all shadow-xl flex flex-col justify-between min-h-[260px] group"
                                >
                                    {/* Taller Title Card Top Banner */}
                                    <div className="bg-gradient-to-br from-zinc-950 to-zinc-900 border-b border-zinc-800 p-6 flex flex-col justify-between gap-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-800/60 text-purple-300 flex items-center justify-center shrink-0 shadow-inner">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                                                    </svg>
                                                </div>
                                                <h4 className="text-lg font-extrabold text-white tracking-tight leading-snug">
                                                    {ticket.naam}
                                                </h4>
                                            </div>

                                            <button
                                                onClick={() => handleDeleteTicket(ticket.id)}
                                                className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800/80 transition-all opacity-80 group-hover:opacity-100"
                                                title="Ticket type verwijderen"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>

                                        <div className="pt-2">
                                            <span className="text-2xl font-black text-emerald-400 tracking-tight">
                                                {Number(ticket.prijs) === 0 ? "Gratis" : `€${Number(ticket.prijs).toFixed(2)}`}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Card Body Details */}
                                    <div className="p-6 flex flex-col justify-center space-y-4 flex-1 bg-zinc-900/50">
                                        {/* Conditionally render munten only if present and > 0 */}
                                        {hasMunten && (
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Inclusief munten</span>
                                                <span className="px-3 py-1 rounded-lg bg-purple-950/80 text-purple-300 border border-purple-800/60 font-bold text-xs">
                                                    {ticket.munten} munten
                                                </span>
                                            </div>
                                        )}

                                        <div className={`flex items-center justify-between text-sm ${hasMunten ? 'pt-3 border-t border-zinc-800/80' : ''}`}>
                                            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Verkocht</span>
                                            <span className="text-sm font-black text-white">
                                                {ticket.capaciteit === null ? (
                                                    <>{userCount} <span className="font-semibold text-zinc-500">· onbeperkt</span></>
                                                ) : (
                                                    <>{userCount} <span className="font-semibold text-zinc-500">/ {ticket.capaciteit}</span></>
                                                )}
                                            </span>
                                        </div>

                                        {ticket.capaciteit !== null && (
                                            <div className="flex items-center justify-between gap-3 pt-3 border-t border-zinc-800/80">
                                                {userCount >= ticket.capaciteit ? (
                                                    <span className="px-2.5 py-1 rounded-lg bg-red-950/60 text-red-300 border border-red-900/60 font-bold text-xs">
                                                        Uitverkocht
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-zinc-400">
                                                        Nog <span className="font-bold text-white">{ticket.capaciteit - userCount}</span> beschikbaar
                                                    </span>
                                                )}
                                                <button
                                                    onClick={() => { setToevoegenTicket(ticket); setFormExtra(''); }}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs transition-colors border border-zinc-700/60"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                                    </svg>
                                                    Tickets toevoegen
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Add Ticket Modal */}
                {showAddModal && (
                    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
                            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                                <h3 className="text-lg font-bold text-white">Nieuw Ticket Aanmaken</h3>
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="text-zinc-400 hover:text-white p-1 rounded-lg bg-zinc-800"
                                >
                                    &times;
                                </button>
                            </div>

                            <div className="space-y-4 text-sm">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                        Ticket Naam
                                    </label>
                                    <input
                                        type="text"
                                        value={formNaam}
                                        onChange={(e) => setFormNaam(e.target.value)}
                                        placeholder="Bijv. Vroegboeker Ticket"
                                        className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                            Prijs (€)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formPrijs}
                                            onChange={(e) => setFormPrijs(e.target.value)}
                                            placeholder="15.00"
                                            className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                            Munten (Optioneel)
                                        </label>
                                        <input
                                            type="number"
                                            value={formMunten}
                                            onChange={(e) => setFormMunten(e.target.value)}
                                            placeholder="Laat leeg of 0"
                                            className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                        Aantal tickets (Optioneel)
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        step={1}
                                        value={formCapaciteit}
                                        onChange={(e) => setFormCapaciteit(e.target.value)}
                                        placeholder="Leeg = onbeperkt"
                                        className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                                    />
                                    <p className="text-xs text-zinc-500">Hoeveel er in totaal verkocht mogen worden. Je kunt later tickets toevoegen.</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs"
                                >
                                    Annuleren
                                </button>
                                <button
                                    onClick={handleStoreTicket}
                                    className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-semibold text-xs"
                                >
                                    Opslaan
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tickets toevoegen Modal */}
                {toevoegenTicket && toevoegenTicket.capaciteit !== null && (
                    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
                            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                                <h3 className="text-lg font-bold text-white">Tickets toevoegen &mdash; {toevoegenTicket.naam}</h3>
                                <button
                                    onClick={() => setToevoegenTicket(null)}
                                    className="text-zinc-400 hover:text-white p-1 rounded-lg bg-zinc-800"
                                >
                                    &times;
                                </button>
                            </div>

                            <div className="space-y-1.5 text-sm">
                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                    Hoeveel extra tickets
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    step={1}
                                    autoFocus
                                    value={formExtra}
                                    onChange={(e) => setFormExtra(e.target.value)}
                                    placeholder="Bijv. 50"
                                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                                />
                                <p className="text-xs text-zinc-500">
                                    Nu {toevoegenTicket.capaciteit} in totaal
                                    {Number(formExtra) > 0 ? `, daarna ${toevoegenTicket.capaciteit + Number(formExtra)}` : ''}.
                                </p>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                                <button
                                    onClick={() => setToevoegenTicket(null)}
                                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs"
                                >
                                    Annuleren
                                </button>
                                <button
                                    onClick={handleCapaciteitToevoegen}
                                    disabled={!(Number.isInteger(Number(formExtra)) && Number(formExtra) >= 1)}
                                    className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 disabled:opacity-50 disabled:hover:bg-purple-700 text-white font-semibold text-xs"
                                >
                                    Toevoegen
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
