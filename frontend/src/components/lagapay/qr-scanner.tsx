import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { CameraView, PermissionStatus, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useIsFocused } from 'expo-router';

import { Button } from './button';
import { IconBox } from './card';
import { type IconName } from './icon';
import { kleuren } from './kleuren';

/** The same QR code is ignored for this long after it was handled (the camera reports it every frame). */
const ZELFDE_CODE_PAUZE_MS = 4000;

export interface QrScannerProps {
  /** Called once per scanned QR code (the same code again only after a pause). Not called while `bezig`. */
  onScan: (data: string) => void;
  /** Shows an overlay with a spinner and `bezigLabel`, and stops scanning. */
  bezig?: boolean;
  bezigLabel?: string;
  /** Hint at the bottom of the camera view. Default "Houd de QR-code binnen het kader". */
  hint?: string;
  /** Why the camera is needed, shown while asking for permission. */
  waarom: string;
  /** Shown on devices without a camera (web). */
  geenCameraTekst: string;
}

/**
 * QR scanner area content: camera with the purple frame, plus every state around it (no camera, asking for
 * permission, denied, camera error). Place it inside a sized container with `overflow-hidden` and centered
 * content (Evenement toevoegen, Terminal koppelen, terminal Scan tab). Asks for the camera once by itself.
 */
export function QrScanner({
  onScan,
  bezig = false,
  bezigLabel = 'Bezig…',
  hint = 'Houd de QR-code binnen het kader',
  waarom,
  geenCameraTekst,
}: QrScannerProps) {
  const isFocused = useIsFocused();
  const [permissie, vraagPermissie] = useCameraPermissions();
  // Web only: is there a camera at all? Native devices always have one.
  const [cameraAanwezig, setCameraAanwezig] = useState<boolean | null>(Platform.OS === 'web' ? null : true);
  const [cameraFout, setCameraFout] = useState<string | null>(null);

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

  const verwerkScan = ({ data }: BarcodeScanningResult) => {
    const nu = Date.now();
    const vorige = vorigeScanRef.current;
    if (vorige && vorige.data === data && nu - vorige.tijd < ZELFDE_CODE_PAUZE_MS) return;
    vorigeScanRef.current = { data, tijd: nu };
    onScan(data);
  };

  if (cameraAanwezig === false) {
    return <ScanMelding icon="camera" titel="Geen camera gevonden" tekst={geenCameraTekst} />;
  }
  if (cameraFout) {
    return (
      <ScanMelding
        icon="camera"
        titel="De camera kan niet starten"
        tekst={cameraFout}
        actie={<Button title="Opnieuw proberen" variant="secondary" onPress={() => setCameraFout(null)} />}
      />
    );
  }
  if (!permissie || cameraAanwezig === null) {
    return <ActivityIndicator size="large" color={kleuren.purple300} />;
  }
  if (!permissie.granted) {
    if (permissie.canAskAgain) {
      return (
        <ScanMelding
          icon="camera"
          titel="Cameratoegang nodig"
          tekst={waarom}
          actie={<Button title="Camera toestaan" onPress={() => void vraagPermissie()} />}
        />
      );
    }
    return Platform.OS === 'web' ? (
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

  return (
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
          <Text className="text-[13px] text-zinc-300">{hint}</Text>
        </View>
      </View>
      {bezig ? (
        <View className="absolute inset-0 items-center justify-center gap-3 bg-zinc-950/80">
          <ActivityIndicator size="large" color={kleuren.purple300} />
          <Text className="text-[15px] font-semibold text-zinc-50">{bezigLabel}</Text>
        </View>
      ) : null}
    </>
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
