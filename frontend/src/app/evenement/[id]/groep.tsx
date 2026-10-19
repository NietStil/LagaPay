// Screens 6 + 8: evenement Groep (Groep.dc.html when open, GroepGesloten.dc.html when gesloten).

import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { EvenementKop, GeenTerugstortNotitie, TerugstortKnop } from '@/components/evenement/onderdelen';
import { Uitnodigingslink } from '@/components/evenement/uitnodigingslink';
import {
  Avatar,
  Button,
  Card,
  EmptyState,
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
import { getEvenementOverzicht, getGroep } from '@/lib/api/lagapay';
import type { GroepDetail, GroepLid, Kaart, KaartStatus, Transactie } from '@/lib/api/types';
import { formatMunten, formatTijd, maskUid } from '@/lib/format';

const KAART_STATUS: Record<KaartStatus, string> = {
  actief: 'Actief',
  verlopen: 'Verlopen',
  inactief: 'Inactief',
};

const groepMeta = (t: Transactie) =>
  t.gebruiker ? `${formatTijd(t.datum)} · ${t.gebruiker.voornaam}` : formatTijd(t.datum);

export default function EvenementGroepScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, loading, refreshing, reload, refresh } = useApiData(
    () => Promise.all([getEvenementOverzicht(id), getGroep(id)]),
    [id],
  );

  if (!data) {
    return (
      <Screen>
        <EvenementKop evenementId={id} actief="groep" />
        {loading ? <LoadingState /> : <ErrorState message={error ?? ''} onRetry={reload} />}
      </Screen>
    );
  }

  const [{ evenement }, groep] = data;

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <EvenementKop evenementId={id} evenement={evenement} actief="groep" />
      {error ? <ErrorBanner message={error} /> : null}

      {!groep ? (
        <GeenGroep evenementId={id} open={evenement.open} />
      ) : evenement.open ? (
        <GroepOpen evenementId={id} groep={groep} />
      ) : (
        <GroepGesloten groep={groep} terugstorten={evenement.munten_terugstorten} />
      )}
    </Screen>
  );
}

// ---------------------------------------------------------------------------------------------
// States

function GeenGroep({ evenementId, open }: { evenementId: string; open: boolean }) {
  if (!open) {
    return <EmptyState icon="user" title="Geen groep" text="Je zat bij dit evenement niet in een groep." />;
  }
  return (
    <EmptyState
      icon="user"
      title="Je zit nog niet in een groep"
      text="Maak zelf een groep aan en nodig je vrienden uit, of word lid via de uitnodigingslink of QR-code van een groep."
      action={
        <View className="gap-2">
          <Button
            title="Groep aanmaken"
            icon="plus"
            onPress={() => router.push(`/evenement/${evenementId}/groep-aanmaken`)}
          />
          <Button title="QR-code scannen" icon="scan" variant="secondary" onPress={() => router.push('/toevoegen')} />
        </View>
      }
    />
  );
}

function GroepOpen({ evenementId, groep }: { evenementId: string; groep: GroepDetail }) {
  return (
    <>
      <HeroCard label={groep.naam} amount={formatMunten(groep.saldo)}>
        <HeroButton
          title="Opwaarderen"
          icon="plus"
          onPress={() => router.push(`/evenement/${evenementId}/opwaarderen?voor=groep`)}
        />
      </HeroCard>

      <Uitnodigingslink
        link={groep.uitnodigingslink}
        titel={groep.naam}
        omschrijving="Laat deze QR-code scannen in de LagaPay app om lid te worden van de groep."
      />

      <ListRow
        icon="card"
        title="Kaart"
        subtitle={kaartOmschrijving(groep.kaart)}
        onPress={() => router.push(`/evenement/${evenementId}/koppelen?soort=groep`)}
      />

      {groep.leden.length > 0 ? (
        <View>
          <SectionLabel>Leden · munten gekocht</SectionLabel>
          <LedenLijst leden={groep.leden} />
        </View>
      ) : null}

      <View>
        <SectionLabel spacing={14}>Groepsactiviteit</SectionLabel>
        <Timeline items={groep.activiteit} meta={groepMeta} emptyText="Nog geen activiteit in deze groep." />
      </View>
    </>
  );
}

function GroepGesloten({ groep, terugstorten }: { groep: GroepDetail; terugstorten: boolean }) {
  return (
    <>
      <HeroCard
        variant="muted"
        label={`${groep.naam} · jouw aandeel`}
        amount={formatMunten(groep.mijn_aandeel)}
        caption={`van ${formatMunten(groep.saldo)} in de groep`}
      >
        {!terugstorten ? (
          <GeenTerugstortNotitie />
        ) : groep.mijn_aandeel > 0 ? (
          <TerugstortKnop title="Aandeel terugstorten" notitie="Je aandeel gaat terug naar je bankkaart." />
        ) : null}
      </HeroCard>

      <View>
        <SectionLabel right="Gekocht · aandeel">Leden</SectionLabel>
        <LedenLijst leden={groep.leden} metAandeel />
        <Text className="mt-2.5 text-xs leading-[18px] text-zinc-400">
          Het groepssaldo wordt verdeeld naar hoeveel munten ieder lid heeft gekocht.
        </Text>
      </View>
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// Parts

function kaartOmschrijving(kaart: Kaart | null): string {
  if (!kaart) return 'Nog niet gekoppeld';
  return `${maskUid(kaart.uid_laatste4)} · ${KAART_STATUS[kaart.status]}`;
}

/** Leden in a divided card. Open: "munten gekocht" on the right; gesloten (`metAandeel`): "gekocht · aandeel". */
function LedenLijst({ leden, metAandeel = false }: { leden: GroepLid[]; metAandeel?: boolean }) {
  return (
    <Card className="overflow-hidden">
      {leden.map((lid, i) => (
        <ListRow
          key={lid.id}
          variant="inset"
          last={i === leden.length - 1}
          leading={<Avatar initialen={lid.initialen} highlighted={lid.is_ik} />}
          title={lid.naam}
          subtitle={lid.is_ik ? 'Jij' : undefined}
          right={
            metAandeel ? (
              <Text className="text-sm text-zinc-400">
                {lid.munten_gekocht} · <Text className="font-bold text-zinc-50">{lid.aandeel}</Text>
              </Text>
            ) : (
              <Text className="text-[15px] font-bold text-zinc-50">{lid.munten_gekocht}</Text>
            )
          }
        />
      ))}
    </Card>
  );
}
