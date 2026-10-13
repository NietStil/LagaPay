// Deep link: https://lagapay.nl/e/{code} or lagapay://e/{code} → open the evenement (joining it when allowed),
// or, for an evenement with tickets that I can't join yet, its tickets screen (src/lib/deelnemen.ts).
// Opened while logged out, the auth guard (src/app/_layout.tsx) stores this path and returns here after login.

import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';

import { Button, ErrorState, LoadingState, Screen, ScreenHeader } from '@/components/lagapay';
import { useAuth } from '@/context/auth-context';
import { foutmelding } from '@/lib/api/lagapay';
import { openEvenementLink } from '@/lib/deelnemen';

export default function JoinEvenementScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { isAuthenticated } = useAuth();
  const [fout, setFout] = useState<string | null>(null);

  useEffect(() => {
    // Not logged in: the auth guard redirects to /login, don't call the API.
    if (!isAuthenticated || !code) return;
    let actief = true;
    openEvenementLink(code).then(
      ({ evenementId, naarTickets }) => {
        if (!actief) return;
        router.replace(naarTickets ? `/evenement/${evenementId}/tickets` : `/evenement/${evenementId}`);
      },
      (err: unknown) => {
        if (actief) setFout(foutmelding(err));
      },
    );
    return () => {
      actief = false;
    };
  }, [code, isAuthenticated]);

  return (
    <Screen>
      <ScreenHeader title="Evenement toevoegen" />
      {fout ? (
        <ErrorState
          title="Deelnemen lukt niet"
          message={fout}
          action={<Button title="Naar evenementen" variant="secondary" onPress={() => router.replace('/')} />}
        />
      ) : (
        <LoadingState label="Evenement openen…" />
      )}
    </Screen>
  );
}
