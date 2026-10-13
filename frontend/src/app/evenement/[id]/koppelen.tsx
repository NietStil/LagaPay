// Screens 10 + 12 — Kaart koppelen (KaartKoppelen.dc.html / KaartKoppelenGroep.dc.html).
// Params: id, soort = 'persoonlijk' (default) | 'groep'.
// NFC is out of scope, so the "Scan je kaart" part of the design is left out: the only way to fill the
// slot from the app is "Gebruik mijn permanente kaart".

import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, type Href } from 'expo-router';

import { KaartIntro, laadKaartenScherm } from '@/components/kaarten/kaart-slot';
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
import { foutmelding, koppelPermanenteKaart } from '@/lib/api/lagapay';
import type { Kaart, KaartSoort } from '@/lib/api/types';
import { maskUid } from '@/lib/format';
import { meld } from '@/lib/melding';

export default function KoppelenScreen() {
  const params = useLocalSearchParams<{ id: string; soort?: string }>();
  const id = params.id;
  const soort: KaartSoort = params.soort === 'groep' ? 'groep' : 'persoonlijk';
  const terugHref: Href = soort === 'groep' ? `/evenement/${id}/kaarten-groep` : `/evenement/${id}/kaarten`;

  const { data, error, loading, reload } = useApiData(() => laadKaartenScherm(id), [id]);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  const kop = (subtitle?: string) => (
    <ScreenHeader title="Kaart koppelen" subtitle={subtitle} fallbackHref={terugHref} />
  );

  if (loading) {
    return (
      <Screen gap={20}>
        {kop()}
        <LoadingState />
      </Screen>
    );
  }
  if (!data) {
    return (
      <Screen gap={20}>
        {kop()}
        <ErrorState message={error ?? ''} onRetry={reload} />
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
  } else if (!permanent) {
    inhoud = (
      <EmptyState
        icon="card"
        title="Je hebt nog geen permanente kaart"
        text={
          soort === 'persoonlijk'
            ? 'Een kaart scannen kan nog niet in de app. Krijg je een kaart bij het evenement, dan wordt die vanzelf je persoonlijke kaart.'
            : 'Een kaart scannen kan nog niet in de app. Zonder permanente kaart kun je hier nog geen groepskaart koppelen.'
        }
      />
    );
  } else {
    const gekoppeld = huidig?.id === permanent.id;
    const vervangt = huidig && !gekoppeld ? ` Dit vervangt je huidige kaart (${maskUid(huidig.uid_laatste4)}).` : '';
    inhoud = (
      <>
        <KaartIntro>
          {(soort === 'groep' && groep
            ? `Koppel je permanente kaart om met het saldo van ${groep.naam} te betalen.`
            : 'Koppel je permanente kaart om met je eigen saldo te betalen.') + vervangt}
        </KaartIntro>
        <PermanenteKaartOptie kaart={permanent} gekoppeld={gekoppeld} bezig={bezig} onPress={koppel} />
        {fout ? <ErrorBanner message={fout} /> : null}
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
