// Screen 4 — Evenement toevoegen (Toevoegen.dc.html): join an evenement or groep by scanning its QR code.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { CameraView, PermissionStatus, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router, useIsFocused } from 'expo-router';

import {
  Button,
  ErrorBanner,
  IconBox,
  InfoNote,
  Screen,
  ScreenHeader,
  TabTitle,
  kleuren,
  type IconName,
} from '@/components/lagapay';
import { foutmelding } from '@/lib/api/lagapay';
import { openEvenementLink, openGroepLink } from '@/lib/deelnemen';
import { parseLagaPayLink } from '@/lib/links';

/** The same QR code is ignored for this long after it was handled (the camera reports it every frame). */
const ZELFDE_CODE_PAUZE_MS = 4000;

export default function ToevoegenScreen() {
  const isFocused = useIsFocused();
  const [permissie, vraagPermissie] = useCameraPermissions();
  // Web only: is there a camera at all? Native devices always have one.
  const [cameraAanwezig, setCameraAanwezig] = useState<boolean | null>(Platform.OS === 'web' ? null : true);
  const [cameraFout, setCameraFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  const bezigRef = useRef(false);
  const vorigeScanRef = useRef<{ data: string; tijd: number } | null>(null);
  const automatischGevraagdRef = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let actief = true;
    CameraView.isAvailableAsync().then(
      (aanwezig) => actief && setCameraAanwezig(aanwezig),
      () => actief && setCameraAanwezig(false),
    );
    return () => {
      actief = false;
    };
  }, []);

  // Ask for the camera once, automatically, when the user was never asked before.
  useEffect(() => {
    if (!cameraAanwezig || !permissie || automatischGevraagdRef.current) return;
    if (permissie.status === PermissionStatus.UNDETERMINED && permissie.canAskAgain) {
      automatischGevraagdRef.current = true;
      void vraagPermissie();
    }
  }, [cameraAanwezig, permissie, vraagPermissie]);

  const verwerkScan = async ({ data }: BarcodeScanningResult) => {
    if (bezigRef.current) return;
    const nu = Date.now();
    const vorige = vorigeScanRef.current;
    if (vorige && vorige.data === data && nu - vorige.tijd < ZELFDE_CODE_PAUZE_MS) return;
    vorigeScanRef.current = { data, tijd: nu };

    const link = parseLagaPayLink(data);
    if (!link) {
      setFout('Deze QR-code is geen LagaPay-link. Scan de QR-code van het evenement.');
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

  let scanInhoud: ReactNode;
  if (cameraAanwezig === false) {
    scanInhoud = (
      <ScanMelding
        icon="camera"
        titel="Geen camera gevonden"
        tekst="Scan de QR-code met de LagaPay-app op je telefoon, of open de link uit de QR-code op dit apparaat."
      />
    );
  } else if (cameraFout) {
    scanInhoud = (
      <ScanMelding
        icon="camera"
        titel="De camera kan niet starten"
        tekst={cameraFout}
        actie={<Button title="Opnieuw proberen" variant="secondary" onPress={() => setCameraFout(null)} />}
      />
    );
  } else if (!permissie || cameraAanwezig === null) {
    scanInhoud = <ActivityIndicator size="large" color={kleuren.purple300} />;
  } else if (!permissie.granted) {
    if (permissie.canAskAgain) {
      scanInhoud = (
        <ScanMelding
          icon="camera"
          titel="Cameratoegang nodig"
          tekst="LagaPay gebruikt de camera om de QR-code van het evenement te scannen."
          actie={<Button title="Camera toestaan" onPress={() => void vraagPermissie()} />}
        />
      );
    } else {
      scanInhoud =
        Platform.OS === 'web' ? (
          <ScanMelding
            icon="camera"
            titel="Geen toegang tot de camera"
            tekst="Sta cameratoegang voor deze site toe in de instellingen van je browser en probeer het opnieuw."
            actie={<Button title="Opnieuw proberen" variant="secondary" onPress={() => void vraagPermissie()} />}
          />
        ) : (
          <ScanMelding
            icon="camera"
            titel="Geen toegang tot de camera"
            tekst="Zet cameratoegang voor LagaPay aan in de instellingen van je telefoon."
            actie={<Button title="Open instellingen" variant="secondary" onPress={() => void Linking.openSettings()} />}
          />
        );
    }
  } else {
    scanInhoud = (
      <>
        {isFocused ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={bezig ? undefined : verwerkScan}
            onMountError={(e) => setCameraFout(e.message || 'Probeer het opnieuw.')}
          />
        ) : null}
        <ScanKader />
        <View className="pointer-events-none absolute bottom-5 left-0 right-0 items-center">
          <View className="rounded-full bg-zinc-950/70 px-3 py-1.5">
            <Text className="text-[13px] text-zinc-300">Houd de QR-code binnen het kader</Text>
          </View>
        </View>
        {bezig ? (
          <View className="absolute inset-0 items-center justify-center gap-3 bg-zinc-950/80">
            <ActivityIndicator size="large" color={kleuren.purple300} />
            <Text className="text-[15px] font-semibold text-zinc-50">Bezig met toevoegen…</Text>
          </View>
        ) : null}
      </>
    );
  }

  return (
    <Screen gap={24}>
      <ScreenHeader />

      <View>
        <TabTitle>Evenement toevoegen</TabTitle>
        <Text className="mt-2 text-[15px] leading-[22px] text-zinc-400">
          Scan de QR-code van het evenement om deel te nemen.
        </Text>
      </View>

      <View className="h-[420px] items-center justify-center overflow-hidden rounded-[28px] border border-zinc-800 bg-[#131316]">
        {scanInhoud}
      </View>

      {fout ? <ErrorBanner message={fout} /> : null}

      <InfoNote icon="link">
        Heb je een link gekregen? Open die op je telefoon, dan kom je vanzelf bij het evenement.
      </InfoNote>
    </Screen>
  );
}

/** 240x240 frame with purple-300 corners and a purple-700 scan line. */
function ScanKader() {
  return (
    <View className="pointer-events-none h-60 w-60">
      <View className="absolute left-0 top-0 h-11 w-11 rounded-tl-2xl border-l-[5px] border-t-[5px] border-purple-300" />
      <View className="absolute right-0 top-0 h-11 w-11 rounded-tr-2xl border-r-[5px] border-t-[5px] border-purple-300" />
      <View className="absolute bottom-0 left-0 h-11 w-11 rounded-bl-2xl border-b-[5px] border-l-[5px] border-purple-300" />
      <View className="absolute bottom-0 right-0 h-11 w-11 rounded-br-2xl border-b-[5px] border-r-[5px] border-purple-300" />
      <View className="absolute left-6 right-6 top-1/2 h-0.5 rounded-sm bg-purple-700" />
    </View>
  );
}

/** Message inside the scan area (no camera, no permission, camera error). */
function ScanMelding({ icon, titel, tekst, actie }: { icon: IconName; titel: string; tekst: string; actie?: ReactNode }) {
  return (
    <View className="w-full items-center gap-3.5 px-6">
      <IconBox icon={icon} variant="muted" size={52} />
      <View className="items-center">
        <Text className="text-center text-base font-semibold text-zinc-50">{titel}</Text>
        <Text className="mt-1 text-center text-[13px] leading-5 text-zinc-400">{tekst}</Text>
      </View>
      {actie ? <View className="self-stretch">{actie}</View> : null}
    </View>
  );
}
