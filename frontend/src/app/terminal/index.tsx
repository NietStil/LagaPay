// Terminal koppelen: makes this device the bar terminal of an evenement, by scanning the terminal QR code from the
// dashboard (a /k/{code} link) or typing the terminal code. Same layout as Evenement toevoegen.

import { useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';

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
import { parseLagaPayLink } from '@/lib/links';
import { wordTerminal } from '@/lib/terminal';

/** A terminal code as typed in: 15 nanoid characters (backend `evenementen.terminal_code`). */
const TERMINAL_CODE = /^[A-Za-z0-9_-]{15}$/;

export default function TerminalKoppelenScreen() {
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [codeFocus, setCodeFocus] = useState(false);

  const bezigRef = useRef(false);

  /** The terminal code inside a scanned or pasted link, or a bare typed code. */
  const codeUit = (invoer: string): string | null => {
    const link = parseLagaPayLink(invoer);
    if (link) return link.soort === 'terminal' ? link.code : null;
    return TERMINAL_CODE.test(invoer) ? invoer : null;
  };

  const koppel = async (invoer: string) => {
    if (bezigRef.current) return;
    const terminalCode = codeUit(invoer.trim());
    if (!terminalCode) {
      setFout('Dit is geen terminalcode. Scan de terminal-QR-code uit het dashboard of vul de code van 15 tekens in.');
      return;
    }

    bezigRef.current = true;
    setBezig(true);
    setFout(null);
    try {
      await wordTerminal(terminalCode);
    } catch (err) {
      // e.g. 404 "Terminalcode niet gevonden.", 403 gesloten / geblokkeerd.
      setFout(foutmelding(err));
      bezigRef.current = false;
      setBezig(false);
    }
  };

  return (
    <Screen gap={24}>
      <ScreenHeader fallbackHref="/profiel" />

      <View>
        <TabTitle>Terminal worden</TabTitle>
        <Text className="mt-2 text-[15px] leading-[22px] text-zinc-400">
          Scan de terminal-QR-code van het evenement of vul de terminalcode in. Dit toestel wordt dan een kassa
          waarmee je munten afschrijft.
        </Text>
      </View>

      <View className="h-[420px] items-center justify-center overflow-hidden rounded-[28px] border border-zinc-800 bg-[#131316]">
        <QrScanner
          onScan={(data) => void koppel(data)}
          bezig={bezig}
          bezigLabel="Terminal koppelen…"
          waarom="LagaPay gebruikt de camera om de terminal-QR-code van het evenement te scannen."
          geenCameraTekst="Vul hieronder de terminalcode in die bij het evenement in het dashboard staat."
        />
      </View>

      {fout ? <ErrorBanner message={fout} /> : null}

      <View className="gap-3">
        <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-300">Of vul de terminalcode in</Text>
        <TextInput
          value={code}
          onChangeText={(waarde) => {
            setCode(waarde);
            if (fout) setFout(null);
          }}
          accessibilityLabel="Terminalcode"
          placeholder="Terminalcode of link"
          placeholderTextColor={kleuren.zinc500}
          selectionColor={kleuren.purple300}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="go"
          editable={!bezig}
          onSubmitEditing={() => void koppel(code)}
          onFocus={() => setCodeFocus(true)}
          onBlur={() => setCodeFocus(false)}
          className={`w-full rounded-2xl border bg-zinc-900 px-4 py-4 text-base text-white ${
            codeFocus ? 'border-purple-700' : 'border-zinc-800'
          }`}
          // Web: no browser focus ring; the border shows the focus instead.
          style={{ outlineWidth: 0 }}
        />
        <Button title="Terminal worden" onPress={() => void koppel(code)} loading={bezig} disabled={!code.trim()} />
      </View>

      <InfoNote icon="info">
        De terminalcode staat in het dashboard onder Terminals. Hij is anders dan de evenementcode voor bezoekers.
      </InfoNote>
    </Screen>
  );
}
