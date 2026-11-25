import React, { useState } from 'react';
import { router, usePage } from '@inertiajs/react';

export default function WachtwoordVergeten() {
    const { errors } = usePage().props as { errors: Record<string, string> };

    const [email, setEmail] = useState('');
    const [isVerstuurd, setIsVerstuurd] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        router.post('/wachtwoord-vergeten', { email }, {
            preserveState: true,
            onSuccess: () => setIsVerstuurd(true),
            onFinish: () => setIsLoading(false),
        });
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4 sm:p-6 lg:p-8 font-sans text-zinc-100 selection:bg-purple-900 selection:text-white">
            <div className="w-full max-w-md">

                {/* Brand Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 text-purple-400 mb-4">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <circle cx="7.5" cy="15.5" r="5.5"></circle>
                            <path d="M21 2l-9.6 9.6"></path>
                            <path d="M15.5 7.5l3 3L22 7l-3-3"></path>
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Wachtwoord Vergeten</h1>
                    <p className="text-zinc-400 mt-1.5 text-sm">
                        Vul je e-mailadres in en we sturen je een link om je wachtwoord te herstellen
                    </p>
                </div>

                {/* Card Container */}
                <div className="bg-zinc-900 rounded-3xl p-8 border border-zinc-800 shadow-xl">

                    {isVerstuurd ? (
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-950/50 border border-purple-800/50 text-purple-400 mb-4">
                                <svg className="w-6 h-6 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            </div>
                            <h2 className="text-lg font-semibold text-white">Controleer je inbox</h2>
                            <p className="text-sm text-zinc-400 mt-2">
                                Als er een account bestaat voor <span className="font-medium text-zinc-200">{email}</span>,
                                ontvang je binnen enkele minuten een e-mail met een link om je wachtwoord te herstellen.
                            </p>
                            <button
                                type="button"
                                onClick={() => setIsVerstuurd(false)}
                                className="mt-6 text-sm font-semibold text-purple-400 hover:text-purple-300 transition-colors"
                            >
                                Ander e-mailadres gebruiken
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">

                            {/* Email Field */}
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-2">
                                    E-mailadres
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-purple-400 transition-colors">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                            <polyline points="22,6 12,13 2,6"></polyline>
                                        </svg>
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="naam@voorbeeld.nl"
                                        className="w-full pl-11 pr-4 py-3 bg-zinc-950/60 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-purple-500 transition-all"
                                    />
                                </div>
                                {errors.email && <span className="text-xs text-rose-400 mt-1 block">{errors.email}</span>}
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full mt-2 py-3.5 px-4 bg-purple-700 hover:bg-purple-800 text-white font-semibold rounded-xl focus:outline-none transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-70"
                            >
                                {isLoading ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <span>Herstellink versturen</span>
                                        <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <line x1="5" y1="12" x2="19" y2="12"></line>
                                            <polyline points="12 5 19 12 12 19"></polyline>
                                        </svg>
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    {/* Back to login */}
                    <p className="text-center text-sm text-zinc-400 mt-8">
                        Weet je je wachtwoord weer?{' '}
                        <a href="/login" className="font-semibold text-purple-400 hover:text-purple-300 transition-colors">
                            Inloggen
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}
