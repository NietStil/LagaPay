// Bar terminal — Transacties (app-design/terminal/Transacties.dc.html): the sales of this evenement, newest first.
// A row opens to show its products and "Terugbetalen", which does nothing yet.

import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { EmptyState, ErrorState, Icon, LoadingState, Screen, kleuren } from '@/components/lagapay';
import { AantalLabel } from '@/components/terminal/aantal-label';
import { useTerminalId } from '@/components/terminal/winkelwagen';
import { useApiData } from '@/hooks/use-api-data';
import { getTerminalTransacties } from '@/lib/api/lagapay';
import type { TerminalVerkoop } from '@/lib/api/types';
import { dagSleutel, formatDagTijd, formatMunten, formatTijd } from '@/lib/format';

export default function TerminalTransactiesScreen() {
  const id = useTerminalId();
  const { data, error, loading, refreshing, reload, refresh } = useApiData(() => getTerminalTransacties(id), [id]);
  const [openId, setOpenId] = useState<number | null>(null);

  let inhoud;
  if (!data) {
    inhoud = loading ? <LoadingState /> : <ErrorState message={error ?? ''} onRetry={reload} />;
  } else if (data.length === 0) {
    inhoud = <EmptyState icon="info" title="Nog geen transacties" text="Afgerekende bestellingen komen hier te staan." />;
  } else {
    // The design's first row is open; afterwards one row at a time.
    const open = openId ?? data[0].id;
    inhoud = (
      <View className="overflow-hidden rounded-[20px] border border-zinc-800 bg-zinc-900">
        {data.map((verkoop, i) => (
          <VerkoopRij
            key={verkoop.id}
            verkoop={verkoop}
            eerste={i === 0}
            open={verkoop.id === open}
            onToggle={() => setOpenId(verkoop.id === open ? -1 : verkoop.id)}
          />
        ))}
      </View>
    );
  }

  return (
    <Screen gap={18} onRefresh={data ? refresh : undefined} refreshing={refreshing}>
      <Text accessibilityRole="header" className="text-[22px] font-bold tracking-[-0.3px] text-zinc-50">
        Transacties
      </Text>
      {inhoud}
    </Screen>
  );
}

interface VerkoopRijProps {
  verkoop: TerminalVerkoop;
  eerste: boolean;
  open: boolean;
  onToggle: () => void;
}

function VerkoopRij({ verkoop, eerste, open, onToggle }: VerkoopRijProps) {
  // Today only the time, like the design; older sales also get the day.
  const vandaag = dagSleutel(verkoop.datum) === dagSleutel(new Date().toISOString());
  const tijd = vandaag ? formatTijd(verkoop.datum) : formatDagTijd(verkoop.datum);

  return (
    <View className={eerste ? '' : 'border-t border-zinc-800'}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${verkoop.naam}, ${tijd}, ${formatMunten(verkoop.totaal)}`}
        className="min-h-[58px] flex-row items-center gap-3 py-2 pl-4 pr-3.5 active:opacity-70"
      >
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="text-[15px] font-semibold text-zinc-50">
            {verkoop.naam}
          </Text>
          <Text numberOfLines={1} className="mt-0.5 text-xs text-zinc-400">
            {verkoop.groep ? `${tijd} · ${verkoop.groep.naam}` : tijd}
          </Text>
        </View>
        <Text className="text-[15px] font-bold text-zinc-50">{formatMunten(verkoop.totaal)}</Text>
        <View style={{ transform: [{ rotate: open ? '-90deg' : '90deg' }] }}>
          <Icon name="chevron-right" size={18} color={kleuren.zinc500} strokeWidth={2.4} />
        </View>
      </Pressable>

      {open ? (
        <View className="px-4 pb-3.5">
          {verkoop.producten.map((regel, i) => (
            <View key={i} className="min-h-11 flex-row items-center gap-3 border-t border-zinc-800">
              <AantalLabel aantal={regel.aantal} />
              <Text numberOfLines={1} className="min-w-0 flex-1 text-sm font-semibold text-zinc-50">
                {regel.naam}
              </Text>
              {regel.prijs !== null ? (
                <Text className="text-sm font-bold text-zinc-300">{formatMunten(regel.prijs * regel.aantal)}</Text>
              ) : null}
            </View>
          ))}
          {/* Terugbetalen isn't built yet: the button is there, but does nothing. */}
          <Pressable
            onPress={() => {}}
            accessibilityRole="button"
            className="mt-2 h-12 items-center justify-center rounded-[14px] border border-rose-400 active:opacity-70"
          >
            <Text className="text-[15px] font-bold text-rose-300">{`Terugbetalen · ${formatMunten(verkoop.totaal)}`}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
