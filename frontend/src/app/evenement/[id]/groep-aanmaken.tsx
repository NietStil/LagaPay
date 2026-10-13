// Groep aanmaken (from the Groep tab when I'm not in a groep). No design: same look as the other form screens.
// Groepen are made by visitors in the app, never in the dashboard.

import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import {
  Button,
  EmptyState,
  ErrorBanner,
  ErrorState,
  InfoNote,
  LoadingState,
  Screen,
  ScreenHeader,
  kleuren,
} from '@/components/lagapay';
import { veldFouten } from '@/components/tabs/veld-fouten';
import { useApiData } from '@/hooks/use-api-data';
import { foutmelding, getEvenementOverzicht, maakGroep } from '@/lib/api/lagapay';

const MAX_LENGTE = 50;

export default function GroepAanmakenScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, loading, reload } = useApiData(() => getEvenementOverzicht(id), [id]);

  const [naam, setNaam] = useState('');
  const [veldFout, setVeldFout] = useState<string | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);
  const [focus, setFocus] = useState(false);

  const kop = <ScreenHeader title="Groep aanmaken" subtitle={data?.evenement.naam} fallbackHref={`/evenement/${id}/groep`} />;

  if (loading) {
    return (
      <Screen>
        {kop}
        <LoadingState />
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen>
        {kop}
        <ErrorState message={error ?? ''} onRetry={reload} />
      </Screen>
    );
  }

  // Only reachable from the Groep tab's empty state, but a stale screen or deep link can land here too.
  if (data.groep || !data.evenement.open) {
    return (
      <Screen>
        {kop}
        <EmptyState
          icon="user"
          title={data.groep ? 'Je zit al in een groep' : 'Dit evenement is gesloten'}
          text={
            data.groep
              ? `Je bent lid van ${data.groep.naam}. Per evenement zit je in één groep.`
              : 'In een gesloten evenement kun je geen groep meer aanmaken.'
          }
          action={<Button title="Naar de groep" onPress={() => router.replace(`/evenement/${id}/groep`)} />}
        />
      </Screen>
    );
  }

  const maak = async () => {
    if (bezig) return;
    const schoon = naam.trim();
    if (!schoon) {
      setVeldFout('Geef je groep een naam.');
      return;
    }
    setVeldFout(null);
    setFout(null);
    setBezig(true);
    try {
      await maakGroep(id, schoon);
      // The Groep tab refetches when it regains focus and then shows the new groep with its uitnodigingslink.
      router.back();
    } catch (err) {
      const server = veldFouten(err);
      if (server.naam) setVeldFout(server.naam);
      else setFout(foutmelding(err, 'Groep aanmaken lukt niet. Probeer het later opnieuw.'));
      setBezig(false);
    }
  };

  const rand = veldFout ? 'border-rose-800' : focus ? 'border-purple-700' : 'border-zinc-800';

  return (
    <Screen gap={22}>
      {kop}

      {fout ? <ErrorBanner message={fout} /> : null}

      <View>
        <Text className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-zinc-300">Naam van je groep</Text>
        <TextInput
          value={naam}
          onChangeText={(waarde) => {
            setNaam(waarde);
            if (veldFout) setVeldFout(null);
          }}
          accessibilityLabel="Naam van je groep"
          placeholder="Bijvoorbeeld Team Rood"
          placeholderTextColor={kleuren.zinc500}
          selectionColor={kleuren.purple300}
          maxLength={MAX_LENGTE}
          autoFocus
          autoCapitalize="sentences"
          returnKeyType="done"
          onSubmitEditing={() => void maak()}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          className={`w-full rounded-2xl border bg-zinc-900 px-4 py-4 text-base text-white ${rand}`}
          // Web: no browser focus ring; the border shows the focus instead.
          style={{ outlineWidth: 0 }}
        />
        {veldFout ? <Text className="mt-2 text-[13px] text-rose-300">{veldFout}</Text> : null}
      </View>

      <InfoNote icon="link">
        Je wordt het eerste lid van de groep. Daarna deel je de uitnodigingslink of QR-code met je vrienden, zodat ze
        kunnen meedoen en samen met het groepssaldo betalen.
      </InfoNote>

      <Button title="Groep aanmaken" icon="plus" onPress={() => void maak()} loading={bezig} disabled={!naam.trim()} />
    </Screen>
  );
}
