// Screen 14 — Opwaarderen (Opwaarderen.dc.html): choose how many munten to buy.
// Params: id, voor = 'persoonlijk' (default) | 'groep'. Until Mollie exists this is a test betaling:
// the munten are added straight away, without paying.

import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, type Href } from 'expo-router';

import {
  Button,
  EmptyState,
  ErrorBanner,
  ErrorState,
  Icon,
  InfoNote,
  LoadingState,
  Screen,
  ScreenHeader,
  goBack,
  kleuren,
  type IconName,
  type PersoonlijkGroep,
} from '@/components/lagapay';
import { useApiData } from '@/hooks/use-api-data';
import { foutmelding, getEvenementOverzicht, opwaarderen } from '@/lib/api/lagapay';
import { formatEuro, formatMunten } from '@/lib/format';
import { meld } from '@/lib/melding';

const VASTE_AANTALLEN = [5, 10, 20, 50];
const STANDAARD_AANTAL = 20;
const MIN_AANTAL = 1;
const MAX_AANTAL = 500;

export default function OpwaarderenScreen() {
  const params = useLocalSearchParams<{ id: string; voor?: string }>();
  const id = params.id;
  const voor: PersoonlijkGroep = params.voor === 'groep' ? 'groep' : 'persoonlijk';
  const terugHref: Href = voor === 'groep' ? `/evenement/${id}/groep` : `/evenement/${id}`;

  const { data, error, loading, refreshing, reload, refresh } = useApiData(() => getEvenementOverzicht(id), [id]);
  const [aantal, setAantal] = useState(STANDAARD_AANTAL);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  const kop = (subtitle?: string) => (
    <ScreenHeader title="Opwaarderen" subtitle={subtitle} fallbackHref={terugHref} />
  );

  if (loading) {
    return (
      <Screen gap={28}>
        {kop()}
        <LoadingState />
      </Screen>
    );
  }
  if (!data) {
    return (
      <Screen gap={28}>
        {kop()}
        <ErrorState message={error ?? ''} onRetry={reload} />
      </Screen>
    );
  }

  const { evenement, groep } = data;
  const subtitle = voor === 'groep' && groep ? `${evenement.naam} · ${groep.naam}` : evenement.naam;

  if (!evenement.open) {
    return (
      <Screen gap={28} onRefresh={refresh} refreshing={refreshing}>
        {kop(subtitle)}
        <EmptyState
          icon="lock"
          title="Opwaarderen kan niet meer"
          text="Dit evenement is gesloten, dus je kunt geen munten meer kopen."
        />
      </Screen>
    );
  }
  if (voor === 'groep' && !groep) {
    return (
      <Screen gap={28} onRefresh={refresh} refreshing={refreshing}>
        {kop(subtitle)}
        <EmptyState
          icon="user"
          title="Je zit niet in een groep"
          text="Je kunt alleen een groepssaldo opwaarderen als je in een groep van dit evenement zit."
        />
      </Screen>
    );
  }

  // Work in cents so 3 × € 1,10 doesn't become € 3,3000000000000003.
  const muntPrijsCenten = Math.round(Number(evenement.munt_prijs) * 100);
  const prijs = (n: number) => formatEuro((n * muntPrijsCenten) / 100);
  const zetAantal = (n: number) => setAantal(Math.min(MAX_AANTAL, Math.max(MIN_AANTAL, n)));

  const betaal = async () => {
    setBezig(true);
    setFout(null);
    try {
      await opwaarderen(id, aantal, voor);
      meld(`${formatMunten(aantal)} toegevoegd`, 'Testmodus: er is nog niet echt betaald.');
      goBack(terugHref);
    } catch (err) {
      setFout(foutmelding(err, 'Opwaarderen lukt niet. Probeer het opnieuw.'));
      setBezig(false);
    }
  };

  return (
    <Screen
      gap={28}
      onRefresh={refresh}
      refreshing={refreshing}
      footer={
        <Button title={`Opwaarderen · ${prijs(aantal)}`} size="lg" loading={bezig} onPress={() => void betaal()} />
      }
    >
      {kop(subtitle)}

      {fout ? <ErrorBanner message={fout} /> : null}

      <View className="items-center pt-3" accessibilityLiveRegion="polite">
        <Text
          adjustsFontSizeToFit
          numberOfLines={1}
          className="text-center text-[96px] font-extrabold leading-[96px] tracking-[-3px] text-zinc-50"
        >
          {aantal}
        </Text>
        <Text className="mt-2 text-lg font-semibold text-purple-300">{aantal === 1 ? 'munt' : 'munten'}</Text>
      </View>

      <View className="flex-row gap-2.5">
        {VASTE_AANTALLEN.map((n) => {
          const gekozen = n === aantal;
          return (
            <Pressable
              key={n}
              onPress={() => zetAantal(n)}
              accessibilityRole="button"
              accessibilityLabel={`${n} munten, ${prijs(n)}`}
              accessibilityState={{ selected: gekozen }}
              className={`min-w-0 flex-1 items-center gap-1 rounded-2xl pb-3 pt-3.5 ${
                gekozen ? 'border-[1.5px] border-purple-700 bg-purple-950' : 'border border-zinc-800 bg-zinc-900 active:opacity-80'
              }`}
            >
              <Text className={`text-xl font-bold ${gekozen ? 'text-white' : 'text-zinc-50'}`}>{n}</Text>
              <Text numberOfLines={1} className={`text-[11px] ${gekozen ? 'text-purple-200' : 'text-zinc-400'}`}>
                {prijs(n)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="-mt-2 flex-row items-center justify-center gap-4">
        <StapKnop
          icon="minus"
          label="Eén munt minder"
          disabled={aantal <= MIN_AANTAL}
          onPress={() => zetAantal(aantal - 1)}
        />
        <Text className="text-[13px] text-zinc-400">Of stel zelf een aantal in</Text>
        <StapKnop
          icon="plus"
          label="Eén munt meer"
          disabled={aantal >= MAX_AANTAL}
          onPress={() => zetAantal(aantal + 1)}
        />
      </View>

      <InfoNote icon="info">
        Testmodus: er wordt nog niet echt betaald. De munten worden meteen aan je saldo toegevoegd.
      </InfoNote>
    </Screen>
  );
}

interface StapKnopProps {
  icon: IconName;
  label: string;
  disabled: boolean;
  onPress: () => void;
}

/** 44x44 minus/plus button of the custom amount stepper. */
function StapKnop({ icon, label, disabled, onPress }: StapKnopProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      hitSlop={4}
      className={`h-11 w-11 items-center justify-center rounded-[14px] border border-zinc-700 bg-zinc-900 ${
        disabled ? 'opacity-40' : 'active:opacity-70'
      }`}
    >
      <Icon name={icon} size={20} color={kleuren.zinc50} />
    </Pressable>
  );
}
