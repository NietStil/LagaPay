// Screen 4 — Evenement toevoegen (Toevoegen.dc.html): join an evenement or groep by scanning its QR code,
// or by typing the evenement code (or pasting a link). Evenementen with tickets open their tickets screen.

import { useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import {
  Button,
  ErrorBanner,
  InfoNote,
  QrScanner,
  Screen,
  ScreenHeader,
  TabTitle,
  kleuren,
} from '@/components/lagapay';
import { foutmelding } from '@/lib/api/lagapay';
import { openEvenementLink, openGroepLink, openTicketLink } from '@/lib/deelnemen';
import { TICKET_QR_VOORVOEGSEL, parseLagaPayLink, type LagaPayLink } from '@/lib/links';

/** An evenement code as typed in: 15 nanoid characters (backend `evenementen.code`). */
const EVENEMENT_CODE = /^[A-Za-z0-9_-]{15}$/;

export default function ToevoegenScreen() {
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [codeFocus, setCodeFocus] = useState(false);

  const bezigRef = useRef(false);

  const verwerkScan = async (data: string) => {
    if (bezigRef.current) return;

    const link = parseLagaPayLink(data);
    if (!link) {
      setFout(
        data.startsWith(TICKET_QR_VOORVOEGSEL)
          ? 'Dit is een ticket. Laat het scannen bij de ingang van het evenement.'
          : 'Deze QR-code is geen LagaPay-link. Scan de QR-code van het evenement.',
      );
      return;
    }

    await openLink(link);
  };

  // A typed evenement code, or a pasted link (evenement, groep or ticket).
  const verwerkCode = async () => {
    if (bezigRef.current) return;
    const invoer = code.trim();
    if (!invoer) return;

    const link: LagaPayLink | null =
      parseLagaPayLink(invoer) ??
      (EVENEMENT_CODE.test(invoer) ? { soort: 'evenement', code: invoer, pad: `/e/${invoer}` } : null);
    if (!link) {
      setFout('Deze code klopt niet. Een evenementcode heeft 15 tekens, of plak de link van het evenement.');
      return;
    }
    await openLink(link);
  };

  const openLink = async (link: LagaPayLink) => {
    // A terminal QR code: the terminal deep link screen makes this device the terminal.
    if (link.soort === 'terminal') {
      router.replace(`/k/${link.code}`);
      return;
    }

    bezigRef.current = true;
    setBezig(true);
    setFout(null);
    try {
      // Evenementen with tickets open their tickets screen until I have a ticket and the evenement has started.
      if (link.soort === 'evenement') {
        const { evenementId, naarTickets } = await openEvenementLink(link.code);
        router.replace(naarTickets ? `/evenement/${evenementId}/tickets` : `/evenement/${evenementId}`);
      } else if (link.soort === 'ticket') {
        const { evenementId, naarTickets } = await openTicketLink(link.code);
        router.replace(naarTickets ? `/evenement/${evenementId}/tickets` : `/evenement/${evenementId}`);
      } else {
        const { evenementId, naarTickets } = await openGroepLink(link.code);
        router.replace(naarTickets ? `/evenement/${evenementId}/tickets` : `/evenement/${evenementId}/groep`);
      }
    } catch (err) {
      // e.g. 404 "Evenement niet gevonden.", 403 gesloten / geblokkeerd, 409 al in een andere groep.
      setFout(foutmelding(err));
      bezigRef.current = false;
      setBezig(false);
    }
  };

  return (
    <Screen gap={24}>
      <ScreenHeader />

      <View>
        <TabTitle>Evenement toevoegen</TabTitle>
        <Text className="mt-2 text-[15px] leading-[22px] text-zinc-400">
          Scan de QR-code van het evenement of vul de evenementcode in om deel te nemen of tickets te kopen.
        </Text>
      </View>

      <View className="h-[420px] items-center justify-center overflow-hidden rounded-[28px] border border-zinc-800 bg-[#131316]">
        <QrScanner
          onScan={(data) => void verwerkScan(data)}
          bezig={bezig}
          bezigLabel="Bezig met toevoegen…"
          waarom="LagaPay gebruikt de camera om de QR-code van het evenement te scannen."
          geenCameraTekst="Scan de QR-code met de LagaPay-app op je telefoon, of open de link uit de QR-code op dit apparaat."
        />
      </View>

      {fout ? <ErrorBanner message={fout} /> : null}

      <View className="gap-3">
        <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-300">Of vul de evenementcode in</Text>
        <TextInput
          value={code}
          onChangeText={(waarde) => {
            setCode(waarde);
            if (fout) setFout(null);
          }}
          accessibilityLabel="Evenementcode"
          placeholder="Code of link van het evenement"
          placeholderTextColor={kleuren.zinc500}
          selectionColor={kleuren.purple300}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="go"
          editable={!bezig}
          onSubmitEditing={() => void verwerkCode()}
          onFocus={() => setCodeFocus(true)}
          onBlur={() => setCodeFocus(false)}
          className={`w-full rounded-2xl border bg-zinc-900 px-4 py-4 text-base text-white ${
            codeFocus ? 'border-purple-700' : 'border-zinc-800'
          }`}
          // Web: no browser focus ring; the border shows the focus instead.
          style={{ outlineWidth: 0 }}
        />
        <Button title="Toevoegen" onPress={() => void verwerkCode()} loading={bezig} disabled={!code.trim()} />
      </View>

      <InfoNote icon="link">
        Heb je een link gekregen? Open die op je telefoon, dan kom je vanzelf bij het evenement.
      </InfoNote>
    </Screen>
  );
}
