// Screens 5 + 7: evenement Persoonlijk (Overzicht.dc.html when open, OverzichtGesloten.dc.html when gesloten).

import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { EvenementKop, GeenTerugstortNotitie, TerugstortKnop } from '@/components/evenement/onderdelen';
import {
  ErrorBanner,
  ErrorState,
  HeroButton,
  HeroCard,
  ListRow,
  LoadingState,
  Screen,
  SectionLabel,
  Timeline,
} from '@/components/lagapay';
import { useApiData } from '@/hooks/use-api-data';
import { getEvenementOverzicht } from '@/lib/api/lagapay';
import type { Transactie } from '@/lib/api/types';
import { formatDagTijd, formatMunten } from '@/lib/format';

const dagTijdMeta = (t: Transactie) => formatDagTijd(t.datum);

export default function EvenementOverzichtScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, loading, refreshing, reload, refresh } = useApiData(() => getEvenementOverzicht(id), [id]);

  if (!data) {
    return (
      <Screen>
        <EvenementKop evenementId={id} actief="persoonlijk" />
        {loading ? <LoadingState /> : <ErrorState message={error ?? ''} onRetry={reload} />}
      </Screen>
    );
  }

  const { evenement, saldo, activiteit } = data;

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <EvenementKop evenementId={id} evenement={evenement} actief="persoonlijk" />
      {error ? <ErrorBanner message={error} /> : null}

      {evenement.open ? (
        <>
          <HeroCard amount={formatMunten(saldo)}>
            <HeroButton
              title="Opwaarderen"
              icon="plus"
              onPress={() => router.push(`/evenement/${id}/opwaarderen?voor=persoonlijk`)}
            />
          </HeroCard>
          {/* Betalen (NFC) is out of scope, so Kaarten is the only entry: a full-width row instead of a 2-column grid. */}
          <ListRow
            icon="card"
            title="Kaarten"
            subtitle="Je kaart voor dit evenement"
            onPress={() => router.push(`/evenement/${id}/kaarten`)}
          />
        </>
      ) : (
        <HeroCard variant="muted" amount={formatMunten(saldo)}>
          {!evenement.munten_terugstorten ? (
            <GeenTerugstortNotitie />
          ) : saldo > 0 ? (
            <TerugstortKnop title="Munten terugstorten" notitie="Alle munten gaan terug naar je bankkaart." />
          ) : null}
        </HeroCard>
      )}

      <View className="mt-1">
        <SectionLabel
          spacing={14}
          action={
            activiteit.length > 0
              ? { label: 'Alles bekijken', onPress: () => router.push(`/evenement/${id}/transacties`) }
              : undefined
          }
        >
          Activiteit
        </SectionLabel>
        <Timeline
          items={activiteit}
          meta={evenement.open ? undefined : dagTijdMeta}
          emptyText="Nog geen activiteit bij dit evenement."
        />
      </View>
    </Screen>
  );
}
