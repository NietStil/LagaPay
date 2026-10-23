import React, { useState, useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';
import type { Evenement, Product, ProductCategorie } from '../../../types/type';

interface SelectedEvenementProps {
    evenement: Evenement;
    setPage?: (e: any, page: any) => void;
}

// Blurring the input saves it, so Enter just leaves the input.
const blurOnEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') e.currentTarget.blur();
};

export default function Producten({ evenement }: SelectedEvenementProps) {
    const { errors, flash } = usePage().props as any;

    const [searchQuery, setSearchQuery] = useState('');
    const [showCategorieModal, setShowCategorieModal] = useState(false);
    const [productModalCategorie, setProductModalCategorie] = useState<ProductCategorie | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const muntWaarde = Number(evenement.munt_prijs) || 1.50;
    const categorieen = evenement.product_categorieen || [];
    const productenCount = categorieen.reduce((sum, c) => sum + (c.producten?.length || 0), 0);

    const [newCategorieNaam, setNewCategorieNaam] = useState('');
    const [newNaam, setNewNaam] = useState('');
    const [newMunten, setNewMunten] = useState<number>(1);

    const query = searchQuery.toLowerCase();
    const filteredCategorieen = categorieen
        .map((categorie) => {
            const categorieMatch = categorie.naam.toLowerCase().includes(query);
            const producten = categorieMatch
                ? categorie.producten || []
                : (categorie.producten || []).filter((p) => p.naam.toLowerCase().includes(query));
            return { categorie, producten, zichtbaar: !query || categorieMatch || producten.length > 0 };
        })
        .filter((item) => item.zichtbaar);

    const showStatus = (message: string) => {
        setStatusMessage(message);
        setTimeout(() => setStatusMessage(null), 3000);
    };

    const request = (
        method: 'post' | 'put' | 'delete',
        url: string,
        data: Record<string, any>,
        succes: string | null,
        fout: string,
        onSuccess?: () => void,
    ) => {
        setIsSaving(true);
        setErrorMessage(null);

        const options = {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                setIsSaving(false);
                if (succes) showStatus(succes);
                onSuccess?.();
            },
            onError: () => {
                setIsSaving(false);
                setErrorMessage(fout);
            },
        };

        const fullUrl = `/dashboard/evenementen/${evenement.id}${url}`;
        if (method === 'delete') {
            router.delete(fullUrl, options);
        } else {
            router[method](fullUrl, data, options);
        }
    };

    const handleAddCategorie = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategorieNaam.trim()) return;

        request('post', '/categorieen', { naam: newCategorieNaam.trim() }, 'Categorie succesvol toegevoegd!', 'Fout bij het toevoegen van categorie.', () => {
            setNewCategorieNaam('');
            setShowCategorieModal(false);
        });
    };

    const handleUpdateCategorie = (id: number, naam: string) => {
        request('put', `/categorieen/${id}`, { naam }, null, 'Fout bij het opslaan van categorie.');
    };

    const handleDeleteCategorie = (categorie: ProductCategorie) => {
        const aantal = categorie.producten?.length || 0;
        if (aantal > 0 && !confirm(`Weet je zeker dat je "${categorie.naam}" wilt verwijderen? De ${aantal} ${aantal === 1 ? 'product' : 'producten'} in deze categorie worden ook verwijderd.`)) {
            return;
        }

        request('delete', `/categorieen/${categorie.id}`, {}, 'Categorie succesvol verwijderd!', 'Fout bij het verwijderen van categorie.');
    };

    const handleAddProduct = (e: React.FormEvent) => {
        e.preventDefault();
        if (!productModalCategorie || !newNaam.trim()) return;

        request(
            'post',
            `/categorieen/${productModalCategorie.id}/producten`,
            { naam: newNaam.trim(), prijs: Math.max(0, newMunten) },
            'Product succesvol toegevoegd!',
            'Fout bij het toevoegen van product.',
            () => {
                setNewNaam('');
                setNewMunten(1);
                setProductModalCategorie(null);
            }
        );
    };

    const handleUpdateProduct = (id: number, velden: Partial<Pick<Product, 'naam' | 'prijs'>>) => {
        request('put', `/producten/${id}`, velden, null, 'Fout bij het opslaan van product.');
    };

    const handleDeleteProduct = (id: number) => {
        request('delete', `/producten/${id}`, {}, 'Product succesvol verwijderd!', 'Fout bij het verwijderen van product.');
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans p-4 sm:p-6 lg:p-8 selection:bg-purple-600 selection:text-white">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Status / Error Notifications */}
                {statusMessage && (
                    <div className="bg-emerald-950 border border-emerald-800/80 text-emerald-200 px-4 py-3.5 rounded-2xl text-sm font-medium flex items-center justify-between shadow-xl">
                        <div className="flex items-center gap-2.5">
                            <div className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span>{statusMessage}</span>
                        </div>
                    </div>
                )}
                {(errorMessage || errors?.error) && (
                    <div className="bg-red-950 border border-red-800/80 text-red-200 px-4 py-3.5 rounded-2xl text-sm font-medium flex items-center justify-between shadow-xl">
                        <div className="flex items-center gap-2.5">
                            <div className="w-2 h-2 rounded-full bg-red-400" />
                            <span>{errors?.error || errorMessage}</span>
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

                    {isSaving && (
                        <span className="text-xs font-semibold text-zinc-400">Bezig met opslaan...</span>
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
                            placeholder="Zoek producten of categorieën..."
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
                            Inventaris &bull; <span className="text-purple-400 font-bold">{categorieen.length}</span> {categorieen.length === 1 ? 'categorie' : 'categorieën'}
                            {' '}&bull; <span className="text-purple-400 font-bold">{productenCount}</span> {productenCount === 1 ? 'product' : 'producten'}
                        </div>

                        <button
                            onClick={() => setShowCategorieModal(true)}
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-all shadow-md shadow-purple-950/50 active:scale-[0.98]"
                            title="Nieuwe categorie toevoegen"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            <span>Categorie toevoegen</span>
                        </button>
                    </div>

                    {/* Categorieen List */}
                    <div className="max-h-[560px] overflow-y-auto space-y-4 pr-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                        {filteredCategorieen.length === 0 ? (
                            <div className="p-10 text-center bg-zinc-950 border border-zinc-800/80 rounded-2xl space-y-2 my-2">
                                <p className="text-sm font-medium text-zinc-400">
                                    {searchQuery
                                        ? `Geen producten gevonden voor "${searchQuery}".`
                                        : 'Nog geen categorieën toegevoegd.'}
                                </p>
                            </div>
                        ) : (
                            filteredCategorieen.map(({ categorie, producten }) => (
                                <CategorieBlok
                                    key={categorie.id}
                                    categorie={categorie}
                                    producten={producten}
                                    muntWaarde={muntWaarde}
                                    onRename={(naam) => handleUpdateCategorie(categorie.id, naam)}
                                    onDelete={() => handleDeleteCategorie(categorie)}
                                    onAddProduct={() => setProductModalCategorie(categorie)}
                                    onUpdateProduct={handleUpdateProduct}
                                    onDeleteProduct={handleDeleteProduct}
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* Add Categorie Modal */}
                {showCategorieModal && (
                    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                        <form onSubmit={handleAddCategorie} className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl">

                            <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800">
                                <div>
                                    <span className="text-[10px] uppercase font-semibold text-purple-400 tracking-wider block">Catalogus</span>
                                    <h3 className="text-base font-bold text-white">Nieuwe Categorie Toevoegen</h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowCategorieModal(false)}
                                    className="text-zinc-400 hover:text-white p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition-colors"
                                >
                                    &times;
                                </button>
                            </div>

                            <div className="space-y-1.5 text-sm">
                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                    Categorienaam
                                </label>
                                <input
                                    type="text"
                                    value={newCategorieNaam}
                                    onChange={(e) => setNewCategorieNaam(e.target.value)}
                                    placeholder="Bijv. Bier / Fris / Eten"
                                    required
                                    autoFocus
                                    className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-2xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                                <button
                                    type="button"
                                    onClick={() => setShowCategorieModal(false)}
                                    className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition-colors"
                                >
                                    Annuleren
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-lg shadow-purple-950/50 disabled:opacity-50 transition-all active:scale-[0.98]"
                                >
                                    {isSaving ? 'Opslaan...' : 'Categorie toevoegen'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Add Product Modal */}
                {productModalCategorie && (
                    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                        <form onSubmit={handleAddProduct} className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl">

                            <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800">
                                <div>
                                    <span className="text-[10px] uppercase font-semibold text-purple-400 tracking-wider block">{productModalCategorie.naam}</span>
                                    <h3 className="text-base font-bold text-white">Nieuw Product Toevoegen</h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setProductModalCategorie(null)}
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
                                        autoFocus
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
                                    onClick={() => setProductModalCategorie(null)}
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

interface CategorieBlokProps {
    categorie: ProductCategorie;
    producten: Product[];
    muntWaarde: number;
    onRename: (naam: string) => void;
    onDelete: () => void;
    onAddProduct: () => void;
    onUpdateProduct: (id: number, velden: Partial<Pick<Product, 'naam' | 'prijs'>>) => void;
    onDeleteProduct: (id: number) => void;
}

function CategorieBlok({ categorie, producten, muntWaarde, onRename, onDelete, onAddProduct, onUpdateProduct, onDeleteProduct }: CategorieBlokProps) {
    const [naam, setNaam] = useState(categorie.naam);

    useEffect(() => {
        setNaam(categorie.naam);
    }, [categorie.naam]);

    const handleBlur = () => {
        const trimmed = naam.trim();
        if (!trimmed) {
            setNaam(categorie.naam);
        } else if (trimmed !== categorie.naam) {
            onRename(trimmed);
        }
    };

    return (
        <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-4 space-y-2">
            {/* Categorie Header */}
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-zinc-800/80">
                <input
                    type="text"
                    value={naam}
                    onChange={(e) => setNaam(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={blurOnEnter}
                    className="flex-1 min-w-0 bg-transparent text-sm font-bold text-white focus:outline-none border-b border-transparent focus:border-purple-500 transition-colors py-0.5 px-1 rounded hover:bg-zinc-900/80"
                    placeholder="Categorienaam..."
                />

                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    {categorie.producten?.length || 0} {(categorie.producten?.length || 0) === 1 ? 'product' : 'producten'}
                </span>

                <button
                    onClick={onAddProduct}
                    className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-purple-600 text-zinc-300 hover:text-white font-semibold text-[11px] transition-all"
                    title="Product toevoegen aan deze categorie"
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Product</span>
                </button>

                <button
                    onClick={onDelete}
                    className="shrink-0 text-zinc-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-all"
                    title="Categorie en producten verwijderen"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>

            {/* Producten List */}
            {producten.length === 0 ? (
                <p className="text-xs text-zinc-500 px-1 py-2">Nog geen producten in deze categorie.</p>
            ) : (
                <div className="divide-y divide-zinc-800/50">
                    {producten.map((product) => (
                        <ProductRij
                            key={product.id}
                            product={product}
                            muntWaarde={muntWaarde}
                            onUpdate={(velden) => onUpdateProduct(product.id, velden)}
                            onDelete={() => onDeleteProduct(product.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

interface ProductRijProps {
    product: Product;
    muntWaarde: number;
    onUpdate: (velden: Partial<Pick<Product, 'naam' | 'prijs'>>) => void;
    onDelete: () => void;
}

function ProductRij({ product, muntWaarde, onUpdate, onDelete }: ProductRijProps) {
    const [naam, setNaam] = useState(product.naam);
    const [munten, setMunten] = useState(String(product.prijs));

    useEffect(() => {
        setNaam(product.naam);
    }, [product.naam]);

    useEffect(() => {
        setMunten(String(product.prijs));
    }, [product.prijs]);

    const handleNaamBlur = () => {
        const trimmed = naam.trim();
        if (!trimmed) {
            setNaam(product.naam);
        } else if (trimmed !== product.naam) {
            onUpdate({ naam: trimmed });
        }
    };

    const handleMuntenBlur = () => {
        const parsed = parseInt(munten);
        if (isNaN(parsed) || parsed < 0) {
            setMunten(String(product.prijs));
        } else if (parsed !== product.prijs) {
            onUpdate({ prijs: parsed });
        }
    };

    const displayMunten = parseInt(munten);
    const berekendePrijs = ((isNaN(displayMunten) ? product.prijs : displayMunten) * muntWaarde).toFixed(2);

    return (
        <div className="group py-2.5 flex items-center justify-between gap-3 hover:bg-zinc-900/40 px-1.5 rounded-lg transition-all">
            {/* Product Naam Input */}
            <div className="flex-1 min-w-0">
                <input
                    type="text"
                    value={naam}
                    onChange={(e) => setNaam(e.target.value)}
                    onBlur={handleNaamBlur}
                    onKeyDown={blurOnEnter}
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
            <div className="shrink-0 flex items-center gap-1.5 bg-zinc-900/80 border border-zinc-800 focus-within:border-purple-500 px-2 py-1 rounded-lg transition-all">
                <input
                    type="number"
                    min="0"
                    value={munten}
                    onChange={(e) => setMunten(e.target.value)}
                    onBlur={handleMuntenBlur}
                    onKeyDown={blurOnEnter}
                    className="w-10 bg-transparent text-center text-xs font-bold text-purple-300 focus:outline-none"
                />
                <span className="text-[10px] font-semibold text-zinc-400">munt</span>
            </div>

            {/* Delete Button */}
            <button
                onClick={onDelete}
                className="shrink-0 text-zinc-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-all opacity-80 group-hover:opacity-100"
                title="Product verwijderen"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            </button>
        </div>
    );
}
