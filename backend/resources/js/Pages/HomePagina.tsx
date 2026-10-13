import React from 'react';
import { router } from "@inertiajs/react";

export default function HomePagina() {
    return (
        <div className="min-h-screen bg-zinc-950 flex flex-col font-sans text-zinc-100 selection:bg-purple-900 selection:text-white">
            {/* Guest Navigation Bar */}
            <header className="w-full bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800/80 px-6 h-16 flex items-center justify-between sticky top-0 z-40">
                <span className="font-bold text-lg tracking-tight text-white select-none">
                    Laga<span className="text-purple-400">Pay</span>
                </span>

                <div className="flex items-center gap-3">
                    {/*<button*/}
                    {/*    onClick={() => router.get('/register')}*/}
                    {/*    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-sm transition-all duration-200 border border-zinc-700/60"*/}
                    {/*>*/}
                    {/*    Registreren*/}
                    {/*</button>*/}
                    <button
                        onClick={() => router.get('/login')}
                        className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-semibold text-sm transition-all duration-200"
                    >
                        Inloggen
                    </button>
                </div>
            </header>

            {/* Guest Hero Area */}
            <main className="flex-1 flex items-center justify-center p-6">
                <div className="text-center max-w-xl">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-zinc-900 text-purple-400 mb-6 border border-zinc-800 shadow-sm">
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>

                    <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
                        Welkom bij <span className="text-purple-400">LagaPay</span>
                    </h1>

                    <p className="text-zinc-400 text-base sm:text-lg mb-8 leading-relaxed">
                        Meld je aan of maak een account aan om eenvoudig al je betalingen en accounts te beheren.
                    </p>

                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <button
                            onClick={() => router.get('/login')}
                            className="px-8 py-3.5 rounded-xl bg-purple-700 hover:bg-purple-800 active:bg-purple-900 text-white font-semibold text-sm transition-all"
                        >
                            Nu Inloggen
                        </button>
                        {/*<button*/}
                        {/*    onClick={() => router.get('/register')}*/}
                        {/*    className="px-8 py-3.5 rounded-xl bg-zinc-900 border border-zinc-700/80 hover:bg-zinc-800 text-zinc-200 hover:text-white font-semibold text-sm transition-all"*/}
                        {/*>*/}
                        {/*    Account Aanmaken*/}
                        {/*</button>*/}
                    </div>
                </div>
            </main>
        </div>
    );
}
