// Bar terminal — Producten (app-design/terminal/Main.dc.html, Geselecteerd.dc.html): category tabs, a grid of
// product tiles (tap = one more), the bestelling with a minus per line and "Afrekenen", which opens the scan screen.

import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';

import {
  ErrorState,
  Icon,
  LoadingState,
  Screen,
  SegmentedTabs,
  kleuren,
} from '@/components/lagapay';
import { AantalLabel } from '@/components/terminal/aantal-label';
import { useWinkelwagen, useTerminalId } from '@/components/terminal/winkelwagen';
import { useApiData } from '@/hooks/use-api-data';
import { getTerminal } from '@/lib/api/lagapay';
import type { TerminalProduct } from '@/lib/api/types';
import { formatMunten } from '@/lib/format';

const KOLOMMEN = 3;

export default function TerminalProductenScreen() {
  const id = useTerminalId();
  const { data, error, loading, reload } = useApiData(() => getTerminal(id), [id]);
  const [categorie, setCategorie] = useState<string | null>(null);

  if (!data) {
    return (
      <Screen scroll={false}>
        {loading ? <LoadingState /> : <ErrorState message={error ?? ''} onRetry={reload} />}
      </Screen>
    );
  }

  // Tabs are the evenement's categorieën (SegmentedTabs works with string values). The first one is open at the
  // start, and also when the chosen one disappeared after a reload.
  const tabs = data.categorieen.map((c) => ({ value: String(c.id), label: c.naam }));
  const gekozen = tabs.some((t) => t.value === categorie) ? categorie : (tabs[0]?.value ?? null);
  const zichtbaar = data.producten.filter((p) => String(p.categorie_id) === gekozen);

  return (
    <Screen scroll={false} gap={14}>
      {gekozen !== null ? <SegmentedTabs options={tabs} value={gekozen} onChange={setCategorie} /> : null}

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
        {zichtbaar.length === 0 ? (
          <View className="items-center rounded-[20px] border border-dashed border-zinc-700 bg-[#131316] px-6 py-14">
            <Text className="text-[15px] font-semibold text-zinc-50">Geen producten gevonden</Text>
            <Text className="mt-1 text-center text-[13px] text-zinc-400">
              {data.producten.length === 0
                ? 'Dit evenement heeft nog geen producten. Voeg ze toe in het dashboard onder Producten.'
                : 'Er staan nog geen producten in deze categorie.'}
            </Text>
          </View>
        ) : (
          <ProductRaster producten={zichtbaar} />
        )}
      </ScrollView>

      <Bestelling onAfrekenen={() => router.push(`/terminal/${id}/afrekenen`)} />
    </Screen>
  );
}

/** Tiles in rows of KOLOMMEN, 10px apart; the last row is padded with empty cells so tiles keep their width. */
function ProductRaster({ producten }: { producten: TerminalProduct[] }) {
  const rijen: TerminalProduct[][] = [];
  for (let i = 0; i < producten.length; i += KOLOMMEN) rijen.push(producten.slice(i, i + KOLOMMEN));

  return (
    <View className="gap-2.5">
      {rijen.map((rij, r) => (
        <View key={r} className="flex-row gap-2.5">
          {rij.map((product) => (
            <ProductTegel key={product.id} product={product} />
          ))}
          {Array.from({ length: KOLOMMEN - rij.length }, (_, i) => (
            <View key={`leeg-${i}`} className="flex-1" />
          ))}
        </View>
      ))}
    </View>
  );
}

/** Design tile: naam top left, the selected aantal as a purple badge top right, price in munten at the bottom. */
function ProductTegel({ product }: { product: TerminalProduct }) {
  const { aantal, voegToe } = useWinkelwagen();
  const n = aantal(product.id);

  return (
    <Pressable
      onPress={() => voegToe(product)}
      accessibilityRole="button"
      accessibilityLabel={`${product.naam}, ${formatMunten(product.prijs)}${n > 0 ? `, ${n} geselecteerd` : ''}, toevoegen`}
      className="min-h-[104px] flex-1 rounded-[18px] border-[1.5px] border-zinc-800 bg-zinc-900 p-3 active:scale-[0.97]"
    >
      <View className="flex-row items-start justify-between gap-1.5">
        <Text className="min-w-0 flex-1 text-[15px] font-semibold leading-[19px] text-zinc-50">{product.naam}</Text>
        {n > 0 ? (
          <View className="h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-purple-700 px-1.5">
            <Text className="text-[13px] font-extrabold text-white">{n}</Text>
          </View>
        ) : null}
      </View>
      <Text className="mt-auto pt-2.5 text-sm font-bold text-purple-300">{formatMunten(product.prijs)}</Text>
    </Pressable>
  );
}

/** Bottom sheet: the selected products (minus = one less) and "Afrekenen" with the total. */
function Bestelling({ onAfrekenen }: { onAfrekenen: () => void }) {
  const { regels, totaal, verminder } = useWinkelwagen();

  if (regels.length === 0) {
    return (
      <View className="h-14 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900">
        <Text className="text-[15px] font-semibold text-zinc-500">Tik op een product om te beginnen</Text>
      </View>
    );
  }

  return (
    <View className="overflow-hidden rounded-[20px] border border-zinc-800 bg-zinc-900">
      <ScrollView style={{ maxHeight: 192 }} className="pl-4 pr-1.5" showsVerticalScrollIndicator={false}>
        {regels.map(({ product, aantal }) => (
          <View key={product.id} className="min-h-12 flex-row items-center gap-3 border-b border-zinc-800">
            <AantalLabel aantal={aantal} />
            <Text numberOfLines={1} className="min-w-0 flex-1 text-[15px] font-semibold text-zinc-50">
              {product.naam}
            </Text>
            <Text className="text-sm font-bold text-purple-300">{formatMunten(product.prijs * aantal)}</Text>
            <Pressable
              onPress={() => verminder(product.id)}
              accessibilityRole="button"
              accessibilityLabel={aantal > 1 ? `Eén ${product.naam} minder` : `${product.naam} verwijderen`}
              className="h-11 w-11 items-center justify-center rounded-xl active:opacity-60"
            >
              <Icon name="minus" size={18} color={kleuren.rose300} />
            </Pressable>
          </View>
        ))}
      </ScrollView>
      <View className="p-2">
        <Pressable
          onPress={onAfrekenen}
          accessibilityRole="button"
          accessibilityLabel={`Afrekenen, ${formatMunten(totaal)}`}
          className="h-14 flex-row items-center justify-between gap-3 rounded-[14px] bg-purple-700 pl-[18px] pr-2.5 active:opacity-80"
        >
          <Text className="text-base font-bold text-white">Afrekenen</Text>
          <View className="rounded-[11px] bg-zinc-950/30 px-3 py-2">
            <Text className="text-sm font-bold text-white">{formatMunten(totaal)}</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}
