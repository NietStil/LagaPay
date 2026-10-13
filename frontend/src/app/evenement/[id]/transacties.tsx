// Screen 16: Transacties (Transacties.dc.html). Full persoonlijke history per day, with filter chips.

import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { EmptyState, ErrorState, LoadingState, Screen, ScreenHeader, Timeline } from '@/components/lagapay';
import { useApiData } from '@/hooks/use-api-data';
import { getEvenementOverzicht, getTransacties } from '@/lib/api/lagapay';
import type { TransactieFilter } from '@/lib/api/types';
import { groepeerPerDag } from '@/lib/format';

const FILTERS: { value: TransactieFilter; label: string; leegTitel: string; leegTekst: string }[] = [
  {
    value: 'alles',
    label: 'Alles',
    leegTitel: 'Nog geen transacties',
    leegTekst: 'Je opwaarderingen en uitgaven bij dit evenement komen hier te staan.',
  },
  {
    value: 'opwaarderingen',
    label: 'Opwaarderingen',
    leegTitel: 'Geen opwaarderingen',
    leegTekst: 'Munten die je opwaardeert of bij een ticket krijgt, komen hier te staan.',
  },
  {
    value: 'uitgaven',
    label: 'Uitgaven',
    leegTitel: 'Geen uitgaven',
    leegTekst: 'Betalingen met je munten komen hier te staan.',
  },
];

export default function TransactiesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [filter, setFilter] = useState<TransactieFilter>('alles');

  // Only for the evenement naam in the header.
  const kop = useApiData(() => getEvenementOverzicht(id), [id]);
  const lijst = useApiData(() => getTransacties(id, filter), [id, filter]);

  const huidig = FILTERS.find((f) => f.value === filter) ?? FILTERS[0];

  const vernieuw = () => {
    lijst.refresh();
    if (!kop.data) kop.reload();
  };

  let inhoud;
  if (lijst.loading) {
    inhoud = <LoadingState />;
  } else if (!lijst.data) {
    inhoud = <ErrorState message={lijst.error ?? ''} onRetry={lijst.reload} />;
  } else if (lijst.data.length === 0) {
    inhoud = <EmptyState icon="card" title={huidig.leegTitel} text={huidig.leegTekst} />;
  } else {
    inhoud = (
      <View className="mt-1">
        <Timeline sections={groepeerPerDag(lijst.data)} />
      </View>
    );
  }

  return (
    <Screen onRefresh={lijst.data ? vernieuw : undefined} refreshing={lijst.refreshing}>
      <ScreenHeader title="Transacties" subtitle={kop.data?.evenement.naam} fallbackHref={`/evenement/${id}`} />
      <FilterChips value={filter} onChange={setFilter} />
      {inhoud}
    </Screen>
  );
}

function FilterChips({ value, onChange }: { value: TransactieFilter; onChange: (filter: TransactieFilter) => void }) {
  return (
    <View accessibilityRole="tablist" className="flex-row flex-wrap gap-2">
      {FILTERS.map((f) => {
        const actief = f.value === value;
        return (
          <Pressable
            key={f.value}
            onPress={() => {
              if (!actief) onChange(f.value);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: actief }}
            className={`rounded-xl border px-3.5 py-2 ${
              actief ? 'border-purple-800 bg-purple-950' : 'border-zinc-800 bg-zinc-900 active:opacity-70'
            }`}
          >
            <Text className={`text-[13px] font-semibold ${actief ? 'text-purple-200' : 'text-zinc-400'}`}>
              {f.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
