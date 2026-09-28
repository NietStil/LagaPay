import React, { useState } from 'react';
import { router, usePage } from '@inertiajs/react';

export default function Register() {
    const { errors } = usePage().props as { errors: Record<string, string> };

    const [voornaam, setVoornaam] = useState('');
    const [achternaam, setAchternaam] = useState('');
    const [email, setEmail] = useState('');
    const [wachtwoord, setWachtwoord] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        router.post('/register', {
            voornaam,
            achternaam,
            email,
            wachtwoord,
        }, {
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
                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="8.5" cy="7" r="4"></circle>
                            <line x1="20" y1="8" x2="20" y2="14"></line>
                            <line x1="23" y1="11" x2="17" y2="11"></line>
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Account Aanmaken</h1>
                    <p className="text-zinc-400 mt-1.5 text-sm">Vul je gegevens in om een LagaPay account aan te maken</p>
                </div>

                <div className="bg-zinc-900 rounded-3xl p-8 border border-zinc-800 shadow-xl">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Voornaam Field */}
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">Voornaam</label>
                            <input
                                type="text"
                                value={voornaam}
                                onChange={(e) => setVoornaam(e.target.value)}
                                className="w-full px-4 py-3 bg-zinc-950/60 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-purple-500 transition-all"
                            />
                            {errors.voornaam && <span className="text-xs text-rose-400 mt-1 block">{errors.voornaam}</span>}
                        </div>

                        {/* Achternaam Field */}
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">Achternaam</label>
                            <input
                                type="text"
                                value={achternaam}
                                onChange={(e) => setAchternaam(e.target.value)}
                                className="w-full px-4 py-3 bg-zinc-950/60 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-purple-500 transition-all"
                            />
                            {errors.achternaam && <span className="text-xs text-rose-400 mt-1 block">{errors.achternaam}</span>}
                        </div>

                        {/* Email Field */}
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">E-mailadres</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-zinc-950/60 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-purple-500 transition-all"
                            />
                            {errors.email && <span className="text-xs text-rose-400 mt-1 block">{errors.email}</span>}
                        </div>

                        {/* Wachtwoord Field */}
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">Wachtwoord</label>
                            <input
                                type="password"
                                value={wachtwoord}
                                onChange={(e) => setWachtwoord(e.target.value)}
                                className="w-full px-4 py-3 bg-zinc-950/60 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-purple-500 transition-all"
                            />
                            {errors.wachtwoord && <span className="text-xs text-rose-400 mt-1 block">{errors.wachtwoord}</span>}
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full mt-2 py-3.5 bg-purple-700 hover:bg-purple-800 text-white font-semibold rounded-xl transition-all flex items-center justify-center disabled:opacity-70"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                'Account aanmaken'
                            )}
                        </button>
                    </form>

                    {/* Footer Login Link */}
                    <p className="text-center text-sm text-zinc-400 mt-6">
                        Al een account?{' '}
                        <button onClick={() => router.get('/login')} className="font-semibold text-purple-400 hover:text-purple-300 transition-colors">
                            Inloggen
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
