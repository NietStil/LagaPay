// Screens 10 + 12 — Kaart koppelen (KaartKoppelen.dc.html / KaartKoppelenGroep.dc.html).
// Params: id, terug = 'groep' when opened from the Groep page (back goes there), otherwise the Persoonlijk page.
// I have one kaart per evenement; it pays from my betaalbron (the Persoonlijk|Groep side I last switched to).
// The scan part (rings + "Scan je kaart") is only the design: reading NFC tags isn't built yet. Until then a kaart
// is linked by picking one of my persoonlijke kaarten from the list at the bottom.

import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, type Href } from 'expo-router';

import {
  EmptyState,
  ErrorBanner,
  ErrorState,
  Icon,
  IconBox,
  LoadingState,
  ScanRingen,
  Screen,
  ScreenHeader,
  SectionLabel,
  goBack,
  kleuren,
} from '@/components/lagapay';
import { useApiData } from '@/hooks/use-api-data';
import { foutmelding, getEvenementKaarten, getEvenementOverzicht, koppelPersoonlijkeKaart } from '@/lib/api/lagapay';
import type { Kaart } from '@/lib/api/types';
import { maskUid } from '@/lib/format';
import { meld } from '@/lib/melding';

/** The evenement (naam, open) plus my kaart. */
async function laad(evenementId: string) {
  const [overzicht, kaarten] = await Promise.all([getEvenementOverzicht(evenementId), getEvenementKaarten(evenementId)]);
  return { evenement: overzicht.evenement, kaarten };
}

export default function KoppelenScreen() {
  const params = useLocalSearchParams<{ id: string; terug?: string }>();
  const id = params.id;
  const terugHref: Href = params.terug === 'groep' ? `/evenement/${id}/groep` : `/evenement/${id}`;

  const { data, error, loading, reload } = useApiData(() => laad(id), [id]);
  /** Id of the kaart being linked. */
  const [bezig, setBezig] = useState<number | null>(null);
  const [fout, setFout] = useState<string | null>(null);

  const kop = (subtitle?: string) => (
    <ScreenHeader title="Kaart koppelen" subtitle={subtitle} fallbackHref={terugHref} />
  );

  if (!data) {
    return (
      <Screen gap={20}>
        {kop()}
        {loading ? <LoadingState /> : <ErrorState message={error ?? ''} onRetry={reload} />}
      </Screen>
    );
  }

  const { evenement, kaarten } = data;
  const persoonlijk = kaarten.persoonlijke_kaarten;
  const huidig = kaarten.kaart;

  const koppel = async (kaart: Kaart) => {
    if (bezig !== null) return;
    setBezig(kaart.id);
    setFout(null);
    try {
      await koppelPersoonlijkeKaart(id, kaart.id);
      meld('Kaart gekoppeld', `Bij ${evenement.naam} betaal je nu met ${maskUid(kaart.uid_laatste4)}.`);
      goBack(terugHref);
    } catch (err) {
      setFout(foutmelding(err));
      setBezig(null);
    }
  };

  let inhoud: ReactNode;
  if (!evenement.open) {
    inhoud = (
      <EmptyState
        icon="lock"
        title="Dit evenement is gesloten"
        text="Bij een gesloten evenement kun je geen kaart meer koppelen."
      />
    );
  } else {
    inhoud = (
      <>
        <View className="flex-1 items-center justify-center py-6">
          <ScanRingen />
          <Text className="mt-7 text-2xl font-bold tracking-[-0.4px] text-zinc-50">Scan je kaart</Text>
          <Text className="mt-2.5 px-6 text-center text-[15px] leading-[22px] text-zinc-400">
            Houd de kaart of polsband tegen de achterkant van je telefoon.
          </Text>
          {huidig ? (
            <Text className="mt-3 text-[13px] text-zinc-500">
              Huidige kaart: <Text className="font-mono">{maskUid(huidig.uid_laatste4)}</Text>
            </Text>
          ) : null}
        </View>

        {fout ? <ErrorBanner message={fout} /> : null}

        {persoonlijk.length > 0 ? (
          <View className="gap-4">
            <View className="flex-row items-center gap-3">
              <View className="h-px flex-1 bg-zinc-800" />
              <Text className="text-[13px] text-zinc-400">of</Text>
              <View className="h-px flex-1 bg-zinc-800" />
            </View>
            <View>
              <SectionLabel>Je persoonlijke kaarten</SectionLabel>
              <View className="gap-2.5">
                {persoonlijk.map((kaart) => (
                  <PersoonlijkeKaartOptie
                    key={kaart.id}
                    kaart={kaart}
                    gekoppeld={huidig?.id === kaart.id}
                    bezig={bezig === kaart.id}
                    uit={bezig !== null}
                    onPress={() => koppel(kaart)}
                  />
                ))}
              </View>
            </View>
          </View>
        ) : null}
      </>
    );
  }

  return (
    <Screen gap={20}>
      {kop(evenement.naam)}
      {inhoud}
    </Screen>
  );
}

interface PersoonlijkeKaartOptieProps {
  kaart: Kaart;
  /** This kaart already is my kaart of this evenement. */
  gekoppeld: boolean;
  /** This kaart is being linked. */
  bezig: boolean;
  /** Some kaart is being linked: all rows are disabled. */
  uit: boolean;
  onPress: () => void;
}

/** One persoonlijke kaart to link (design: radius 18, zinc-700 border, accent kaart icon, chevron). */
function PersoonlijkeKaartOptie({ kaart, gekoppeld, bezig, uit, onPress }: PersoonlijkeKaartOptieProps) {
  const disabled = gekoppeld || uit;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`Koppel persoonlijke kaart ${maskUid(kaart.uid_laatste4)}${gekoppeld ? ', al gekoppeld' : ''}`}
      accessibilityState={{ disabled, busy: bezig }}
      className={`flex-row items-center gap-3.5 rounded-[18px] border border-zinc-700 bg-zinc-900 px-4 py-3.5 ${
        disabled ? '' : 'active:opacity-80'
      }`}
    >
      <IconBox icon="card" variant="accent" size={44} />
      <View className="min-w-0 flex-1">
        <Text numberOfLines={2} className="text-[15px] font-semibold text-zinc-50">
          Persoonlijke kaart
        </Text>
        <Text numberOfLines={1} className="mt-0.5 font-mono text-xs text-zinc-400">
          {maskUid(kaart.uid_laatste4)}
        </Text>
      </View>
      {bezig ? (
        <ActivityIndicator size="small" color={kleuren.purple300} />
      ) : gekoppeld ? (
        <View className="flex-row items-center gap-1.5">
          <Icon name="check" size={16} color={kleuren.emerald300} />
          <Text className="text-[13px] font-semibold text-emerald-300">Al gekoppeld</Text>
        </View>
      ) : (
        <Icon name="chevron-right" size={18} color={kleuren.zinc400} />
      )}
    </Pressable>
  );
}
