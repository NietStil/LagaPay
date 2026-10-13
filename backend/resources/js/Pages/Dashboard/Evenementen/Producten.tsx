import React, { useState, useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';
import type { Evenement, Product } from '../../../types/type';

interface SelectedEvenementProps {
    evenement: Evenement;
    setPage?: (e: any, page: any) => void;
}

interface MuntenChange {
    id: number;
    naam: string;
    nieuwe_prijs: number;
}

export default function Producten({ evenement }: SelectedEvenementProps) {
    const { errors, flash } = usePage().props as any;

    const [searchQuery, setSearchQuery] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const [muntWaarde] = useState<number>(Number(evenement.munt_prijs) || 1.50);

    const [productenList, setProductenList] = useState<Product[]>(
        evenement.producten || []
    );

    const [muntenChanges, setMuntenChanges] = useState<MuntenChange[]>([]);

    const [newNaam, setNewNaam] = useState('');
    const [newMunten, setNewMunten] = useState<number>(1);

    useEffect(() => {
        setProductenList(evenement.producten || []);
    }, [evenement.producten]);

    const filteredProducten = productenList.filter((product: Product) =>
        product.naam.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const hasUnsavedChanges = muntenChanges.length > 0;

    const handleMuntenChange = (id: number, val: number) => {
        const parsed = isNaN(val) ? 0 : Math.max(0, val);
        const product = productenList.find((p) => p.id === id);
        const currentNaam = product ? product.naam : '';

        setMuntenChanges((prev: MuntenChange[]) => {
            const index = prev.findIndex((item: MuntenChange) => item.id === id);
            if (index !== -1) {
                const updated = [...prev];
                updated[index] = { ...updated[index], nieuwe_prijs: parsed };
                return updated;
            }
            return [...prev, { id, naam: currentNaam, nieuwe_prijs: parsed }];
        });
    };

    const handleNaamChange = (id: number, val: string) => {
        setProductenList((prev: Product[]) =>
            prev.map((p: Product) => (p.id === id ? { ...p, naam: val } : p))
        );

        setMuntenChanges((prev: any) => {
            const index = prev.findIndex((item: any) => item.id === id);
            if (index !== -1) {
                const updated = [...prev];
                updated[index] = { ...updated[index], naam: val };
                return updated;
            } else {
                const product = productenList.find((p) => p.id === id);
                return [
                    ...prev,
                    { id, naam: val, nieuwe_prijs: product ? product.prijs : 1 },
                ];
            }
        });
    };

    const handleDeleteProduct = (e: React.MouseEvent, id: number) => {
        e.preventDefault();

        setIsSaving(true);
        setStatusMessage(null);
        setErrorMessage(null);

        router.delete(`/dashboard/evenementen/${evenement.id}/producten/${id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setIsSaving(false);
                setStatusMessage('Product succesvol verwijderd!');
                setTimeout(() => setStatusMessage(null), 3000);
            },
            onError: () => {
                setIsSaving(false);
                setErrorMessage('Fout bij het verwijderen van product.');
            }
        });
    };

    const handleAddProduct = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNaam.trim()) return;

        setIsSaving(true);
        setStatusMessage(null);
        setErrorMessage(null);

        router.post(
            `/dashboard/evenementen/${evenement.id}/producten`,
            {
                evenement_id: evenement.id,
                naam: newNaam.trim(),
                prijs: Math.max(0, newMunten),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setNewNaam('');
                    setNewMunten(1);
                    setShowAddModal(false);
                    setIsSaving(false);
                    setStatusMessage('Product succesvol toegevoegd!');
                    setTimeout(() => setStatusMessage(null), 3000);
                },
                onError: () => {
                    setIsSaving(false);
                    setErrorMessage('Fout bij het toevoegen van product.');
                },
            }
        );
    };

    const handleSaveChanges = () => {
        if (!hasUnsavedChanges) return;

        setIsSaving(true);
        setStatusMessage(null);
        setErrorMessage(null);

        const validUpdates = muntenChanges.filter((item) => item.id < 1000000000000);

        router.put(
            `/dashboard/evenementen/${evenement.id}/producten`,
            {
                update: validUpdates,
                evenement_id: evenement.id,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setMuntenChanges([]);
                    setIsSaving(false);
                    setStatusMessage('Wijzigingen succesvol opgeslagen!');
                    setTimeout(() => setStatusMessage(null), 3000);
                },
                onError: (err) => {
                    console.log(err);
                    setIsSaving(false);
                    setErrorMessage('Er is een fout opgetreden bij het opslaan.');
                },
            }
        );
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans p-4 sm:p-6 lg:p-8 selection:bg-purple-600 selection:text-white">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Status / Error Notifications */}
                {(statusMessage || flash?.success) && (
                    <div className="bg-emerald-950 border border-emerald-800/80 text-emerald-200 px-4 py-3.5 rounded-2xl text-sm font-medium flex items-center justify-between shadow-xl">
                        <div className="flex items-center gap-2.5">
                            <div className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span>{statusMessage || flash?.success}</span>
                        </div>
                    </div>
                )}
                {(errorMessage || errors?.error) && (
                    <div className="bg-red-950 border border-red-800/80 text-red-200 px-4 py-3.5 rounded-2xl text-sm font-medium flex items-center justify-between shadow-xl">
                        <div className="flex items-center gap-2.5">
                            <div className="w-2 h-2 rounded-full bg-red-400" />
                            <span>{errorMessage || errors?.error}</span>
                        </div>
                    </div>
                )}

                {/* Header Card */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3.5">
                        <button
                            onClick={() => router.get('/dashboard/evenementen')}
                            className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white border border-zinc-700/50 transition-all group"
                            title="Terug naar evenementen"
                        >
                            <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div>
                            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest block mb-0.5">Evenement Beheer</span>
                            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                                Producten <span className="text-zinc-500 font-light">&mdash;</span> <span className="text-purple-400">{evenement.naam}</span>
                            </h1>
                        </div>
                    </div>

                    {hasUnsavedChanges && (
                        <button
                            onClick={handleSaveChanges}
                            disabled={isSaving}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all shadow-lg shadow-emerald-950/60 disabled:opacity-50 active:scale-[0.98]"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            <span>{isSaving ? 'Bezig met opslaan...' : 'Wijzigingen Opslaan'}</span>
                        </button>
                    )}
                </div>

                {/* Main Product Management Box */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-5 shadow-xl">

                    {/* Searchbar */}
                    <div className="relative group">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Zoek producten..."
                            className="w-full pl-10 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-2xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
                        />
                        <svg className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5 transition-colors group-focus-within:text-purple-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                    </div>

                    {/* Totaal Count & Add Button */}
                    <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                        <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                            Inventaris &bull; <span className="text-purple-400 font-bold">{productenList.length}</span> {productenList.length === 1 ? 'product' : 'producten'}
                        </div>

                        <button
                            onClick={() => setShowAddModal(true)}
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-all shadow-md shadow-purple-950/50 active:scale-[0.98]"
                            title="Nieuw product toevoegen"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            <span>Product toevoegen</span>
                        </button>
                    </div>

                    {/* Producten List */}
                    <div className="max-h-[560px] overflow-y-auto divide-y divide-zinc-800/50 pr-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                        {filteredProducten.length === 0 ? (
                            <div className="p-10 text-center bg-zinc-950 border border-zinc-800/80 rounded-2xl space-y-2 my-2">
                                <p className="text-sm font-medium text-zinc-400">
                                    {searchQuery
                                        ? `Geen producten gevonden voor "${searchQuery}".`
                                        : 'Nog geen producten toegevoegd.'}
                                </p>
                            </div>
                        ) : (
                            filteredProducten.map((product) => {
                                const changeObj = muntenChanges.find((item) => item.id === product.id);
                                const displayMunten = changeObj !== undefined ? changeObj.nieuwe_prijs : product.prijs;
                                const berekendePrijs = (displayMunten * muntWaarde).toFixed(2);

                                return (
                                    <div
                                        key={product.id}
                                        className="group py-2.5 flex items-center justify-between gap-3 hover:bg-zinc-900/40 px-1.5 rounded-lg transition-all"
                                    >
                                        {/* Product Naam Input */}
                                        <div className="flex-1 min-w-0">
                                            <input
                                                type="text"
                                                value={product.naam}
                                                onChange={(e) => handleNaamChange(product.id, e.target.value)}
                                                className="w-full bg-transparent text-xs font-medium text-white focus:outline-none border-b border-transparent focus:border-purple-500 transition-colors py-0.5 px-1 rounded hover:bg-zinc-900/80"
                                                placeholder="Productnaam..."
                                            />
                                        </div>

                                        {/* Prijs Display */}
                                        <div className="shrink-0 text-right px-1">
                                            <span className="text-[10px] uppercase font-semibold text-zinc-500 block">Prijs</span>
                                            <span className="text-xs font-bold text-emerald-400">
                                                &euro; {berekendePrijs.replace('.', ',')}
                                            </span>
                                        </div>

                                        {/* Munten Input */}
                                        <div className={`shrink-0 flex items-center gap-1.5 bg-zinc-900/80 border ${changeObj !== undefined ? 'border-purple-500 bg-purple-950/40' : 'border-zinc-800'} px-2 py-1 rounded-lg transition-all`}>
                                            <input
                                                type="number"
                                                min="0"
                                                value={displayMunten}
                                                onChange={(e) => handleMuntenChange(product.id, parseInt(e.target.value))}
                                                className="w-10 bg-transparent text-center text-xs font-bold text-purple-300 focus:outline-none"
                                            />
                                            <span className="text-[10px] font-semibold text-zinc-400">munt</span>
                                        </div>

                                        {/* Delete Button */}
                                        <button
                                            onClick={(e) => handleDeleteProduct(e, product.id)}
                                            className="shrink-0 text-zinc-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-all opacity-80 group-hover:opacity-100"
                                            title="Product verwijderen"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Add Product Modal */}
                {showAddModal && (
                    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                        <form onSubmit={handleAddProduct} className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl">

                            <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800">
                                <div>
                                    <span className="text-[10px] uppercase font-semibold text-purple-400 tracking-wider block">Catalogus</span>
                                    <h3 className="text-base font-bold text-white">Nieuw Product Toevoegen</h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="text-zinc-400 hover:text-white p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition-colors"
                                >
                                    &times;
                                </button>
                            </div>

                            <div className="space-y-4 text-sm">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                        Productnaam
                                    </label>
                                    <input
                                        type="text"
                                        value={newNaam}
                                        onChange={(e) => setNewNaam(e.target.value)}
                                        placeholder="Bijv. Speciaalbier / Wijn / Burger"
                                        required
                                        className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-2xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                        Aantal Munten
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={newMunten}
                                        onChange={(e) => setNewMunten(parseInt(e.target.value) || 0)}
                                        placeholder="1"
                                        className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-2xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition-colors"
                                >
                                    Annuleren
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-lg shadow-purple-950/50 disabled:opacity-50 transition-all active:scale-[0.98]"
                                >
                                    {isSaving ? 'Opslaan...' : 'Product toevoegen'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
