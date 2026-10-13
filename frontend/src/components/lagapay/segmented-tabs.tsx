import { Platform, Pressable, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';

// ---------------------------------------------------------------------------------------------
// SegmentedTabs (generic)

export interface SegmentedTabsProps<T extends string> {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

/** Segmented control: zinc-900 container (radius 14, padding 4), active segment purple-700 with white text. */
export function SegmentedTabs<T extends string>({ options, value, onChange }: SegmentedTabsProps<T>) {
  return (
    <View accessibilityRole="tablist" className="flex-row rounded-[14px] border border-zinc-800 bg-zinc-900 p-1">
      {options.map((optie) => {
        const actief = optie.value === value;
        return (
          <Pressable
            key={optie.value}
            onPress={() => {
              if (!actief) onChange(optie.value);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: actief }}
            className={`flex-1 items-center rounded-[10px] p-2.5 ${actief ? 'bg-purple-700' : 'active:opacity-70'}`}
          >
            <Text numberOfLines={1} className={`text-sm font-semibold ${actief ? 'text-white' : 'text-zinc-400'}`}>
              {optie.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------------------------
// Persoonlijk | Groep

export type PersoonlijkGroep = 'persoonlijk' | 'groep';

const PERSOONLIJK_GROEP = [
  { value: 'persoonlijk', label: 'Persoonlijk' },
  { value: 'groep', label: 'Groep' },
] as const;

export interface PersoonlijkGroepTabsProps {
  active: PersoonlijkGroep;
  onSelect: (tab: PersoonlijkGroep) => void;
}

/** The "Persoonlijk | Groep" bar. Inside an evenement prefer `EvenementTabs`, which also navigates. */
export function PersoonlijkGroepTabs({ active, onSelect }: PersoonlijkGroepTabsProps) {
  return <SegmentedTabs options={PERSOONLIJK_GROEP} value={active} onChange={onSelect} />;
}

// ---------------------------------------------------------------------------------------------
// Navigation between the sibling evenement routes

/**
 * Which pair of sibling routes the tabs switch between:
 * - 'overzicht': /evenement/[id] (persoonlijk) ⇄ /evenement/[id]/groep
 * - 'kaarten':   /evenement/[id]/kaarten (persoonlijk) ⇄ /evenement/[id]/kaarten-groep
 */
export type EvenementTabPair = 'overzicht' | 'kaarten';

const TAB_ROUTES = {
  overzicht: { persoonlijk: '/evenement/[id]', groep: '/evenement/[id]/groep' },
  kaarten: { persoonlijk: '/evenement/[id]/kaarten', groep: '/evenement/[id]/kaarten-groep' },
} as const;

/**
 * Search param added by `wisselEvenementTab` on native so evenement/[id]/_layout.tsx can show the
 * switch as a quick fade instead of a push animation. Screens can ignore it.
 */
export const WISSEL_PARAM = 'wissel';

/** Href of one side of a Persoonlijk|Groep pair, e.g. `evenementTabHref(5, 'kaarten', 'groep')`. */
export function evenementTabHref(evenementId: number | string, pair: EvenementTabPair, tab: PersoonlijkGroep): Href {
  return { pathname: TAB_ROUTES[pair][tab], params: { id: String(evenementId) } };
}

/**
 * Switches between the Persoonlijk and Groep page with `router.replace`, so back always returns
 * to the screen before the pair (the Evenementen list for 'overzicht', the evenement page for 'kaarten').
 */
export function wisselEvenementTab(evenementId: number | string, pair: EvenementTabPair, tab: PersoonlijkGroep) {
  const params: Record<string, string> = { id: String(evenementId) };
  if (Platform.OS !== 'web') params[WISSEL_PARAM] = '1';
  router.replace({ pathname: TAB_ROUTES[pair][tab], params } as Href);
}

export interface EvenementTabsProps {
  evenementId: number | string;
  /** 'overzicht' on index/groep, 'kaarten' on kaarten/kaarten-groep. */
  pair: EvenementTabPair;
  /** The tab of the current screen. */
  active: PersoonlijkGroep;
}

/**
 * Persoonlijk | Groep bar wired to the evenement routes.
 * `<EvenementTabs evenementId={id} pair="overzicht" active="groep" />`
 */
export function EvenementTabs({ evenementId, pair, active }: EvenementTabsProps) {
  return (
    <PersoonlijkGroepTabs active={active} onSelect={(tab) => wisselEvenementTab(evenementId, pair, tab)} />
  );
}
