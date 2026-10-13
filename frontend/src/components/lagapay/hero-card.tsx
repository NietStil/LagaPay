import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

export type HeroCardVariant = 'accent' | 'muted';

export interface HeroCardProps {
  /** Big amount, already formatted, e.g. `formatMunten(saldo)` → "24 munten". */
  amount: string;
  /** Small line above the amount, e.g. groep name "Team Rood" or "Team Rood · jouw aandeel". */
  label?: string;
  /** Small line under the amount, e.g. "van 40 munten in de groep". */
  caption?: string;
  /**
   * 'accent' (default): purple-700 card for open evenementen.
   * 'muted': zinc-900 bordered card with zinc-300 amount for gesloten evenementen.
   */
  variant?: HeroCardVariant;
  /** Actions under the amount (16px gap), e.g. `<HeroButton title="Opwaarderen" icon="plus" />`. */
  children?: ReactNode;
}

/** Saldo card at the top of the evenement pages: radius 24, padding 20, gap 16, 42px extrabold amount. */
export function HeroCard({ amount, label, caption, variant = 'accent', children }: HeroCardProps) {
  const accent = variant === 'accent';
  return (
    <View
      className={`gap-4 rounded-3xl p-5 ${accent ? 'bg-purple-700' : 'border border-zinc-800 bg-zinc-900'}`}
    >
      <View>
        {label ? (
          <Text className={`mb-1 text-sm font-semibold ${accent ? 'text-purple-100' : 'text-zinc-400'}`}>
            {label}
          </Text>
        ) : null}
        <Text
          adjustsFontSizeToFit
          numberOfLines={1}
          className={`text-[42px] font-extrabold leading-[46px] tracking-[-1px] ${accent ? 'text-white' : 'text-zinc-300'}`}
        >
          {amount}
        </Text>
        {caption ? (
          <Text className={`mt-1 text-[13px] ${accent ? 'text-purple-100' : 'text-zinc-400'}`}>{caption}</Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}
