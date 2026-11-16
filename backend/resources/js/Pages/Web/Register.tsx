import React, { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import GoogleKnop from '../../Components/Auth/GoogleKnop';

interface RegisterProps {
    /** Start of the website's Google login (an account is created on first use). */
    googleUrl: string;
}

const invoer =
    'w-full px-4 py-4 bg-zinc-950/60 border border-zinc-800 rounded-2xl text-white placeholder-zinc-500 text-base focus:outline-none focus:border-purple-500 transition-all';
const label = 'block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-2.5';

/**
 * Registering on the website (main domain): a copy of the app's register screen (frontend/src/app/register.tsx),
 * with the same fields, checks and messages, plus registering with Google.
 */
export default function Register({ googleUrl }: RegisterProps) {
    const { errors } = usePage().props as { errors: Record<string, string> };

    const [voornaam, setVoornaam] = useState('');
    const [tussenvoegsels, setTussenvoegsels] = useState('');
    const [achternaam, setAchternaam] = useState('');
    const [email, setEmail] = useState('');
    const [wachtwoord, setWachtwoord] = useState('');
    const [wachtwoordConfirmation, setWachtwoordConfirmation] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Like the app: my own check first, otherwise the server's first validation error.
    const melding = error ?? Object.values(errors ?? {})[0] ?? null;

    const handleRegister = (e: React.FormEvent) => {
        e.preventDefault();

        if (!voornaam || !achternaam || !email || !wachtwoord || !wachtwoordConfirmation) {
            setError('Vul a.u.b. alle verplichte velden in.');
            return;
        }

        if (wachtwoord !== wachtwoordConfirmation) {
            setError('Wachtwoorden komen niet overeen.');
            return;
        }

        if (wachtwoord.length < 8) {
            setError('Het wachtwoord moet minimaal 8 tekens bevatten.');
            return;
        }

        setError(null);
        setIsSubmitting(true);

        // On success the server logs me in and sends me back to where I came from (e.g. the tickets).
        router.post('/register', {
            voornaam,
            tussenvoegsels: tussenvoegsels || undefined,
            achternaam,
            email,
            wachtwoord,
        }, {
            onFinish: () => setIsSubmitting(false),
        });
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4 py-6 font-sans text-zinc-100 selection:bg-purple-900 selection:text-white">
            <Head title="Account aanmaken" />

            <div className="w-full max-w-md">
                {/* Brand Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white tracking-tight">Account Aanmaken</h1>
                    <p className="text-zinc-400 mt-2 text-base">Vul je gegevens in om je te registreren bij LagaPay</p>
                </div>

                {/* Card Container */}
                <div className="w-full bg-zinc-900 rounded-3xl p-6 sm:p-8 border border-zinc-800 shadow-xl">
                    {/* Validation Errors */}
                    {melding && (
                        <div className="mb-6 p-4 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300 text-sm font-medium">{melding}</div>
                    )}

                    <form onSubmit={handleRegister} className="space-y-5" noValidate>
                        <div>
                            <label htmlFor="voornaam" className={label}>Voornaam *</label>
                            <input id="voornaam" className={invoer} placeholder="Voornaam" value={voornaam} onChange={(e) => setVoornaam(e.target.value)} autoComplete="given-name" />
                        </div>

                        <div>
                            <label htmlFor="tussenvoegsels" className={label}>Tussenvoegsel</label>
                            <input id="tussenvoegsels" className={invoer} placeholder="Tussenvoegsel (bijv. van, de)" value={tussenvoegsels} onChange={(e) => setTussenvoegsels(e.target.value)} />
                        </div>

                        <div>
                            <label htmlFor="achternaam" className={label}>Achternaam *</label>
                            <input id="achternaam" className={invoer} placeholder="Achternaam" value={achternaam} onChange={(e) => setAchternaam(e.target.value)} autoComplete="family-name" />
                        </div>

                        <div>
                            <label htmlFor="email" className={label}>E-mailadres *</label>
                            <input id="email" type="email" className={invoer} placeholder="naam@voorbeeld.nl" value={email} onChange={(e) => setEmail(e.target.value)} autoCapitalize="none" autoComplete="email" />
                        </div>

                        <div>
                            <label htmlFor="wachtwoord" className={label}>Wachtwoord *</label>
                            <div className="relative flex items-center">
                                <input
                                    id="wachtwoord"
                                    type={showPassword ? 'text' : 'password'}
                                    className={`${invoer} pr-20`}
                                    placeholder="••••••••"
                                    value={wachtwoord}
                                    onChange={(e) => setWachtwoord(e.target.value)}
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 p-2 text-zinc-400 hover:text-zinc-200 text-xs font-medium"
                                >
                                    {showPassword ? 'Verberg' : 'Toon'}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="wachtwoord_bevestigen" className={label}>Bevestig Wachtwoord *</label>
                            <input
                                id="wachtwoord_bevestigen"
                                type={showPassword ? 'text' : 'password'}
                                className={invoer}
                                placeholder="••••••••"
                                value={wachtwoordConfirmation}
                                onChange={(e) => setWachtwoordConfirmation(e.target.value)}
                                autoComplete="new-password"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full mt-2 py-4 px-4 bg-purple-700 hover:bg-purple-800 rounded-2xl flex items-center justify-center text-white font-bold text-base transition-colors disabled:opacity-70"
                        >
                            {isSubmitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Account Aanmaken'}
                        </button>
                    </form>

                    <GoogleKnop href={googleUrl} label="Registreren met Google" />

                    {/* Footer Link to Login */}
                    <p className="flex justify-center items-center mt-6 pt-4 border-t border-zinc-800 text-base text-zinc-400">
                        Al een account?&nbsp;
                        <a href="/login" className="text-purple-400 hover:text-purple-300 font-semibold">
                            Inloggen
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}
