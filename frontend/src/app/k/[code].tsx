// Deep link: https://lagapay.nl/k/{terminal code} or lagapay://k/{code} → this device becomes the evenement's bar
// terminal. Opened while logged out, the auth guard (src/app/_layout.tsx) stores this path and returns here after login.

import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';

import { Button, ErrorState, LoadingState, Screen, ScreenHeader } from '@/components/lagapay';
import { useAuth } from '@/context/auth-context';
import { foutmelding } from '@/lib/api/lagapay';
import { wordTerminal } from '@/lib/terminal';

export default function TerminalLinkScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { isAuthenticated } = useAuth();
  const [fout, setFout] = useState<string | null>(null);

  useEffect(() => {
    // Not logged in: the auth guard redirects to /login, don't call the API.
    if (!isAuthenticated || !code) return;
    let actief = true;
    wordTerminal(code).catch((err: unknown) => {
      if (actief) setFout(foutmelding(err));
    });
    return () => {
      actief = false;
    };
  }, [code, isAuthenticated]);

  return (
    <Screen>
      <ScreenHeader title="Terminal worden" fallbackHref="/profiel" />
      {fout ? (
        <ErrorState
          title="Terminal worden lukt niet"
          message={fout}
          action={<Button title="Opnieuw scannen" variant="secondary" onPress={() => router.replace('/terminal')} />}
        />
      ) : (
        <LoadingState label="Terminal koppelen…" />
      )}
    </Screen>
  );
}
