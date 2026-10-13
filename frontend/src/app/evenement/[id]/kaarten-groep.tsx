// Screen 11 — Kaart groep (KaartenGroep.dc.html): the one kaart you pay with from the groep saldo.

import { router, useLocalSearchParams } from 'expo-router';

import { KaartIntro, KaartSlot, laadKaartenScherm } from '@/components/kaarten/kaart-slot';
import {
  EmptyState,
  ErrorState,
  EvenementTabs,
  InfoNote,
  LoadingState,
  Screen,
  ScreenHeader,
} from '@/components/lagapay';
import { useApiData } from '@/hooks/use-api-data';

export default function KaartenGroepScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, loading, refreshing, reload, refresh } = useApiData(() => laadKaartenScherm(id), [id]);

  const kop = (subtitle?: string) => (
    <>
      <ScreenHeader title="Kaart" subtitle={subtitle} fallbackHref={`/evenement/${id}/groep`} />
      <EvenementTabs evenementId={id} pair="kaarten" active="groep" />
    </>
  );

  if (loading) {
    return (
      <Screen gap={22}>
        {kop()}
        <LoadingState />
      </Screen>
    );
  }
  if (!data) {
    return (
      <Screen gap={22}>
        {kop()}
        <ErrorState message={error ?? ''} onRetry={reload} />
      </Screen>
    );
  }

  const { evenement, kaarten } = data;
  const groep = kaarten.groep_info;
  const open = evenement.open;

  // README assumption 4: the groep kaart slot only exists when I'm in a groep for this evenement.
  if (!groep) {
    return (
      <Screen gap={22} onRefresh={refresh} refreshing={refreshing}>
        {kop(evenement.naam)}
        <EmptyState
          icon="user"
          title="Je zit niet in een groep"
          text={
            open
              ? 'Je zit bij dit evenement niet in een groep. Word lid via de uitnodigingslink van een groep om een groepskaart te koppelen.'
              : 'Je zat bij dit evenement niet in een groep.'
          }
        />
      </Screen>
    );
  }

  return (
    <Screen gap={22} onRefresh={refresh} refreshing={refreshing}>
      {kop(evenement.naam)}

      <KaartIntro>
        {open
          ? `Met deze kaart betaal je met het saldo van ${groep.naam}. Je kunt één kaart koppelen.`
          : `Met deze kaart betaalde je met het saldo van ${groep.naam}. Dit evenement is gesloten.`}
      </KaartIntro>

      <KaartSlot
        kaart={kaarten.groep}
        onKoppelen={open ? () => router.push(`/evenement/${id}/koppelen?soort=groep`) : undefined}
        leegTekst={
          open
            ? 'Gebruik je permanente kaart voor de groep.'
            : 'Bij een gesloten evenement kun je geen kaart meer koppelen.'
        }
      />

      <InfoNote>Je persoonlijke kaart blijft werken voor je eigen saldo. Beheer die op de tab Persoonlijk.</InfoNote>
    </Screen>
  );
}
