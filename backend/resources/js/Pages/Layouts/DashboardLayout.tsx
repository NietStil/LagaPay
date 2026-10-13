import React, { useState, useRef, useEffect } from 'react';
import { Link, router, usePage } from '@inertiajs/react';

export interface User {
    id: number;
    voornaam: string;
    achternaam: string;
    tussenvoegsels?: string | null;
    email: string;
}

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export default function DashboardLayout({children }: DashboardLayoutProps) {
    const { auth } = usePage().props as { auth: { user: User } };
    const user = auth.user;

    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        router.post('/logout');
    };

    const getInitials = () => {
        if (!user) return 'U';
        const first = user.voornaam ? user.voornaam.charAt(0).toUpperCase() : '';
        const last = user.achternaam ? user.achternaam.charAt(0).toUpperCase() : '';
        return `${first}${last}` || 'U';
    };

    const fullName = user
        ? [user.voornaam, user.tussenvoegsels, user.achternaam].filter(Boolean).join(' ')
        : 'Gebruiker';

    return (
        <div className="min-h-screen bg-zinc-950 font-sans text-zinc-100 flex flex-col selection:bg-purple-900 selection:text-white">
            {/* Top Navigation Bar - Full Width */}
            <nav className="bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800/80 sticky top-0 z-40 w-full">
                <div className="w-full px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">

                        {/* Left Section: Brand Title */}
                        <div className="flex items-center">
                            <span className="font-bold text-lg tracking-tight text-white select-none">
                                Laga<span className="text-purple-400">Pay</span>
                            </span>
                        </div>

                        {/* Right Section: User Account Menu */}
                        <div className="hidden md:flex items-center gap-4">
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                    className="flex items-center gap-3 p-1.5 pl-3.5 rounded-full border border-zinc-800 bg-zinc-900 hover:border-purple-800/60 hover:bg-zinc-800/50 transition-all focus:outline-none"
                                >
                                    <span className="text-xs font-semibold text-zinc-200">
                                        {fullName}
                                    </span>
                                    <div className="w-8 h-8 rounded-full bg-purple-950 border border-purple-800/60 text-purple-200 font-semibold text-xs flex items-center justify-center">
                                        {getInitials()}
                                    </div>
                                    <svg
                                        className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 mr-1 ${dropdownOpen ? 'rotate-180' : ''}`}
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        viewBox="0 0 24 24"
                                    >
                                        <path d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {/* Dropdown Menu */}
                                {dropdownOpen && (
                                    <div className="absolute right-0 mt-2 w-64 bg-zinc-900 rounded-2xl shadow-xl border border-zinc-800 py-2 z-50 transform transition-all animate-in fade-in duration-150">
                                        <div className="px-4 py-3 border-b border-zinc-800">
                                            <p className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Ingelogd als</p>
                                            <p className="text-sm font-bold text-white truncate mt-0.5">{fullName}</p>
                                            <p className="text-xs text-zinc-400 truncate">{user?.email}</p>
                                        </div>

                                        <div className="py-1">
                                            <Link
                                                href="/dashboard"
                                                onClick={() => setDropdownOpen(false)}
                                                className="flex items-center gap-2.5 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800/80 hover:text-purple-300 transition-colors"
                                            >
                                                <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                    <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                                </svg>
                                                Dashboard Overzicht
                                            </Link>
                                        </div>

                                        <div className="border-t border-zinc-800 pt-1">
                                            <button
                                                onClick={handleLogout}
                                                className="w-full text-left flex items-center gap-2.5 px-4 py-2 text-sm text-rose-400 hover:bg-rose-950/20 transition-colors font-medium"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                    <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                                </svg>
                                                Uitloggen
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Hamburger Button for Mobile */}
                        <div className="flex items-center md:hidden">
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    {mobileMenuOpen ? (
                                        <path d="M6 18L18 6M6 6l12 12" />
                                    ) : (
                                        <path d="M4 6h16M4 12h16M4 18h16" />
                                    )}
                                </svg>
                            </button>
                        </div>

                    </div>
                </div>

                {/* Mobile Drawer */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-t border-zinc-800 bg-zinc-900 px-4 pt-3 pb-4 space-y-3">
                        <div className="pt-1">
                            <div className="flex items-center gap-3 px-3 py-2">
                                <div className="w-9 h-9 rounded-full bg-purple-950 border border-purple-800/60 text-purple-200 font-semibold text-xs flex items-center justify-center">
                                    {getInitials()}
                                </div>
                                <div className="truncate">
                                    <p className="text-sm font-bold text-white truncate">{fullName}</p>
                                    <p className="text-xs text-zinc-400 truncate">{user?.email}</p>
                                </div>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="w-full mt-2 text-left flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-rose-400 hover:bg-rose-950/20"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                Uitloggen
                            </button>
                        </div>
                    </div>
                )}
            </nav>

            {/* Main Content Area - Full Width */}
            <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">
                {children}
            </main>
        </div>
    );
}
