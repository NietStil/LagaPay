// Pieces shared by the evenement Persoonlijk and Groep pages (src/app/evenement/[id]/index.tsx and groep.tsx).

import { Text, View } from 'react-native';
import { router } from 'expo-router';

import {
  Button,
  EvenementTabs,
  Icon,
  ListRow,
  ScreenHeader,
  StatusPill,
  kleuren,
  type PersoonlijkGroep,
} from '@/components/lagapay';
import type { EvenementBasis, Kaart, KaartStatus } from '@/lib/api/types';
import { formatDatumBereik, maskUid } from '@/lib/format';
import { nietBeschikbaar } from '@/lib/melding';

export interface EvenementKopProps {
  evenementId: string;
  /** Leave out while loading, after an error or while redirecting to Groep: only the back button is shown. */
  evenement?: EvenementBasis;
  actief: PersoonlijkGroep;
  /** My kaart of this evenement (null = none linked). The Kaart row shows once the evenement is loaded and open. */
  kaart?: Kaart | null;
}

const KAART_STATUS: Record<KaartStatus, string> = {
  actief: 'Actief',
  verlopen: 'Verlopen',
  inactief: 'Inactief',
};

function kaartOmschrijving(kaart: Kaart | null): string {
  if (!kaart) return 'Nog niet gekoppeld';
  return `${maskUid(kaart.uid_laatste4)} · ${KAART_STATUS[kaart.status]}`;
}

/**
 * Header (naam, datums, Open/Gesloten pill), my Kaart row (one kaart per evenement, so above the tabs) and the
 * Persoonlijk | Groep tabs. Without `evenement` (loading, error, or still finding out whether the evenement opens
 * on Persoonlijk or Groep) only the back button shows, so the tabs never flip from Persoonlijk to Groep.
 */
export function EvenementKop({ evenementId, evenement, actief, kaart }: EvenementKopProps) {
  const terug = actief === 'groep' ? '?terug=groep' : '';

  if (!evenement) {
    return <ScreenHeader backLabel="Terug naar evenementen" />;
  }

  return (
    <>
      <ScreenHeader
        title={evenement.naam}
        subtitle={formatDatumBereik(evenement.start_datum, evenement.eind_datum)}
        right={<StatusPill status={evenement.open ? 'open' : 'gesloten'} />}
        backLabel="Terug naar evenementen"
      />
      {evenement.open && kaart !== undefined ? (
        <ListRow
          icon="card"
          title="Kaart"
          subtitle={kaartOmschrijving(kaart)}
          onPress={() => router.push(`/evenement/${evenementId}/koppelen${terug}`)}
        />
      ) : null}
      <EvenementTabs evenementId={evenementId} pair="overzicht" active={actief} />
    </>
  );
}

export interface TerugstortKnopProps {
  /** Button label, e.g. "Munten terugstorten". Also the subject of the "nog niet beschikbaar" message. */
  title: string;
  /** Small centered line under the button. */
  notitie: string;
}

/** "Munten terugstorten" / "Aandeel terugstorten" inside the muted HeroCard of a gesloten evenement. */
export function TerugstortKnop({ title, notitie }: TerugstortKnopProps) {
  return (
    <View>
      <Button title={title} size="lg" onPress={() => nietBeschikbaar(title)} />
      <Text className="mt-2.5 text-center text-xs text-zinc-400">{notitie}</Text>
    </View>
  );
}

/** Shown in the HeroCard of a gesloten evenement that doesn't have `munten_terugstorten`. */
export function GeenTerugstortNotitie() {
  return (
    <View className="flex-row items-center gap-2">
      <Icon name="info" size={16} color={kleuren.zinc400} />
      <Text className="flex-1 text-[13px] text-zinc-400">Dit evenement stort geen munten terug.</Text>
    </View>
  );
}
