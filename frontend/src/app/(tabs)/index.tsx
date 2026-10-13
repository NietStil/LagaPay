// Screen 2 — Evenementen tab (Main.dc.html): "Evenement toevoegen" plus a compact card per evenement.

import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';

import {
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  ErrorState,
  Icon,
  ListRow,
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
      <EmptyState
        icon="calendar"
        title="Nog geen evenementen"
        text="Scan de QR-code van een evenement of open de link die je van de organisatie hebt gekregen. Het evenement verschijnt dan hier."
        action={<Button title="Evenement toevoegen" icon="scan" onPress={() => router.push('/toevoegen')} />}
      />
    );
  } else {
    inhoud = (
      <>
        {error ? <ErrorBanner message={error} /> : null}
        {data.map((evenement) => (
          <EvenementKaart key={evenement.id} evenement={evenement} />
        ))}
      </>
    );
  }

  return (
    <Screen gap={16} onRefresh={loading ? undefined : refresh} refreshing={refreshing}>
      <TabTitle>Evenementen</TabTitle>
      <ListRow
        variant="plain"
        icon="scan"
        title="Evenement toevoegen"
        subtitle="Scan een QR-code"
        onPress={() => router.push('/toevoegen')}
      />
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
