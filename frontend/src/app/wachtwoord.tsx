// Wachtwoord wijzigen (from Profiel). No design: same look as the Profiel and login screens.

import { useState, type ComponentProps } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Button, ErrorBanner, Screen, ScreenHeader, goBack, kleuren } from '@/components/lagapay';
import { veldFouten } from '@/components/tabs/veld-fouten';
import { foutmelding, updateWachtwoord } from '@/lib/api/lagapay';
import { meld } from '@/lib/melding';

type Veld = 'huidig_wachtwoord' | 'wachtwoord' | 'wachtwoord_confirmation';
type Fouten = Partial<Record<Veld, string>>;

const MIN_LENGTE = 8;

export default function WachtwoordScreen() {
  const [huidig, setHuidig] = useState('');
  const [nieuw, setNieuw] = useState('');
  const [herhaal, setHerhaal] = useState('');
  const [fouten, setFouten] = useState<Fouten>({});
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);

  const wis = (veld: Veld) => {
    if (fouten[veld]) setFouten((f) => ({ ...f, [veld]: undefined }));
  };

  const bewaar = async () => {
    if (bezig) return;
    const nieuweFouten: Fouten = {};
    if (nieuw.length < MIN_LENGTE) {
      nieuweFouten.wachtwoord = `Je nieuwe wachtwoord moet minimaal ${MIN_LENGTE} tekens hebben.`;
    }
    if (herhaal !== nieuw) nieuweFouten.wachtwoord_confirmation = 'De wachtwoorden komen niet overeen.';
    setFout(null);
    setFouten(nieuweFouten);
    if (Object.keys(nieuweFouten).length > 0) return;

    setBezig(true);
    try {
      const bericht = await updateWachtwoord({
        // Accounts that only log in with Google have no wachtwoord; the backend then doesn't need it.
        huidig_wachtwoord: huidig || undefined,
        wachtwoord: nieuw,
        wachtwoord_confirmation: herhaal,
      });
      setBezig(false);
      meld('Wachtwoord gewijzigd', bericht || 'Je wachtwoord is gewijzigd.');
      goBack('/profiel');
    } catch (err) {
      const server = veldFouten(err);
      const perVeld: Fouten = {};
      if (server.huidig_wachtwoord) perVeld.huidig_wachtwoord = server.huidig_wachtwoord;
      if (server.wachtwoord) perVeld.wachtwoord = server.wachtwoord;
      if (server.wachtwoord_confirmation) perVeld.wachtwoord_confirmation = server.wachtwoord_confirmation;
      if (Object.keys(perVeld).length > 0) setFouten(perVeld);
      else setFout(foutmelding(err, 'Wachtwoord wijzigen lukt niet. Probeer het later opnieuw.'));
      setBezig(false);
    }
  };

  return (
    <Screen gap={22}>
      <ScreenHeader title="Wachtwoord wijzigen" fallbackHref="/profiel" />

      {fout ? <ErrorBanner message={fout} /> : null}

      <View className="gap-5">
        <WachtwoordVeld
          label="Huidig wachtwoord"
          hint="Log je alleen in met Google? Laat dit veld dan leeg."
          value={huidig}
          onChangeText={(w) => {
            setHuidig(w);
            wis('huidig_wachtwoord');
          }}
          fout={fouten.huidig_wachtwoord}
          autoComplete="current-password"
          textContentType="password"
        />
        <WachtwoordVeld
          label="Nieuw wachtwoord"
          hint={`Minimaal ${MIN_LENGTE} tekens.`}
          value={nieuw}
          onChangeText={(w) => {
            setNieuw(w);
            wis('wachtwoord');
          }}
          fout={fouten.wachtwoord}
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <WachtwoordVeld
          label="Herhaal nieuw wachtwoord"
          value={herhaal}
          onChangeText={(w) => {
            setHerhaal(w);
            wis('wachtwoord_confirmation');
          }}
          fout={fouten.wachtwoord_confirmation}
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="done"
          onSubmitEditing={() => void bewaar()}
        />
      </View>

      <Button
        title="Wachtwoord opslaan"
        onPress={() => void bewaar()}
        loading={bezig}
        disabled={!nieuw || !herhaal}
      />
    </Screen>
  );
}

type WachtwoordVeldProps = ComponentProps<typeof TextInput> & {
  label: string;
  hint?: string;
  fout?: string;
};

/** Password input in the login screen's style (uppercase label, rounded-2xl box) with a Toon/Verberg toggle. */
function WachtwoordVeld({ label, hint, fout, ...input }: WachtwoordVeldProps) {
  const [zichtbaar, setZichtbaar] = useState(false);
  const [focus, setFocus] = useState(false);
  const rand = fout ? 'border-rose-800' : focus ? 'border-purple-700' : 'border-zinc-800';

  return (
    <View>
      <Text className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-zinc-300">{label}</Text>
      <View className="justify-center">
        <TextInput
          returnKeyType="next"
          {...input}
          accessibilityLabel={label}
          placeholder="••••••••"
          placeholderTextColor={kleuren.zinc500}
          selectionColor={kleuren.purple300}
          secureTextEntry={!zichtbaar}
          autoCapitalize="none"
          autoCorrect={false}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          className={`w-full rounded-2xl border bg-zinc-900 py-4 pl-4 pr-20 text-base text-white ${rand}`}
          // Web: no browser focus ring; the border shows the focus instead.
          style={{ outlineWidth: 0 }}
        />
        <Pressable
          onPress={() => setZichtbaar((z) => !z)}
          accessibilityRole="button"
          accessibilityLabel={zichtbaar ? `${label} verbergen` : `${label} tonen`}
          hitSlop={8}
          className="absolute right-4 p-2 active:opacity-70"
        >
          <Text className="text-xs font-medium text-zinc-400">{zichtbaar ? 'Verberg' : 'Toon'}</Text>
        </Pressable>
      </View>
      {fout ? (
        <Text className="mt-2 text-[13px] text-rose-300">{fout}</Text>
      ) : hint ? (
        <Text className="mt-2 text-[13px] text-zinc-400">{hint}</Text>
      ) : null}
    </View>
  );
}
