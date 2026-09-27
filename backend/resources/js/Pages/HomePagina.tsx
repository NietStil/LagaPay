import React, { useState } from 'react';
import { router, usePage } from "@inertiajs/react";

export default function Home() {
    const [currentView, setCurrentView] = useState('home');

    // Extract auth from Inertia props
    const { auth } = usePage().props as { auth: { user: { voornaam: string } | null } };
    const user = auth?.user;

    const handleLogout = () => {
        router.post('/logout');
    };

    return (
        <div className="min-h-screen bg-white flex flex-col font-sans text-slate-900">
            {/* Navigation Bar */}
            <header className="w-full border-b border-slate-100 px-6 h-16 flex items-center justify-between">
                <div
                    className="text-base font-bold tracking-tight text-slate-900 cursor-pointer"
                    onClick={() => setCurrentView('home')}
                >
                    MijnApp
                </div>

                <div className="flex items-center gap-3">
                    {user ? (
                        /* Show when user IS logged in */
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm transition-all duration-200"
                        >
                            Logout
                        </button>
                    ) : (
                        /* Show when user is NOT logged in */
                        <>
                            <button
                                onClick={() => router.get('/register')}
                                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-medium text-sm transition-all duration-200"
                            >
                                Register
                            </button>
                            <button
                                onClick={() => router.get('/login')}
                                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm transition-all duration-200"
                            >
                                Login
                            </button>
                        </>
                    )}
                </div>
            </header>

            {/* Main Area */}
            <main className="flex-1 flex items-center justify-center p-6">
                <div className="text-center">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">
                        {user ? `Welkom terug, ${user.voornaam}!` : 'Welkom bij MijnApp.'}
                    </h1>
                    <p className="text-slate-500 text-sm">
                        {user ? 'Je bent succesvol ingelogd in je account.' : 'Log in of maak een account aan om te beginnen.'}
                    </p>
                </div>
            </main>
        </div>
    );
}
