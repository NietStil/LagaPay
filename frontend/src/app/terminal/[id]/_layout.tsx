import { useEffect } from 'react';
import { AppState } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';

import { kleuren } from '@/components/lagapay';
import { WinkelwagenProvider } from '@/components/terminal/winkelwagen';
import { getTerminals } from '@/lib/api/lagapay';
import { meld } from '@/lib/melding';
import { huidigeTerminal, zetActieveTerminal } from '@/lib/terminal';

/** How often the terminal checks that it still is one (closed evenement, blocked from the dashboard). */
const CONTROLE_MS = 10_000;

/** One bar terminal (/terminal/[id]/...): the tabs plus Afrekenen, sharing the bestelling. No headers. */
export default function TerminalLayout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  useAfmeldenBijSluiten(id);

  return (
    <WinkelwagenProvider evenementId={id}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: kleuren.zinc950 } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="afrekenen" />
      </Stack>
    </WinkelwagenProvider>
  );
}

/**
 * When the backend no longer lists this device as the actieve terminal (the evenement was closed, or the gebruiker
 * was blocked), unlocks the app and returns to the home screen. Checked now, every CONTROLE_MS and on returning to
 * the app. Network errors are ignored: the terminal keeps working until it hears otherwise.
 */
function useAfmeldenBijSluiten(evenementId: string) {
  useEffect(() => {
    let actief = true;

    const controleer = async () => {
      let terminals;
      try {
        terminals = await getTerminals();
      } catch {
        return;
      }
      // Already left with "Verlaten" (unlocked) while this check ran: nothing to report.
      if (!actief || huidigeTerminal() !== evenementId) return;
      if (terminals.some((evenement) => String(evenement.id) === evenementId)) return;

      actief = false;
      zetActieveTerminal(null);
      if (router.canDismiss()) router.dismissAll();
      router.replace('/');
      meld('Terminal afgemeld', 'Dit toestel is geen terminal meer: het evenement is gesloten of je bent afgemeld.');
    };

    void controleer();
    const timer = setInterval(() => void controleer(), CONTROLE_MS);
    const abonnement = AppState.addEventListener('change', (staat) => {
      if (staat === 'active') void controleer();
    });

    return () => {
      // Also after "Verlaten": a check still in flight must not show the message.
      actief = false;
      clearInterval(timer);
      abonnement.remove();
    };
  }, [evenementId]);
}
