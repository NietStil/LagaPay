// Deep link: https://lagapay.nl/g/{code} or lagapay://g/{code} → join the groep (and its evenement) and open it.
// For an evenement with tickets that I can't join yet, it opens the evenement's tickets screen instead.
// Opened while logged out, the auth guard (src/app/_layout.tsx) stores this path and returns here after login.

import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';

import { Button, ErrorState, LoadingState, Screen, ScreenHeader } from '@/components/lagapay';
import { useAuth } from '@/context/auth-context';
import { foutmelding } from '@/lib/api/lagapay';
import { openGroepLink } from '@/lib/deelnemen';

export default function JoinGroepScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { isAuthenticated } = useAuth();
  const [fout, setFout] = useState<string | null>(null);

  useEffect(() => {
    // Not logged in: the auth guard redirects to /login, don't call the API.
    if (!isAuthenticated || !code) return;
    let actief = true;
    openGroepLink(code).then(
      ({ evenementId, naarTickets }) => {
        if (!actief) return;
        router.replace(naarTickets ? `/evenement/${evenementId}/tickets` : `/evenement/${evenementId}/groep`);
      },
      (err: unknown) => {
        // 404 onbekende code, 403 evenement gesloten / geblokkeerd, 409 al in een andere groep.
        if (actief) setFout(foutmelding(err));
      },
    );
    return () => {
      actief = false;
    };
  }, [code, isAuthenticated]);

  return (
    <Screen>
      <ScreenHeader title="Groep" />
      {fout ? (
        <ErrorState
          title="Deelnemen lukt niet"
          message={fout}
          action={<Button title="Naar evenementen" variant="secondary" onPress={() => router.replace('/')} />}
        />
      ) : (
        <LoadingState label="Je wordt toegevoegd aan de groep…" />
      )}
    </Screen>
  );
}
