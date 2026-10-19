// A shareable uitnodigingslink as a row: link, QR-code button (full-screen QR) and Delen. Used for the groep
// invite link and for the link that hands tickets to friends.

import { useState } from 'react';
import { Platform, Pressable, Share, Text, View } from 'react-native';

import { UitnodigingQr } from '@/components/evenement/uitnodiging-qr';
import { Button, Icon, IconBox, kleuren } from '@/components/lagapay';
import { meld } from '@/lib/melding';

export interface UitnodigingslinkProps {
  link: string;
  /** Heading of the QR screen, e.g. the groep name. */
  titel: string;
  /** Sentence under that heading, e.g. "Laat deze QR-code scannen … om lid te worden van de groep." */
  omschrijving: string;
  /** Small label in the row. Default "Uitnodigingslink". */
  label?: string;
}

/** "lagapay.nl/g/rd48k2" row with a QR-code button and a Delen button. */
export function Uitnodigingslink({ link, titel, omschrijving, label = 'Uitnodigingslink' }: UitnodigingslinkProps) {
  const [qrZichtbaar, setQrZichtbaar] = useState(false);

  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 px-3.5 py-3">
      <IconBox icon="link" />
      <View className="min-w-0 flex-1">
        <Text className="text-[11px] font-semibold uppercase tracking-[0.8px] text-zinc-400">{label}</Text>
        <Text selectable numberOfLines={1} className="mt-0.5 text-sm font-semibold text-purple-300">
          {link.replace(/^https?:\/\//, '')}
        </Text>
      </View>
      <Pressable
        onPress={() => setQrZichtbaar(true)}
        accessibilityRole="button"
        accessibilityLabel="Toon QR-code"
        hitSlop={6}
        className="h-9 w-9 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800 active:opacity-80"
      >
        <Icon name="qr" size={18} color={kleuren.purple300} />
      </Pressable>
      <Button title="Delen" size="sm" onPress={() => void deelLink(link)} />
      <UitnodigingQr
        zichtbaar={qrZichtbaar}
        titel={titel}
        omschrijving={omschrijving}
        link={link}
        onDelen={() => void deelLink(link)}
        onSluiten={() => setQrZichtbaar(false)}
      />
    </View>
  );
}

/**
 * Native: the system share sheet. Web: the browser's share sheet when it has one (navigator.share),
 * otherwise copy the link to the clipboard. Last resort: show the link so it can be copied by hand.
 */
export async function deelLink(link: string) {
  if (Platform.OS !== 'web') {
    try {
      await Share.share({ message: link });
    } catch {
      meld('Uitnodigingslink', link);
    }
    return;
  }

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await Share.share({ message: link });
      return;
    } catch (err) {
      // The user closed the share sheet: nothing else to do.
      if (err instanceof Error && err.name === 'AbortError') return;
    }
  }

  try {
    await navigator.clipboard.writeText(link);
    meld('Link gekopieerd');
  } catch {
    meld('Uitnodigingslink', link);
  }
}
