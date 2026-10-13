// Screen 9 — Kaart persoonlijk (EvenementKaarten.dc.html): the one kaart you pay with from your own saldo.

import { router, useLocalSearchParams } from 'expo-router';

import { KaartIntro, KaartSlot, laadKaartenScherm } from '@/components/kaarten/kaart-slot';
import { ErrorState, EvenementTabs, InfoNote, LoadingState, Screen, ScreenHeader } from '@/components/lagapay';
import { useApiData } from '@/hooks/use-api-data';
import { maskUid } from '@/lib/format';

export default function KaartenScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, loading, refreshing, reload, refresh } = useApiData(() => laadKaartenScherm(id), [id]);

  const kop = (subtitle?: string) => (
    <>
      <ScreenHeader title="Kaart" subtitle={subtitle} fallbackHref={`/evenement/${id}`} />
      <EvenementTabs evenementId={id} pair="kaarten" active="persoonlijk" />
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
  const kaart = kaarten.persoonlijk;
  const permanent = kaarten.permanente_kaart;
  const open = evenement.open;

  return (
    <Screen gap={22} onRefresh={refresh} refreshing={refreshing}>
      {kop(evenement.naam)}

      <KaartIntro>
        {open
          ? 'Met deze kaart betaal je met je eigen saldo. Je kunt één kaart koppelen.'
          : 'Met deze kaart betaalde je met je eigen saldo. Dit evenement is gesloten.'}
      </KaartIntro>

      <KaartSlot
        kaart={kaart}
        onKoppelen={open ? () => router.push(`/evenement/${id}/koppelen?soort=persoonlijk`) : undefined}
        leegTekst={
          open
            ? 'Een kaart die je bij het evenement krijgt, verschijnt hier vanzelf.'
            : 'Bij een gesloten evenement kun je geen kaart meer koppelen.'
        }
      />

      {open && permanent && permanent.id !== kaart?.id ? (
        <InfoNote>
          {`Je kunt ook je permanente kaart (${maskUid(permanent.uid_laatste4)}) gebruiken. Kies die bij het koppelen.`}
        </InfoNote>
      ) : null}
    </Screen>
  );
}
