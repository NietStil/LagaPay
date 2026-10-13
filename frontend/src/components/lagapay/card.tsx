import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Icon, type IconName } from './icon';
import { kleuren } from './kleuren';

// ---------------------------------------------------------------------------------------------
// Card

export type CardVariant = 'default' | 'muted' | 'raised' | 'dashed';
export type CardRadius = 12 | 14 | 16 | 18 | 20 | 24;

const CARD_VARIANT: Record<CardVariant, string> = {
  // zinc-900 / zinc-800 border (most cards)
  default: 'bg-zinc-900 border border-zinc-800',
  // #111113 / zinc-800 border (closed evenement on the Evenementen tab)
  muted: 'bg-[#111113] border border-zinc-800',
  // zinc-800 / zinc-700 border (Bankkaart)
  raised: 'bg-zinc-800 border border-zinc-700',
  // #131316 / 1.5px dashed zinc-700 (empty kaart slot)
  dashed: 'bg-[#131316] border-[1.5px] border-dashed border-zinc-700',
};

const CARD_RADIUS: Record<CardRadius, string> = {
  12: 'rounded-xl',
  14: 'rounded-[14px]',
  16: 'rounded-2xl',
  18: 'rounded-[18px]',
  20: 'rounded-[20px]',
  24: 'rounded-3xl',
};

export interface CardProps {
  children: ReactNode;
  /** Default 'default'. */
  variant?: CardVariant;
  /** Corner radius in px. Design: 16 (evenement cards, rows, notes), 18 (tiles), 20 (lists, tickets), 24 (hero). Default 20. */
  radius?: CardRadius;
  /** Makes the card pressable (pressed = 80% opacity). */
  onPress?: () => void;
  accessibilityLabel?: string;
  /** Padding / layout classes, e.g. "px-4 py-3.5 gap-3" or "overflow-hidden" for divided lists. No padding by default. */
  className?: string;
}

/** Bordered surface. Put divided rows (`ListRow variant="inset"`) inside with `className="overflow-hidden"`. */
export function Card({
  children,
  variant = 'default',
  radius = 20,
  onPress,
  accessibilityLabel,
  className = '',
}: CardProps) {
  const klassen = `${CARD_VARIANT[variant]} ${CARD_RADIUS[radius]} ${className}`;
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        className={`${klassen} active:opacity-80`}
      >
        {children}
      </Pressable>
    );
  }
  return <View className={klassen}>{children}</View>;
}

// ---------------------------------------------------------------------------------------------
// IconBox

export type IconBoxVariant = 'dark' | 'raised' | 'accent' | 'muted';

const ICONBOX_VARIANT: Record<IconBoxVariant, { box: string; color: string }> = {
  // zinc-950 bg, purple-300 icon (inside zinc-900 cards: tiles, Groepskaart row)
  dark: { box: 'bg-zinc-950 border border-zinc-800', color: kleuren.purple300 },
  // zinc-900 bg, purple-300 icon (on the page background: "Evenement toevoegen")
  raised: { box: 'bg-zinc-900 border border-zinc-800', color: kleuren.purple300 },
  // purple-950 bg, purple-800 border, purple-200 icon (kaarten: permanente kaart, gekoppelde kaart)
  accent: { box: 'bg-purple-950 border border-purple-800', color: kleuren.purple200 },
  // zinc-900 bg, zinc-400 icon (empty states)
  muted: { box: 'bg-zinc-900 border border-zinc-800', color: kleuren.zinc400 },
};

export interface IconBoxProps {
  icon: IconName;
  /** Default 'dark'. */
  variant?: IconBoxVariant;
  /** Box size in px. Design: 40 (rows/tiles), 44 (kaart slot), 52 (empty state). Default 40. */
  size?: number;
  /** Icon size. Default: 20 for 40px boxes, 22 for 44, 26 for 52+. */
  iconSize?: number;
  /** Override the icon color (hex). */
  color?: string;
}

/** Square icon container (rounded 12px, 16px from 52px up). */
export function IconBox({ icon, variant = 'dark', size = 40, iconSize, color }: IconBoxProps) {
  const v = ICONBOX_VARIANT[variant];
  const grootte = iconSize ?? (size >= 52 ? 26 : size >= 44 ? 22 : 20);
  return (
    <View
      className={`shrink-0 items-center justify-center ${v.box}`}
      style={{ width: size, height: size, borderRadius: size >= 52 ? 16 : 12 }}
    >
      <Icon name={icon} size={grootte} color={color ?? v.color} />
    </View>
  );
}

// ---------------------------------------------------------------------------------------------
// ListRow

export type ListRowVariant = 'card' | 'plain' | 'inset';

const ROW_VARIANT: Record<ListRowVariant, string> = {
  // own card: zinc-900, border, radius 16, padding 12/14 (Groepskaart row)
  card: 'bg-zinc-900 border border-zinc-800 rounded-2xl px-3.5 py-3',
  // no background, bottom divider, padding-bottom 16 ("Evenement toevoegen" on the Evenementen tab)
  plain: 'pb-4 border-b border-zinc-800',
  // row inside a <Card className="overflow-hidden">: padding 12/16, divider unless `last`
  inset: 'px-4 py-3',
};

export interface ListRowProps {
  title: string;
  subtitle?: string;
  /** Render the subtitle in a monospace font (UIDs: "UID ···· 7D31"). */
  subtitleMono?: boolean;
  /** Icon in an IconBox on the left. */
  icon?: IconName;
  /** IconBox variant. Default: 'raised' for variant="plain", otherwise 'dark'. */
  iconVariant?: IconBoxVariant;
  /** Custom left element instead of `icon` (e.g. `<Avatar />`). */
  leading?: ReactNode;
  /** Right element (pill, amount, button). Replaces the chevron. */
  right?: ReactNode;
  /** Show the chevron-right. Default: true when `onPress` is set and there's no `right`. */
  chevron?: boolean;
  onPress?: () => void;
  /** Default 'card'. */
  variant?: ListRowVariant;
  /** variant="inset": hides the bottom divider (last row of the card). */
  last?: boolean;
}

/** Icon box + title/subtitle + chevron (or `right`), optionally pressable. */
export function ListRow({
  title,
  subtitle,
  subtitleMono = false,
  icon,
  iconVariant,
  leading,
  right,
  chevron,
  onPress,
  variant = 'card',
  last = false,
}: ListRowProps) {
  const toonChevron = chevron ?? (!!onPress && !right);
  const divider = variant === 'inset' && !last ? 'border-b border-zinc-800' : '';
  const klassen = `flex-row items-center gap-3 ${ROW_VARIANT[variant]} ${divider}`;

  const inhoud = (
    <>
      {leading ?? (icon ? <IconBox icon={icon} variant={iconVariant ?? (variant === 'plain' ? 'raised' : 'dark')} /> : null)}
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-[15px] font-semibold text-zinc-50">
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} className={`mt-0.5 text-xs text-zinc-400 ${subtitleMono ? 'font-mono' : ''}`}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View className="shrink-0">{right}</View> : null}
      {toonChevron ? <Icon name="chevron-right" size={18} color={kleuren.zinc400} /> : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" className={`${klassen} active:opacity-70`}>
        {inhoud}
      </Pressable>
    );
  }
  return <View className={klassen}>{inhoud}</View>;
}

// ---------------------------------------------------------------------------------------------
// Tile

export interface TileProps {
  icon: IconName;
  label: string;
  onPress?: () => void;
}

/**
 * Grid tile (Betalen / Kaarten on the evenement page): zinc-900, radius 18, padding 14, icon box + 15px label.
 * Takes `flex-1`; put two in `<View className="flex-row gap-3">`.
 */
export function Tile({ icon, label, onPress }: TileProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="min-w-0 flex-1 flex-row items-center gap-3 rounded-[18px] border border-zinc-800 bg-zinc-900 p-3.5 active:opacity-80"
    >
      <IconBox icon={icon} variant="dark" />
      <Text numberOfLines={1} className="shrink text-[15px] font-semibold text-zinc-50">
        {label}
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------------------------
// InfoNote

export interface InfoNoteProps {
  /** Default 'info'. Design uses 'link' (Toevoegen), 'info' (kaarten), 'lock' (Opwaarderen). */
  icon?: IconName;
  children: ReactNode;
}

/** Explanatory note: zinc-900 card, radius 16, purple-300 icon, 13px zinc-300 text. Strings are wrapped in Text. */
export function InfoNote({ icon = 'info', children }: InfoNoteProps) {
  return (
    <View className="flex-row gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3.5">
      <View className="mt-px">
        <Icon name={icon} size={20} color={kleuren.purple300} />
      </View>
      {typeof children === 'string' ? (
        <Text className="flex-1 text-[13px] leading-5 text-zinc-300">{children}</Text>
      ) : (
        <View className="flex-1">{children}</View>
      )}
    </View>
  );
}
