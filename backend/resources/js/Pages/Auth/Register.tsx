import React, { useState } from 'react';
import { router, usePage } from '@inertiajs/react';

export default function Register() {
    // Grab errors automatically shared by Laravel/Inertia
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
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
            <form onSubmit={handleSubmit} className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl space-y-4">
                <h1 className="text-2xl font-bold text-slate-900">Registreren</h1>

                {/* Voornaam Field */}
                <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Voornaam</label>
                    <input
                        type="text"
                        value={voornaam}
                        onChange={(e) => setVoornaam(e.target.value)}
                        className="w-full px-4 py-2 border rounded-xl text-sm"
                    />
                    {/* Display validation error for voornaam if it exists */}
                    {errors.voornaam && <span className="text-xs text-rose-500 mt-1 block">{errors.voornaam}</span>}
                </div>

                {/* Achternaam Field */}
                <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Achternaam</label>
                    <input
                        type="text"
                        value={achternaam}
                        onChange={(e) => setAchternaam(e.target.value)}
                        className="w-full px-4 py-2 border rounded-xl text-sm"
                    />
                    {errors.achternaam && <span className="text-xs text-rose-500 mt-1 block">{errors.achternaam}</span>}
                </div>

                {/* Email Field */}
                <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1">E-mailadres</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-2 border rounded-xl text-sm"
                    />
                    {errors.email && <span className="text-xs text-rose-500 mt-1 block">{errors.email}</span>}
                </div>

                {/* Wachtwoord Field */}
                <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Wachtwoord</label>
                    <input
                        type="password"
                        value={wachtwoord}
                        onChange={(e) => setWachtwoord(e.target.value)}
                        className="w-full px-4 py-2 border rounded-xl text-sm"
                    />
                    {errors.wachtwoord && <span className="text-xs text-rose-500 mt-1 block">{errors.wachtwoord}</span>}
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all"
                >
                    {isLoading ? 'Bezig...' : 'Account aanmaken'}
                </button>
            </form>
        </div>
    );
}
