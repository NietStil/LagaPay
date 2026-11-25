import React, { useState } from 'react';
import { router, usePage } from '@inertiajs/react';

interface WachtwoordVeranderenProps {
    token: string;
    email: string;
}

export default function WachtwoordVeranderen({ token, email }: WachtwoordVeranderenProps) {
    const { errors } = usePage().props as { errors: Record<string, string> };

    const [wachtwoord, setWachtwoord] = useState('');
    const [bevestiging, setBevestiging] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        router.post('/wachtwoord-veranderen', {
            token,
            email,
            wachtwoord,
            wachtwoord_confirmation: bevestiging,
        }, {
            onFinish: () => setIsLoading(false),
        });
    };

    const inputClass = 'w-full pl-11 pr-11 py-3 bg-zinc-950/60 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-purple-500 transition-all';

    const slotIcoon = (
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-purple-400 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
        </div>
    );

    const toonKnop = (
        <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-200 transition-colors"
        >
            {showPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
            ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                </svg>
            )}
        </button>
    );

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
                    <h1 className="text-2xl font-bold text-white tracking-tight">Nieuw Wachtwoord</h1>
                    <p className="text-zinc-400 mt-1.5 text-sm">
                        Kies een nieuw wachtwoord voor <span className="font-medium text-zinc-200">{email}</span>
                    </p>
                </div>

                {/* Card Container */}
                <div className="bg-zinc-900 rounded-3xl p-8 border border-zinc-800 shadow-xl">

                    {/* Invalid or expired link */}
                    {errors.email && (
                        <div className="mb-6 p-4 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300 text-sm font-medium">
                            {errors.email}{' '}
                            <a href="/wachtwoord-vergeten" className="font-semibold underline hover:text-rose-200">
                                Vraag een nieuwe link aan
                            </a>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">

                        {/* Nieuw wachtwoord */}
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-2">
                                Nieuw wachtwoord
                            </label>
                            <div className="relative group">
                                {slotIcoon}
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    minLength={8}
                                    autoComplete="new-password"
                                    value={wachtwoord}
                                    onChange={(e) => setWachtwoord(e.target.value)}
                                    placeholder="Minimaal 8 tekens"
                                    className={inputClass}
                                />
                                {toonKnop}
                            </div>
                            {errors.wachtwoord && <span className="text-xs text-rose-400 mt-1 block">{errors.wachtwoord}</span>}
                        </div>

                        {/* Bevestiging */}
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-2">
                                Bevestig wachtwoord
                            </label>
                            <div className="relative group">
                                {slotIcoon}
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    autoComplete="new-password"
                                    value={bevestiging}
                                    onChange={(e) => setBevestiging(e.target.value)}
                                    placeholder="Herhaal je nieuwe wachtwoord"
                                    className={inputClass}
                                />
                            </div>
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
                                    <span>Wachtwoord opslaan</span>
                                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                        <polyline points="12 5 19 12 12 19"></polyline>
                                    </svg>
                                </>
                            )}
                        </button>
                    </form>

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
