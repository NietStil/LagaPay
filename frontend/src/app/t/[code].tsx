// Deep link: https://lagapay.nl/t/{code} or lagapay://t/{code} → a friend sent me one of their tickets.
// Each ticket has its own link. This screen shows which ticket it is (type, included munten, from whom) and
// claims it on "Ticket ophalen"; then it opens the evenement, or its tickets screen until the ticket is scanned.
// Opened while logged out, the auth guard (src/app/_layout.tsx) stores this path and returns here after login.

import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import {
  Button,
  Card,
  ErrorBanner,
  ErrorState,
  Icon,
  LoadingState,
  Screen,
  ScreenHeader,
  kleuren,
} from '@/components/lagapay';
import { useAuth } from '@/context/auth-context';
import { foutmelding, getTicketUitnodiging } from '@/lib/api/lagapay';
import type { TicketLinkStatus, TicketUitnodigingVoorbeeld } from '@/lib/api/types';
import { claimTicketLink } from '@/lib/deelnemen';
import { formatMunten } from '@/lib/format';

/** Why this link can't be claimed (every status except beschikbaar). */
function uitleg(voorbeeld: TicketUitnodigingVoorbeeld): string {
  const status: Exclude<TicketLinkStatus, 'beschikbaar'> = voorbeeld.status as Exclude<TicketLinkStatus, 'beschikbaar'>;
  switch (status) {
    case 'eigen_link':
      return 'Dit is de link van je eigen ticket. Stuur hem naar de vriend die het ticket krijgt.';
    case 'al_ticket':
      return 'Je hebt al een ticket voor dit evenement.';
    case 'gebruikt':
      return 'Dit ticket is al gebruikt bij de ingang.';
    case 'gesloten':
      return 'Dit evenement is gesloten.';
    case 'geblokkeerd':
      return 'Je kunt niet meer meedoen aan dit evenement.';
  }
}

export default function TicketOntvangenScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { isAuthenticated } = useAuth();
  const [voorbeeld, setVoorbeeld] = useState<TicketUitnodigingVoorbeeld | null>(null);
  const [laadFout, setLaadFout] = useState<string | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);

  useEffect(() => {
    // Not logged in: the auth guard redirects to /login, don't call the API.
    if (!isAuthenticated || !code) return;
    let actief = true;
    getTicketUitnodiging(code).then(
      (data) => {
        if (actief) setVoorbeeld(data);
      },
      // 404: unknown link, or its ticket already went to someone else (claiming gives it a new link).
      (err: unknown) => {
        if (actief) setLaadFout(foutmelding(err));
      },
    );
    return () => {
      actief = false;
    };
  }, [code, isAuthenticated]);

  const ophalen = async () => {
    setBezig(true);
    setFout(null);
    try {
      const { evenementId, naarTickets } = await claimTicketLink(code);
      router.replace(naarTickets ? `/evenement/${evenementId}/tickets` : `/evenement/${evenementId}`);
    } catch (err) {
      // 409 claimed by someone else in the meantime / used, 403 gesloten / geblokkeerd.
      setFout(foutmelding(err, 'Ticket ophalen lukt niet. Probeer het opnieuw.'));
      setBezig(false);
    }
  };

  const kop = <ScreenHeader title="Ticket" />;

  if (laadFout) {
    return (
      <Screen>
        {kop}
        <ErrorState
          title="Deze link werkt niet"
          message={laadFout}
          action={<Button title="Naar evenementen" variant="secondary" onPress={() => router.replace('/')} />}
        />
      </Screen>
    );
  }
  if (!voorbeeld) {
    return (
      <Screen>
        {kop}
        <LoadingState label="Ticket wordt opgezocht…" />
      </Screen>
    );
  }

  const { status, ticket, evenement, van } = voorbeeld;
  const beschikbaar = status === 'beschikbaar';
  // Where to go when there is nothing to claim: my own tickets, or the evenement.
  const naarMijnTickets = status === 'eigen_link' || status === 'al_ticket';

  return (
    <Screen
      footer={
        beschikbaar ? (
          <Button title="Ticket ophalen" size="lg" loading={bezig} onPress={() => void ophalen()} />
        ) : (
          <Button
            title={naarMijnTickets ? 'Naar mijn tickets' : 'Naar evenementen'}
            variant="secondary"
            size="lg"
            onPress={() => router.replace(naarMijnTickets ? `/evenement/${evenement.id}/mijn-tickets` : '/')}
          />
        )
      }
    >
      {kop}
      {fout ? <ErrorBanner message={fout} /> : null}

      <Text className="text-[15px] leading-[22px] text-zinc-400">
        {beschikbaar ? `${van ?? 'Een vriend'} geeft je een ticket.` : uitleg(voorbeeld)}
      </Text>

      <Card className="gap-3 p-5">
        <View className="flex-row items-center gap-3">
          <Icon name="ticket" size={22} color={kleuren.purple300} />
          <View className="min-w-0 flex-1">
            <Text numberOfLines={1} className="text-lg font-bold text-zinc-50">
              {ticket.naam}
            </Text>
            <Text numberOfLines={1} className="text-[13px] text-zinc-400">
              {evenement.naam}
            </Text>
          </View>
        </View>
        {ticket.munten ? (
          <Text className="text-[13px] text-zinc-400">Incl. {formatMunten(ticket.munten)}, die krijg je als het ticket bij de ingang is gescand.</Text>
        ) : null}
        {van ? <Text className="text-[13px] text-zinc-500">Van {van}</Text> : null}
      </Card>

      {beschikbaar ? (
        <Text className="text-[13px] leading-5 text-zinc-500">
          Na het ophalen staat het ticket bij Mijn tickets, met je eigen QR-code. Laat die scannen bij de ingang, dan doe je mee.
        </Text>
      ) : null}
    </Screen>
  );
}
