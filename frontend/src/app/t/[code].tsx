// Deep link: https://lagapay.nl/t/{code} or lagapay://t/{code} → a friend bought a ticket for me.
// Opening it takes that ticket, joins the evenement when it has started, and opens it. Before the start I land on
// the tickets screen, which says when I can join. Opened while logged out, the auth guard (src/app/_layout.tsx)
// stores this path and returns here after login.

import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';

import { Button, ErrorState, LoadingState, Screen, ScreenHeader } from '@/components/lagapay';
import { useAuth } from '@/context/auth-context';
import { foutmelding } from '@/lib/api/lagapay';
import { openTicketLink } from '@/lib/deelnemen';

export default function TicketOntvangenScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { isAuthenticated } = useAuth();
  const [fout, setFout] = useState<string | null>(null);

  useEffect(() => {
    // Not logged in: the auth guard redirects to /login, don't call the API.
    if (!isAuthenticated || !code) return;
    let actief = true;
    openTicketLink(code).then(
      ({ evenementId, naarTickets }) => {
        if (!actief) return;
        router.replace(naarTickets ? `/evenement/${evenementId}/tickets` : `/evenement/${evenementId}`);
      },
      (err: unknown) => {
        // 404 onbekende link, 409 alle tickets vergeven, 403 evenement gesloten / geblokkeerd.
        if (actief) setFout(foutmelding(err));
      },
    );
    return () => {
      actief = false;
    };
  }, [code, isAuthenticated]);

  return (
    <Screen>
      <ScreenHeader title="Ticket" />
      {fout ? (
        <ErrorState
          title="Ticket ophalen lukt niet"
          message={fout}
          action={<Button title="Naar evenementen" variant="secondary" onPress={() => router.replace('/')} />}
        />
      ) : (
        <LoadingState label="Je ticket wordt klaargezet…" />
      )}
    </Screen>
  );
}
