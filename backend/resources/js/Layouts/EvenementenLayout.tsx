import React, { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import DashboardLayout from './DashboardLayout'

interface EvenementenLayoutProps {
    header?: React.ReactNode;
    children: React.ReactNode;
    activeTab?: string;
}

export default function EvenementenLayout({ header, children, activeTab = 'overzicht' }: EvenementenLayoutProps) {
    const { url } = usePage();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const menuItems = [
        {
            id: 'overzicht',
            label: 'Evenementen Overzicht',
            href: '/dashboard/evenementen',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
            ),
        },
        {
            id: 'groepen',
            label: 'Groepen & Teams',
            href: '/dashboard/groepen',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
            ),
        },
        {
            id: 'transacties',
            label: 'Transacties',
            href: '/dashboard/transacties',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
            ),
        },
        {
            id: 'munten',
            label: 'Munten & Tokens',
            href: '/dashboard/munten',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v10M9 9h6" />
                </svg>
            ),
        },
        {
            id: 'instellingen',
            label: 'Instellingen',
            href: '/dashboard/instellingen',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
            ),
        },
    ];

    return (
        <DashboardLayout header={header}>
            <div className="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-10rem)] w-full -m-4 sm:-m-6 lg:-m-8">

                {/* Mobile Left Menu Toggle Bar */}
                <div className="lg:hidden p-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
                    <span className="text-sm font-semibold text-zinc-200">Menu</span>
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white"
                    >
                        {sidebarOpen ? 'Sluit Menu' : 'Open Menu'}
                    </button>
                </div>

                {/* Left Side Navigation Menu */}
                <aside
                    className={`w-full lg:w-64 bg-zinc-900/80 border-r border-zinc-800/80 p-4 lg:p-6 shrink-0 ${
                        sidebarOpen ? 'block' : 'hidden lg:block'
                    }`}
                >
                    <div className="mb-6 px-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400">
                            Evenementen Beheer
                        </h3>
                    </div>

                    <nav className="space-y-1">
                        {menuItems.map((item) => {
                            const isActive = url.startsWith(item.href) || activeTab === item.id;
                            return (
                                <Link
                                    key={item.id}
                                    href={item.href}
                                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                        isActive
                                            ? 'bg-purple-950/60 text-purple-300 border border-purple-800/50'
                                            : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
                                    }`}
                                >
                                    <span className={isActive ? 'text-purple-400' : 'text-zinc-500'}>
                                        {item.icon}
                                    </span>
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </aside>

                {/* Right Side Main Content Area */}
                <div className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
                    {children}
                </div>

            </div>
        </DashboardLayout>
    );
}
