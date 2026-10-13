import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import DashboardLayout from './DashboardLayout'
import Evenement from '../Dashboard/Evenementen/Evenement'
import Groepen from '../Dashboard/Evenementen/Groepen'
import Deelnemers from '../Dashboard/Evenementen/Deelnemers'
import Tickets from '../Dashboard/Evenementen/Tickets'
import Producten from '../Dashboard/Evenementen/Producten'
import type {Evenement as EvenementType} from '../../../types/type';

interface EvenementenLayoutProps {
    evenement: EvenementType;
    groepen?: any;
    deelnemers?: any;
    groep_transacties: any;
    deelnemer_transacties: any;
    producten_verkoop?: any;
}

export default function EvenementenLayout({ evenement, groepen, deelnemers, groep_transacties, deelnemer_transacties, producten_verkoop }: EvenementenLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Initial tab read from URL query param `?tab=...`
    const getInitialTab = () => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            return params.get('tab') || 'evenement';
        }
        return 'evenement';
    };

    const [selectedId, setSelectedId] = useState<string>(getInitialTab());

    const handleChangePage = (e: any, id: string | number) => {
        if (e && e.preventDefault) e.preventDefault();
        const tabId = String(id);
        setSelectedId(tabId);

        router.get(
            `/dashboard/evenementen/${evenement.id}`,
            { tab: tabId },
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    const menuItems = [
        {
            id: 'evenement',
            label: 'Evenement',
            component: <Evenement evenement={evenement}
                                   producten_verkoop={producten_verkoop}
            />,
        },
        {
            id: 'groepen',
            label: 'Groepen',
            component: <Groepen evenement={evenement}
                                groepen={groepen}
                                transacties={groep_transacties}
            />,
        },
        {
            id: 'deelnemers',
            label: 'Deelnemers',
            component: <Deelnemers evenement={evenement}
                deelnemers={deelnemers}
                transacties={deelnemer_transacties}
            />,
        },
        {
            id: 'tickets',
            label: 'Tickets',
            component: <Tickets evenement={evenement}
            />,
        },
        {
            id: 'producten',
            label: 'Producten',
            component: <Producten evenement={evenement}
                                  producten_verkoop={producten_verkoop}
            />,
        },
    ];

    const activeItem = menuItems.find((item) => item.id === selectedId) || menuItems[0];

    return (
        <DashboardLayout>
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
                            const isSelected = selectedId === item.id;
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={(e) => {
                                        handleChangePage(e, item.id);
                                        setSidebarOpen(false);
                                    }}
                                    className={`w-full text-left flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all hover:text-zinc-100 hover:bg-zinc-800/60 ${
                                        isSelected ? 'text-zinc-100 bg-zinc-800/60' : 'text-zinc-400'
                                    }`}
                                >
                                    <span>{item.label}</span>
                                </button>
                            );
                        })}
                    </nav>
                </aside>

                {/* Right Side Main Content Area */}
                <div className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
                    {activeItem.component}
                </div>

            </div>
        </DashboardLayout>
    );
}
