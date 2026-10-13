import { Fragment } from 'react';
import { Text, View } from 'react-native';

import type { Transactie } from '@/lib/api/types';
import { formatBedrag, formatTijd } from '@/lib/format';

export interface TimelineSection {
  key: string;
  /** Day heading, e.g. "Zaterdag 18 juli". */
  title: string;
  items: Transactie[];
}

export interface TimelineProps {
  /** Transacties to show (newest first, as the API returns them). */
  items?: Transactie[];
  /**
   * Alternative to `items`: day groups on one continuous line, each with an uppercase heading.
   * Build them with `groepeerPerDag(transacties)` from '@/lib/format'.
   */
  sections?: TimelineSection[];
  /**
   * Grey line under the label. Default: time ("21:42").
   * Groep: `(t) => \`${formatTijd(t.datum)} · ${t.gebruiker?.voornaam ?? ''}\``; gesloten: `(t) => formatDagTijd(t.datum)`.
   */
  meta?: (t: Transactie) => string;
  /** Shown (14px zinc-400) when there are no items. Without it an empty timeline renders nothing. */
  emptyText?: string;
}

const standaardMeta = (t: Transactie) => formatTijd(t.datum);

/**
 * Vertical activity timeline: zinc-800 line, a dot per transactie (emerald-400 ring for munten in,
 * rose-400 for munten out), label + meta on the left, signed amount ("+ 20" / "− 4") on the right.
 */
export function Timeline({ items, sections, meta = standaardMeta, emptyText }: TimelineProps) {
  const groepen: TimelineSection[] = sections ?? [{ key: 'alles', title: '', items: items ?? [] }];
  const aantal = groepen.reduce((som, g) => som + g.items.length, 0);

  if (aantal === 0) {
    return emptyText ? <Text className="text-sm text-zinc-400">{emptyText}</Text> : null;
  }

  const zichtbaar = groepen.filter((g) => g.items.length > 0);

  return (
    <View className="relative pl-7">
      <View className="absolute bottom-2 left-[7px] top-2 w-0.5 bg-zinc-800" />
      {zichtbaar.map((groep, gi) => {
        const laatsteGroep = gi === zichtbaar.length - 1;
        return (
          <Fragment key={groep.key}>
            {groep.title ? (
              <Text className="pb-3.5 text-xs font-semibold uppercase tracking-[0.8px] text-zinc-400">
                {groep.title}
              </Text>
            ) : null}
            {groep.items.map((t, i) => {
              const laatsteItem = i === groep.items.length - 1;
              // 20px between items, 26px before the next day heading, nothing after the very last item.
              const ruimte = laatsteItem ? (laatsteGroep ? 0 : 26) : 20;
              return <TimelineItem key={t.id} transactie={t} meta={meta(t)} ruimteOnder={ruimte} />;
            })}
          </Fragment>
        );
      })}
    </View>
  );
}

function TimelineItem({ transactie, meta, ruimteOnder }: { transactie: Transactie; meta: string; ruimteOnder: number }) {
  const uit = transactie.bedrag < 0;
  return (
    <View className="relative" style={{ paddingBottom: ruimteOnder }}>
      <View
        className={`absolute -left-7 top-[3px] h-4 w-4 rounded-full border-2 bg-zinc-950 ${
          uit ? 'border-rose-400' : 'border-emerald-400'
        }`}
      />
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="text-[15px] font-semibold text-zinc-50">{transactie.label}</Text>
          {meta ? <Text className="mt-0.5 text-xs text-zinc-400">{meta}</Text> : null}
        </View>
        <Text className={`text-[15px] font-bold ${uit ? 'text-rose-300' : 'text-emerald-300'}`}>
          {formatBedrag(transactie.bedrag)}
        </Text>
      </View>
    </View>
  );
}
