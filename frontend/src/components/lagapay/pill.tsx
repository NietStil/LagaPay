import { Text, View } from 'react-native';

export type PillTone = 'success' | 'neutral' | 'accent';
export type PillSize = 'sm' | 'md';

const TONE: Record<PillTone, { box: string; text: string }> = {
  // emerald-950 / emerald-800 / emerald-300 (Open, Geldig, Actief)
  success: { box: 'bg-emerald-950 border-emerald-800', text: 'text-emerald-300' },
  // zinc-800 / zinc-700 / zinc-300 (Gesloten, Verlopen, "Incl. 20 munten")
  neutral: { box: 'bg-zinc-800 border-zinc-700', text: 'text-zinc-300' },
  // purple-950 / purple-800 / purple-200 ("Voor: Persoonlijk", selected "Incl. 10 munten")
  accent: { box: 'bg-purple-950 border-purple-800', text: 'text-purple-200' },
};

const SIZE: Record<PillSize, { box: string; text: string }> = {
  // padding 3px 10px, 12px semibold (status pills)
  sm: { box: 'px-2.5 py-[3px]', text: 'text-xs' },
  // padding 6px 12px, 13px semibold ("Voor: Groep · Team Rood")
  md: { box: 'px-3 py-1.5', text: 'text-[13px]' },
};

export interface PillProps {
  label: string;
  /** Default 'neutral'. */
  tone?: PillTone;
  /** Default 'sm'. */
  size?: PillSize;
}

/** Rounded-full label with a colored border. For statuses use `StatusPill`. */
export function Pill({ label, tone = 'neutral', size = 'sm' }: PillProps) {
  return (
    <View className={`self-start rounded-full border ${TONE[tone].box} ${SIZE[size].box}`}>
      <Text numberOfLines={1} className={`font-semibold ${TONE[tone].text} ${SIZE[size].text}`}>
        {label}
      </Text>
    </View>
  );
}

export type Status = 'open' | 'geldig' | 'actief' | 'gesloten' | 'verlopen' | 'inactief';

const STATUS: Record<Status, { label: string; tone: PillTone }> = {
  open: { label: 'Open', tone: 'success' },
  geldig: { label: 'Geldig', tone: 'success' },
  actief: { label: 'Actief', tone: 'success' },
  gesloten: { label: 'Gesloten', tone: 'neutral' },
  verlopen: { label: 'Verlopen', tone: 'neutral' },
  inactief: { label: 'Inactief', tone: 'neutral' },
};

export interface StatusPillProps {
  /** Matches the API values: evenement open/gesloten, ticket geldig/verlopen, kaart actief/inactief/verlopen. */
  status: Status;
  /** Override the default Dutch label ("Open", "Gesloten", ...). */
  label?: string;
}

/** Green pill for open/geldig/actief, grey for gesloten/verlopen/inactief. */
export function StatusPill({ status, label }: StatusPillProps) {
  const s = STATUS[status];
  return <Pill label={label ?? s.label} tone={s.tone} />;
}
