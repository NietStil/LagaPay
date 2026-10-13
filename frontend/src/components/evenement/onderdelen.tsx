// Pieces shared by the evenement Persoonlijk and Groep pages (src/app/evenement/[id]/index.tsx and groep.tsx).

import { Text, View } from 'react-native';

import {
  Button,
  EvenementTabs,
  Icon,
  ScreenHeader,
  StatusPill,
  kleuren,
  type PersoonlijkGroep,
} from '@/components/lagapay';
import type { EvenementBasis } from '@/lib/api/types';
import { formatDatumBereik } from '@/lib/format';
import { nietBeschikbaar } from '@/lib/melding';

export interface EvenementKopProps {
  evenementId: string;
  /** Leave out while loading (or after an error): only the back button and the tabs are shown. */
  evenement?: EvenementBasis;
  actief: PersoonlijkGroep;
}

/** Header (naam, datums, Open/Gesloten pill) plus the Persoonlijk | Groep tabs. */
export function EvenementKop({ evenementId, evenement, actief }: EvenementKopProps) {
  return (
    <>
      <ScreenHeader
        title={evenement?.naam}
        subtitle={evenement ? formatDatumBereik(evenement.start_datum, evenement.eind_datum) : undefined}
        right={evenement ? <StatusPill status={evenement.open ? 'open' : 'gesloten'} /> : undefined}
        backLabel="Terug naar evenementen"
      />
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
