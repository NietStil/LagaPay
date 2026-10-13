// Shared pieces of the kaart screens (9 Kaart persoonlijk, 11 Kaart groep, 10/12 Kaart koppelen).

import { Pressable, Text, View } from 'react-native';

import { Button, Card, EmptyState, IconBox, StatusPill } from '@/components/lagapay';
import { getEvenementKaarten, getEvenementOverzicht } from '@/lib/api/lagapay';
import type { EvenementBasis, EvenementKaarten, Kaart } from '@/lib/api/types';
import { maskUid } from '@/lib/format';

export interface KaartenSchermData {
  evenement: EvenementBasis;
  kaarten: EvenementKaarten;
}

/** Kaarten of one evenement plus the evenement itself (naam for the header, open/gesloten). */
export async function laadKaartenScherm(evenementId: string): Promise<KaartenSchermData> {
  const [overzicht, kaarten] = await Promise.all([
    getEvenementOverzicht(evenementId),
    getEvenementKaarten(evenementId),
  ]);
  return { evenement: overzicht.evenement, kaarten };
}

/** "Permanente kaart" / "Tijdelijke kaart". */
export function kaartNaam(kaart: Kaart): string {
  return kaart.permanent ? 'Permanente kaart' : 'Tijdelijke kaart';
}

/** 14px zinc-400 intro paragraph under the tabs. */
export function KaartIntro({ children }: { children: string }) {
  return <Text className="text-sm leading-[21px] text-zinc-400">{children}</Text>;
}

export interface KaartSlotProps {
  kaart: Kaart | null;
  /** Opens the koppelen screen ("Kaart vervangen" / "Kaart koppelen"). Omit for a read-only slot (gesloten evenement). */
  onKoppelen?: () => void;
  /** Line under "Nog geen kaart gekoppeld". */
  leegTekst: string;
}

/** The single kaart slot: the linked kaart (icon, type, masked UID, status) or the dashed empty state. */
export function KaartSlot({ kaart, onKoppelen, leegTekst }: KaartSlotProps) {
  if (!kaart) {
    return (
      <EmptyState
        icon="card"
        title={onKoppelen ? 'Nog geen kaart gekoppeld' : 'Geen kaart gekoppeld'}
        text={leegTekst}
        action={onKoppelen ? <Button title="Kaart koppelen" onPress={onKoppelen} /> : undefined}
      />
    );
  }

  return (
    <Card className="gap-3.5 px-[18px] py-4">
      <View className="flex-row items-center justify-between gap-3">
        <View className="min-w-0 flex-1 flex-row items-center gap-3">
          <IconBox icon="card" variant="accent" size={44} />
          <View className="min-w-0 flex-1">
            <Text numberOfLines={1} className="text-base font-bold text-zinc-50">
              {kaartNaam(kaart)}
            </Text>
            <Text numberOfLines={1} className="mt-0.5 font-mono text-xs text-zinc-400">
              UID {maskUid(kaart.uid_laatste4)}
            </Text>
          </View>
        </View>
        <View className="shrink-0">
          <StatusPill status={kaart.status} />
        </View>
      </View>
      {onKoppelen ? (
        // Not the shared Button: the design uses padding 11, radius 12 and 14px text here (between Button sm and md).
        <Pressable
          onPress={onKoppelen}
          accessibilityRole="button"
          className="rounded-xl border border-zinc-700 bg-zinc-950 p-[11px] active:opacity-80"
        >
          <Text className="text-center text-sm font-semibold text-zinc-50">Kaart vervangen</Text>
        </Pressable>
      ) : null}
    </Card>
  );
}
