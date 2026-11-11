// Bar terminal — Afrekenen: the same scan screen as Kaart koppelen (pulsing rings), with the bestelling and total.
// The munten are taken from the wallet of the scanned kaart (its slot in this evenement: persoonlijk or groep).
// Reading NFC isn't built yet. Development builds get "Scan polsband (dev)", which books the sale on the logged-in
// account (its selected Persoonlijk or Groep wallet), without checking the saldo (backend lagapay.dev_scan); it
// books nothing when that account isn't a deelnemer of this evenement.
// After paying the rings turn into a green circle with a check ("Betaald"). Tapping it, or waiting BETAALD_MS,
// returns to the producten.

import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import {
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Icon,
  ScanRingen,
  Screen,
  ScreenHeader,
  goBack,
  kleuren,
} from '@/components/lagapay';
import { AantalLabel } from '@/components/terminal/aantal-label';
import { useWinkelwagen, type Bestelregel, useTerminalId } from '@/components/terminal/winkelwagen';
import { devAfrekenen, foutmelding } from '@/lib/api/lagapay';
import type { AfrekenResultaat } from '@/lib/api/types';

/** How long "Betaald" stays before the terminal returns to the producten. */
const BETAALD_MS = 2500;
import { formatMunten } from '@/lib/format';

export default function AfrekenenScreen() {
  const id = useTerminalId();
  const terug = `/terminal/${id}` as const;
  const { regels, totaal, leeg } = useWinkelwagen();

  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  // Kept after paying, since the bestelling is emptied then.
  const [betaald, setBetaald] = useState<{ resultaat: AfrekenResultaat; regels: Bestelregel[] } | null>(null);

  const kop = <ScreenHeader title="Afrekenen" backLabel="Wijzigen" fallbackHref={terug} />;

  if (betaald) {
    const { transactie } = betaald.resultaat;
    return (
      <Screen gap={20}>
        {kop}
        <BestellingOverzicht regels={betaald.regels} totaal={transactie.totaal} />
        <Betaald
          tekst={`${formatMunten(transactie.totaal)} afgeschreven · ${transactie.naam}${
            transactie.groep ? ` (${transactie.groep.naam})` : ''
          }`}
          onKlaar={() => goBack(terug)}
        />
      </Screen>
    );
  }

  if (regels.length === 0) {
    return (
      <Screen gap={20}>
        {kop}
        <EmptyState
          icon="info"
          title="Geen producten geselecteerd"
          text="Tik eerst op de producten van de bestelling."
          action={<Button title="Naar producten" variant="secondary" onPress={() => goBack(terug)} />}
        />
      </Screen>
    );
  }

  const devScan = async () => {
    if (bezig) return;
    setBezig(true);
    setFout(null);
    try {
      const resultaat = await devAfrekenen(
        id,
        regels.map((r) => ({ id: r.product.id, aantal: r.aantal })),
      );
      setBetaald({ resultaat, regels });
      leeg();
    } catch (err) {
      // e.g. 403 evenement gesloten, or I'm not a deelnemer of this evenement.
      setFout(foutmelding(err));
    } finally {
      setBezig(false);
    }
  };

  return (
    <Screen gap={20}>
      {kop}
      <BestellingOverzicht regels={regels} totaal={totaal} />

      <View className="items-center py-2">
        <ScanRingen label="Wachten op een kaart of telefoon" />
        <Text className="mt-6 text-center text-xl font-bold tracking-[-0.3px] text-zinc-50">
          Houd kaart of telefoon tegen dit toestel
        </Text>
        <Text className="mt-1.5 text-[13px] text-zinc-400">Wachten op betaling…</Text>
      </View>

      {fout ? <ErrorBanner message={fout} /> : null}

      {__DEV__ ? (
        <Button
          title="Scan polsband (dev)"
          variant="secondary"
          icon="nfc"
          onPress={() => void devScan()}
          loading={bezig}
          accessibilityLabel="Scan polsband, alleen in ontwikkeling"
        />
      ) : null}
    </Screen>
  );
}

/**
 * Takes the place of the rings once paid: an emerald circle (same 260px as ScanRingen) with a check that fades in,
 * "Betaald" and `tekst`. Tapping it, or BETAALD_MS later, calls onKlaar (once).
 */
function Betaald({ tekst, onKlaar }: { tekst: string; onKlaar: () => void }) {
  const klaarRef = useRef(false);
  const onKlaarRef = useRef(onKlaar);

  useEffect(() => {
    onKlaarRef.current = onKlaar;
  });

  const klaar = () => {
    // The timer and a tap must not both go back (that would leave the terminal).
    if (klaarRef.current) return;
    klaarRef.current = true;
    onKlaarRef.current();
  };

  useEffect(() => {
    const timer = setTimeout(klaar, BETAALD_MS);
    return () => clearTimeout(timer);
    // Runs once when the payment succeeded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Pressable
      onPress={klaar}
      accessibilityRole="button"
      accessibilityLabel={`Betaald, ${tekst}. Tik om terug te gaan naar de producten.`}
      accessibilityLiveRegion="assertive"
      className="items-center py-2 active:opacity-80"
    >
      <View className="h-[260px] w-[260px] items-center justify-center">
        {/* A calm fade in (Reanimated; core Animated crashed here on Android). */}
        <Animated.View
          entering={FadeIn.duration(250)}
          style={{
            width: 220,
            height: 220,
            borderRadius: 110,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: kleuren.emerald400,
          }}
        >
          <Icon name="check" size={120} color={kleuren.emerald950} strokeWidth={3} />
        </Animated.View>
      </View>
      <Animated.View entering={FadeIn.duration(250)} style={{ alignItems: 'center' }}>
        <Text className="mt-6 text-center text-[28px] font-extrabold tracking-[-0.5px] text-emerald-300">Betaald</Text>
        <Text numberOfLines={2} className="mt-1.5 text-center text-[15px] text-zinc-300">
          {tekst}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

/** "Bestelling": the lines (aantal × naam, subtotal) and the big total. */
function BestellingOverzicht({ regels, totaal }: { regels: Bestelregel[]; totaal: number }) {
  return (
    <Card radius={20} className="gap-2.5 p-4">
      <Text className="text-xs font-semibold uppercase tracking-[0.8px] text-zinc-400">Bestelling</Text>
      {regels.map(({ product, aantal }) => (
        <View key={product.id} className="flex-row items-center gap-3">
          <AantalLabel aantal={aantal} />
          <Text numberOfLines={1} className="min-w-0 flex-1 text-[15px] font-semibold text-zinc-50">
            {product.naam}
          </Text>
          <Text className="text-[15px] font-bold text-zinc-300">{product.prijs * aantal}</Text>
        </View>
      ))}
      <View className="mt-1.5 flex-row items-baseline justify-between border-t border-zinc-800 pt-3.5">
        <Text className="text-[15px] text-zinc-400">Totaal</Text>
        <Text className="text-[30px] font-extrabold tracking-[-0.8px] text-zinc-50">{formatMunten(totaal)}</Text>
      </View>
    </Card>
  );
}
