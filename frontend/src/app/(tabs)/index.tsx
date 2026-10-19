// Screen 2 — Evenementen tab (Main.dc.html): a compact card per evenement, open ones first and the gesloten ones
// below a line. "Evenement toevoegen" is on the Tickets tab; with no evenementen, a short note says to scan your ticket.

import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';

import {
  Card,
  ErrorBanner,
  ErrorState,
  Icon,
  InfoNote,
  LoadingState,
  Screen,
  TabTitle,
  kleuren,
} from '@/components/lagapay';
import { useApiData } from '@/hooks/use-api-data';
import { getEvenementen } from '@/lib/api/lagapay';
import type { EvenementSamenvatting } from '@/lib/api/types';
import { formatDatumBereik, formatMunten } from '@/lib/format';

export default function EvenementenScreen() {
  const { data, error, loading, refreshing, reload, refresh } = useApiData(getEvenementen, []);

  let inhoud: ReactNode;
  if (loading) {
    inhoud = <LoadingState />;
  } else if (!data) {
    inhoud = <ErrorState message={error ?? ''} title="Evenementen laden lukt niet" onRetry={reload} />;
  } else if (data.length === 0) {
    inhoud = (
      <InfoNote icon="ticket">Nog geen evenementen. Laat je ticket scannen bij de ingang om toegang te krijgen tot een evenement.</InfoNote>
    );
  } else {
    const open = data.filter((evenement) => evenement.open);
    const gesloten = data.filter((evenement) => !evenement.open);
    inhoud = (
      <>
        {error ? <ErrorBanner message={error} /> : null}
        {open.map((evenement) => (
          <EvenementKaart key={evenement.id} evenement={evenement} />
        ))}
        {open.length > 0 && gesloten.length > 0 ? <View className="my-1 h-px bg-zinc-800" /> : null}
        {gesloten.map((evenement) => (
          <EvenementKaart key={evenement.id} evenement={evenement} />
        ))}
      </>
    );
  }

  return (
    <Screen gap={16} onRefresh={loading ? undefined : refresh} refreshing={refreshing}>
      <TabTitle>Evenementen</TabTitle>
      {inhoud}
    </Screen>
  );
}

/** Open: zinc-900 card with purple-300 arrow and saldo. Gesloten: #111113 card, zinc-300 naam, zinc-400 accents. */
function EvenementKaart({ evenement }: { evenement: EvenementSamenvatting }) {
  const { open } = evenement;
  const datum = formatDatumBereik(evenement.start_datum, evenement.eind_datum);
  const saldo = formatMunten(evenement.saldo);

  return (
    <Card
      variant={open ? 'default' : 'muted'}
      radius={16}
      onPress={() => router.push(`/evenement/${evenement.id}`)}
      accessibilityLabel={`${evenement.naam}, ${datum}, ${saldo}${open ? '' : ', gesloten'}`}
      className="flex-row items-stretch justify-between gap-3 px-4 py-3.5"
    >
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className={`text-base font-bold leading-5 ${open ? 'text-zinc-50' : 'text-zinc-300'}`}>
          {evenement.naam}
        </Text>
        <Text numberOfLines={1} className="mt-1 text-xs text-zinc-400">
          {datum}
        </Text>
      </View>
      <View className="shrink-0 items-end justify-between">
        <Icon name="arrow-up-right" size={18} color={open ? kleuren.purple300 : kleuren.zinc400} />
        <Text className={`text-[15px] font-bold ${open ? 'text-purple-300' : 'text-zinc-400'}`}>{saldo}</Text>
      </View>
    </Card>
  );
}
