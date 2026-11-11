// The bestelling being rung up on a bar terminal, shared by the Producten tab and Afrekenen, plus the terminal's
// evenement id: tab screens that weren't opened yet don't get the [id] route param, so they read it from here.

import { createContext, useContext, useState, type ReactNode } from 'react';

import type { TerminalProduct } from '@/lib/api/types';

export interface Bestelregel {
  product: TerminalProduct;
  aantal: number;
}

interface Winkelwagen {
  /** The evenement this device is the terminal of. */
  evenementId: string;
  /** Products with aantal > 0, in the order they were first added. */
  regels: Bestelregel[];
  /** Aantal of this product in the bestelling (0 when not in it). */
  aantal: (productId: number) => number;
  totaal: number;
  voegToe: (product: TerminalProduct) => void;
  /** One less; at 0 the product leaves the bestelling. */
  verminder: (productId: number) => void;
  leeg: () => void;
}

const WinkelwagenContext = createContext<Winkelwagen | null>(null);

/** Wraps one terminal (terminal/[id]/_layout.tsx), so the bestelling is gone after leaving the terminal. */
export function WinkelwagenProvider({ evenementId, children }: { evenementId: string; children: ReactNode }) {
  const [regels, setRegels] = useState<Bestelregel[]>([]);

  const waarde: Winkelwagen = {
    evenementId,
    regels,
    aantal: (productId) => regels.find((r) => r.product.id === productId)?.aantal ?? 0,
    totaal: regels.reduce((som, r) => som + r.product.prijs * r.aantal, 0),
    voegToe: (product) =>
      setRegels((huidig) =>
        huidig.some((r) => r.product.id === product.id)
          ? huidig.map((r) => (r.product.id === product.id ? { ...r, aantal: r.aantal + 1 } : r))
          : [...huidig, { product, aantal: 1 }],
      ),
    verminder: (productId) =>
      setRegels((huidig) =>
        huidig
          .map((r) => (r.product.id === productId ? { ...r, aantal: r.aantal - 1 } : r))
          .filter((r) => r.aantal > 0),
      ),
    leeg: () => setRegels([]),
  };

  return <WinkelwagenContext.Provider value={waarde}>{children}</WinkelwagenContext.Provider>;
}

export function useWinkelwagen(): Winkelwagen {
  const winkelwagen = useContext(WinkelwagenContext);
  if (!winkelwagen) throw new Error('useWinkelwagen buiten WinkelwagenProvider');
  return winkelwagen;
}

/** The evenement id of the current terminal (from terminal/[id]/_layout.tsx). */
export function useTerminalId(): string {
  return useWinkelwagen().evenementId;
}
