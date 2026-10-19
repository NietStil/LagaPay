// Screens 10 + 12 — Kaart koppelen (KaartKoppelen.dc.html / KaartKoppelenGroep.dc.html).
// Params: id, soort = 'persoonlijk' (default) | 'groep'. Opened from "Kaarten" on the Persoonlijk page and from
// "Groepskaart" on the Groep page.
// The scan part (rings + "Scan je kaart") is only the design: reading NFC tags isn't built yet. Until then the
// slot is filled with "Gebruik mijn permanente kaart".

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, type Href } from 'expo-router';

import {
  EmptyState,
  ErrorBanner,
  ErrorState,
  Icon,
  IconBox,
  LoadingState,
  Pill,
  Screen,
  ScreenHeader,
  goBack,
  kleuren,
} from '@/components/lagapay';
import { useApiData } from '@/hooks/use-api-data';
import { foutmelding, getEvenementKaarten, getEvenementOverzicht, koppelPermanenteKaart } from '@/lib/api/lagapay';
import type { Kaart, KaartSoort } from '@/lib/api/types';
import { maskUid } from '@/lib/format';
import { meld } from '@/lib/melding';

/** The evenement (naam, open) plus my kaart slots. */
async function laad(evenementId: string) {
  const [overzicht, kaarten] = await Promise.all([getEvenementOverzicht(evenementId), getEvenementKaarten(evenementId)]);
  return { evenement: overzicht.evenement, kaarten };
}

export default function KoppelenScreen() {
  const params = useLocalSearchParams<{ id: string; soort?: string }>();
  const id = params.id;
  const soort: KaartSoort = params.soort === 'groep' ? 'groep' : 'persoonlijk';
  const terugHref: Href = soort === 'groep' ? `/evenement/${id}/groep` : `/evenement/${id}`;

  const { data, error, loading, reload } = useApiData(() => laad(id), [id]);
  const [bezig, setBezig] = useState(false);
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
  const groep = kaarten.groep_info;
  const permanent = kaarten.permanente_kaart;
  const huidig = soort === 'groep' ? kaarten.groep : kaarten.persoonlijk;
  const voorLabel = soort === 'groep' ? (groep ? `Voor: Groep · ${groep.naam}` : 'Voor: Groep') : 'Voor: Persoonlijk';

  const koppel = async () => {
    if (bezig) return;
    setBezig(true);
    setFout(null);
    try {
      await koppelPermanenteKaart(id, soort);
      meld(
        'Kaart gekoppeld',
        soort === 'groep' && groep
          ? `Met je permanente kaart betaal je nu met het saldo van ${groep.naam}.`
          : 'Met je permanente kaart betaal je nu met je eigen saldo.',
      );
      goBack(terugHref);
    } catch (err) {
      setFout(foutmelding(err));
      setBezig(false);
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
  } else if (soort === 'groep' && !groep) {
    inhoud = (
      <EmptyState
        icon="user"
        title="Je zit niet in een groep"
        text="Word lid via de uitnodigingslink van een groep om een groepskaart te koppelen."
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

        {permanent ? (
          <View className="gap-4">
            <View className="flex-row items-center gap-3">
              <View className="h-px flex-1 bg-zinc-800" />
              <Text className="text-[13px] text-zinc-400">of</Text>
              <View className="h-px flex-1 bg-zinc-800" />
            </View>
            <PermanenteKaartOptie kaart={permanent} gekoppeld={huidig?.id === permanent.id} bezig={bezig} onPress={koppel} />
          </View>
        ) : null}
      </>
    );
  }

  return (
    <Screen gap={20}>
      {kop(evenement.naam)}
      <Pill label={voorLabel} tone="accent" size="md" />
      {inhoud}
    </Screen>
  );
}

/** Design: three purple rings around a purple-700 circle with the NFC icon; the rings pulse slowly. */
function ScanRingen() {
  const puls = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animatie = Animated.loop(
      Animated.sequence([
        Animated.timing(puls, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(puls, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    animatie.start();
    return () => animatie.stop();
  }, [puls]);

  // The outer rings breathe a little more than the inner one.
  const ring = (grootte: number, kleur: string, schaal: number) => (
    <Animated.View
      style={{
        position: 'absolute',
        width: grootte,
        height: grootte,
        borderRadius: grootte / 2,
        backgroundColor: kleur,
        transform: [{ scale: puls.interpolate({ inputRange: [0, 1], outputRange: [1, schaal] }) }],
        opacity: puls.interpolate({ inputRange: [0, 1], outputRange: [1, 0.75] }),
      }}
    />
  );

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="Klaar om je kaart te scannen"
      className="h-[260px] w-[260px] items-center justify-center"
    >
      {ring(260, '#1a0b2e', 1.04)}
      {ring(200, '#2e1065', 1.06)}
      {ring(136, '#4c1d95', 1.08)}
      <View className="h-[84px] w-[84px] items-center justify-center rounded-full bg-purple-700">
        <Icon name="nfc" size={40} color="#ffffff" />
      </View>
    </View>
  );
}

interface PermanenteKaartOptieProps {
  kaart: Kaart;
  /** The permanente kaart already is the kaart of this slot. */
  gekoppeld: boolean;
  bezig: boolean;
  onPress: () => void;
}

/** "Gebruik mijn permanente kaart" row (design: radius 18, zinc-700 border, accent kaart icon, chevron). */
function PermanenteKaartOptie({ kaart, gekoppeld, bezig, onPress }: PermanenteKaartOptieProps) {
  const uit = gekoppeld || bezig;
  return (
    <Pressable
      onPress={onPress}
      disabled={uit}
      accessibilityRole="button"
      accessibilityLabel={`Gebruik mijn permanente kaart, ${maskUid(kaart.uid_laatste4)}${gekoppeld ? ', al gekoppeld' : ''}`}
      accessibilityState={{ disabled: uit, busy: bezig }}
      className={`flex-row items-center gap-3.5 rounded-[18px] border border-zinc-700 bg-zinc-900 px-4 py-3.5 ${
        uit ? '' : 'active:opacity-80'
      }`}
    >
      <IconBox icon="card" variant="accent" size={44} />
      <View className="min-w-0 flex-1">
        <Text numberOfLines={2} className="text-[15px] font-semibold text-zinc-50">
          Gebruik mijn permanente kaart
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
