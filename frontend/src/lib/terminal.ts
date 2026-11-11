// The bar terminal this device is (at most one). While it is set, the app stays inside that terminal: the root
// layout (src/app/_layout.tsx) sends every other screen there, and only "Verlaten" or a closed evenement ends it.

import { useSyncExternalStore } from 'react';
import { router } from 'expo-router';

import { getTerminals, koppelTerminal } from '@/lib/api/lagapay';

/** Evenement id of the actieve terminal; null = not a terminal; undefined = not checked yet. */
type ActieveTerminal = string | null | undefined;

let actieveTerminal: ActieveTerminal;
const luisteraars = new Set<() => void>();

export function zetActieveTerminal(waarde: ActieveTerminal): void {
  if (waarde === actieveTerminal) return;
  actieveTerminal = waarde;
  luisteraars.forEach((luisteraar) => luisteraar());
}

export function huidigeTerminal(): ActieveTerminal {
  return actieveTerminal;
}

export function useActieveTerminal(): ActieveTerminal {
  return useSyncExternalStore(
    (luisteraar) => {
      luisteraars.add(luisteraar);
      return () => luisteraars.delete(luisteraar);
    },
    () => actieveTerminal,
  );
}

/** Asks the backend whether this account is an actieve terminal (after login / app start). */
export async function laadActieveTerminal(): Promise<void> {
  try {
    const terminals = await getTerminals();
    zetActieveTerminal(terminals[0] ? String(terminals[0].id) : null);
  } catch {
    // No connection: use the app normally; the next start checks again.
    zetActieveTerminal(null);
  }
}

/** Makes this account the terminal of the evenement with this terminal code and opens the terminal. */
export async function wordTerminal(code: string): Promise<void> {
  const evenement = await koppelTerminal(code);
  zetActieveTerminal(String(evenement.id));
  // The terminal replaces the whole history: back from the terminal shouldn't return to the scanner.
  if (router.canDismiss()) router.dismissAll();
  router.replace(`/terminal/${evenement.id}`);
}
