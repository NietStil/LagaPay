// Screen 3 — Profiel tab (Profiel.dc.html): persoonlijke gegevens (editable), bankkaart, kaarten, uitloggen.

import { useState, type ComponentProps } from 'react';
import { ActivityIndicator, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import {
  Button,
  Card,
  ErrorBanner,
  ErrorState,
  IconBox,
  Screen,
  SectionLabel,
  StatusPill,
  TabTitle,
  kleuren,
} from '@/components/lagapay';
import { lijktOpEmail, veldFouten } from '@/components/tabs/veld-fouten';
import { useAuth, type User } from '@/context/auth-context';
import { useApiData } from '@/hooks/use-api-data';
import { foutmelding, getProfielKaarten, updateProfiel } from '@/lib/api/lagapay';
import type { Kaart, ProfielKaarten } from '@/lib/api/types';
import { maskUid } from '@/lib/format';
import { bevestig, meld } from '@/lib/melding';

type Veld = 'voornaam' | 'tussenvoegsels' | 'achternaam' | 'email';
type Waarden = Record<Veld, string>;
type Fouten = Partial<Record<Veld, string>>;

const VELDEN: {
  veld: Veld;
  label: string;
  placeholder: string;
  input: ComponentProps<typeof TextInput>;
}[] = [
  {
    veld: 'voornaam',
    label: 'Voornaam',
    placeholder: 'Voornaam',
    input: { autoComplete: 'given-name', textContentType: 'givenName', autoCapitalize: 'words' },
  },
  {
    veld: 'tussenvoegsels',
    label: 'Tussenvoegsel',
    placeholder: 'Geen',
    input: { autoComplete: 'off', autoCapitalize: 'none' },
  },
  {
    veld: 'achternaam',
    label: 'Achternaam',
    placeholder: 'Achternaam',
    input: { autoComplete: 'family-name', textContentType: 'familyName', autoCapitalize: 'words' },
  },
  {
    veld: 'email',
    label: 'E-mailadres',
    placeholder: 'naam@voorbeeld.nl',
    input: {
      autoComplete: 'email',
      textContentType: 'emailAddress',
      keyboardType: 'email-address',
      autoCapitalize: 'none',
      autoCorrect: false,
    },
  },
];

function waardenVan(user: User | null): Waarden {
  return {
    voornaam: user?.voornaam ?? '',
    tussenvoegsels: user?.tussenvoegsels ?? '',
    achternaam: user?.achternaam ?? '',
    email: user?.email ?? '',
  };
}

export default function ProfielScreen() {
  const { user, refreshUser, logout } = useAuth();
  const kaarten = useApiData(getProfielKaarten, []);

  const [waarden, setWaarden] = useState(() => waardenVan(user));
  const [fouten, setFouten] = useState<Fouten>({});
  const [fout, setFout] = useState<string | null>(null);
  const [opslaan, setOpslaan] = useState(false);
  const [uitloggen, setUitloggen] = useState(false);

  // When the user in the auth context changes (e.g. after saving), show its values again.
  const [vorigeUser, setVorigeUser] = useState(user);
  if (user !== vorigeUser) {
    setVorigeUser(user);
    setWaarden(waardenVan(user));
    setFouten({});
  }

  const opgeslagen = waardenVan(user);
  const gewijzigd = VELDEN.some(({ veld }) => waarden[veld].trim() !== opgeslagen[veld].trim());

  const wijzig = (veld: Veld, waarde: string) => {
    setWaarden((w) => ({ ...w, [veld]: waarde }));
    if (fouten[veld]) setFouten((f) => ({ ...f, [veld]: undefined }));
  };

  const herstel = () => {
    setWaarden(opgeslagen);
    setFouten({});
    setFout(null);
  };

  const bewaar = async () => {
    if (!gewijzigd || opslaan) return;
    const schoon = {
      voornaam: waarden.voornaam.trim(),
      tussenvoegsels: waarden.tussenvoegsels.trim(),
      achternaam: waarden.achternaam.trim(),
      email: waarden.email.trim(),
    };

    const nieuweFouten: Fouten = {};
    if (!schoon.voornaam) nieuweFouten.voornaam = 'Vul je voornaam in.';
    if (!schoon.achternaam) nieuweFouten.achternaam = 'Vul je achternaam in.';
    if (!schoon.email) nieuweFouten.email = 'Vul je e-mailadres in.';
    else if (!lijktOpEmail(schoon.email)) nieuweFouten.email = 'Vul een geldig e-mailadres in.';
    setFout(null);
    setFouten(nieuweFouten);
    if (Object.keys(nieuweFouten).length > 0) return;

    setOpslaan(true);
    try {
      await updateProfiel({ ...schoon, tussenvoegsels: schoon.tussenvoegsels || null });
      await refreshUser();
      meld('Gegevens opgeslagen', 'Je persoonlijke gegevens zijn bijgewerkt.');
    } catch (err) {
      const server = veldFouten(err);
      const perVeld: Fouten = {};
      for (const { veld } of VELDEN) if (server[veld]) perVeld[veld] = server[veld];
      if (Object.keys(perVeld).length > 0) setFouten(perVeld);
      else setFout(foutmelding(err, 'Opslaan lukt niet. Probeer het later opnieuw.'));
    } finally {
      setOpslaan(false);
    }
  };

  const logUit = async () => {
    const zeker = await bevestig('Uitloggen', 'Weet je zeker dat je wilt uitloggen?', {
      bevestigLabel: 'Uitloggen',
      destructief: true,
    });
    if (!zeker) return;
    setUitloggen(true);
    try {
      await logout(); // The auth guard in _layout.tsx navigates to /login.
    } finally {
      setUitloggen(false);
    }
  };

  return (
    <Screen gap={22} onRefresh={kaarten.loading ? undefined : kaarten.refresh} refreshing={kaarten.refreshing}>
      <TabTitle>Profiel</TabTitle>

      <View>
        <SectionLabel>Persoonlijke gegevens</SectionLabel>
        <Card radius={20} className="overflow-hidden">
          {VELDEN.map(({ veld, label, placeholder, input }, i) => (
            <VeldRij
              key={veld}
              label={label}
              placeholder={placeholder}
              value={waarden[veld]}
              onChangeText={(waarde) => wijzig(veld, waarde)}
              fout={fouten[veld]}
              last={i === VELDEN.length - 1}
              editable={!opslaan}
              onSubmitEditing={() => void bewaar()}
              {...input}
            />
          ))}
        </Card>
        {fout ? (
          <View className="mt-3">
            <ErrorBanner message={fout} />
          </View>
        ) : null}
        {gewijzigd ? (
          <View className="mt-3 flex-row gap-3">
            <Button title="Annuleren" variant="secondary" onPress={herstel} disabled={opslaan} className="flex-1" />
            <Button title="Opslaan" onPress={() => void bewaar()} loading={opslaan} className="flex-1" />
          </View>
        ) : null}
        <Button
          title="Wachtwoord wijzigen"
          variant="secondary"
          onPress={() => router.push('/wachtwoord')}
          className="mt-3"
        />
      </View>

      <View>
        <SectionLabel>Bankkaart</SectionLabel>
        <Card variant="dashed" radius={20} className="flex-row items-center gap-3 p-[18px]">
          <IconBox icon="card" variant="muted" />
          <View className="min-w-0 flex-1">
            <Text className="text-[15px] font-semibold text-zinc-50">Nog geen bankkaart gekoppeld</Text>
            <Text className="mt-0.5 text-xs leading-[18px] text-zinc-400">
              Je bankkaart wordt toegevoegd bij je eerste betaling via Mollie. Dat komt in een volgende versie van
              LagaPay.
            </Text>
          </View>
        </Card>
      </View>

      <View>
        <SectionLabel>Kaarten</SectionLabel>
        {kaarten.loading ? (
          <Card radius={20} className="items-center py-6">
            <ActivityIndicator color={kleuren.purple300} />
          </Card>
        ) : !kaarten.data ? (
          <ErrorState message={kaarten.error ?? ''} title="Kaarten laden lukt niet" onRetry={kaarten.reload} />
        ) : (
          <KaartenLijst kaarten={kaarten.data} />
        )}
      </View>

      <Button title="Uitloggen" variant="danger" onPress={() => void logUit()} loading={uitloggen} />
    </Screen>
  );
}

// ---------------------------------------------------------------------------------------------

type VeldRijProps = ComponentProps<typeof TextInput> & {
  label: string;
  fout?: string;
  last: boolean;
};

/** Design field row (label left, value right), with the value as an inline text input. */
function VeldRij({ label, fout, last, ...input }: VeldRijProps) {
  const [focus, setFocus] = useState(false);
  const labelKleur = fout ? 'text-rose-300' : focus ? 'text-purple-300' : 'text-zinc-400';

  return (
    <View className={`px-[18px] py-3 ${last ? '' : 'border-b border-zinc-800'} ${focus ? 'bg-zinc-800/40' : ''}`}>
      <View className="flex-row items-center gap-3">
        <Text className={`shrink-0 text-[13px] ${labelKleur}`}>{label}</Text>
        <TextInput
          {...input}
          accessibilityLabel={label}
          placeholderTextColor={kleuren.zinc500}
          selectionColor={kleuren.purple300}
          returnKeyType="done"
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          className="min-w-0 flex-1 p-0 text-right text-[15px] font-semibold text-zinc-50"
          // Web: no browser focus ring; the row shows the focus instead.
          style={{ outlineWidth: 0 }}
        />
      </View>
      {fout ? <Text className="mt-1 text-right text-xs text-rose-300">{fout}</Text> : null}
    </View>
  );
}

function KaartenLijst({ kaarten }: { kaarten: ProfielKaarten }) {
  const { permanente_kaart: permanent, tijdelijke_kaarten: tijdelijk } = kaarten;

  return (
    <Card radius={20} className="overflow-hidden">
      <View className="flex-row items-center gap-3 border-b border-zinc-800 px-[18px] py-3.5">
        <IconBox icon="card" variant={permanent ? 'accent' : 'muted'} />
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="text-[15px] font-semibold text-zinc-50">
            {permanent ? 'Permanente kaart' : 'Nog geen permanente kaart'}
          </Text>
          <Text numberOfLines={2} className={`mt-0.5 text-xs text-zinc-400 ${permanent ? 'font-mono' : ''}`}>
            {permanent
              ? `UID ${maskUid(permanent.uid_laatste4)} · alle evenementen`
              : 'Een permanente kaart werkt bij al je evenementen.'}
          </Text>
        </View>
        {/* Wrapped: Pill aligns itself to the top (self-start); the View is centered by the row. */}
        {permanent ? (
          <View className="shrink-0">
            <StatusPill status={permanent.status} />
          </View>
        ) : null}
      </View>

      <Text className="px-[18px] pb-1.5 pt-3 text-[11px] font-semibold uppercase tracking-[0.8px] text-zinc-400">
        Tijdelijke kaarten
      </Text>
      {tijdelijk.length === 0 ? (
        <Text className="px-[18px] pb-3.5 pt-2.5 text-[13px] text-zinc-400">Nog geen tijdelijke kaarten</Text>
      ) : (
        tijdelijk.map((kaart, i) => (
          <TijdelijkeKaartRij key={kaart.id} kaart={kaart} eerste={i === 0} last={i === tijdelijk.length - 1} />
        ))
      )}
    </Card>
  );
}

function TijdelijkeKaartRij({ kaart, eerste, last }: { kaart: Kaart; eerste: boolean; last: boolean }) {
  return (
    <View
      className={`flex-row items-center gap-3 px-[18px] pb-3.5 ${eerste ? 'pt-2.5' : 'pt-3.5'} ${
        last ? '' : 'border-b border-zinc-800'
      }`}
    >
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-[15px] font-semibold text-zinc-50">
          Tijdelijke kaart
        </Text>
        <Text numberOfLines={1} className="mt-0.5 text-xs text-zinc-400">
          {`${kaart.evenement?.naam ?? 'Evenement'} · ${maskUid(kaart.uid_laatste4)}`}
        </Text>
      </View>
      <View className="shrink-0">
        <StatusPill status={kaart.status} />
      </View>
    </View>
  );
}
