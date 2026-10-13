// Full-screen QR code of a groep's uitnodigingslink, so another visitor can scan it with the LagaPay app.

import { Modal, Platform, Pressable, Text, View } from 'react-native';
import { toDataURL } from 'qrcode';

import { Button, QrCode, kleuren } from '@/components/lagapay';
import { meld } from '@/lib/melding';

export interface UitnodigingQrProps {
  zichtbaar: boolean;
  groepNaam: string;
  link: string;
  onDelen: () => void;
  onSluiten: () => void;
}

export function UitnodigingQr({ zichtbaar, groepNaam, link, onDelen, onSluiten }: UitnodigingQrProps) {
  return (
    <Modal visible={zichtbaar} transparent animationType="fade" onRequestClose={onSluiten} statusBarTranslucent>
      {/* No accessibilityRole on the two Pressables: on web that would nest <button>s. */}
      <Pressable onPress={onSluiten} className="flex-1 items-center justify-center bg-black/80 px-5">
        {/* Swallows presses so tapping the card doesn't close the modal. */}
        <Pressable
          onPress={() => {}}
          className="w-full max-w-[360px] items-center gap-4 rounded-3xl border border-zinc-800 bg-zinc-900 p-5"
        >
          <View className="items-center">
            <Text className="text-lg font-bold text-zinc-50">{groepNaam}</Text>
            <Text className="mt-1 text-center text-[13px] text-zinc-400">
              Laat deze QR-code scannen in de LagaPay app om lid te worden van de groep.
            </Text>
          </View>

          <View className="rounded-2xl bg-white p-2">
            <QrCode value={link} size={240} />
          </View>

          <Text selectable numberOfLines={1} className="text-sm font-semibold text-purple-300">
            {link.replace(/^https?:\/\//, '')}
          </Text>

          <View className="gap-2 self-stretch">
            <Button title="Link delen" icon="share" onPress={onDelen} />
            {Platform.OS === 'web' ? (
              <Button title="Download QR-code" variant="secondary" onPress={() => void downloadQr(link, groepNaam)} />
            ) : null}
            <Button title="Sluiten" variant="outline" onPress={onSluiten} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Web only: saves the QR code as a 1024px PNG. */
async function downloadQr(link: string, groepNaam: string) {
  const slug = groepNaam.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'groep';
  try {
    const a = document.createElement('a');
    a.href = await toDataURL(link, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 1024,
      color: { dark: kleuren.zinc950, light: '#ffffff' },
    });
    a.download = `lagapay-${slug}-qr.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch {
    meld('Downloaden lukte niet', 'Probeer het opnieuw of deel de link.');
  }
}
