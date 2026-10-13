// Cross-platform alerts. React Native's Alert.alert is a no-op on react-native-web,
// so on web these fall back to window.alert / window.confirm.

import { Alert, Platform } from 'react-native';

/** Shows a simple message with an OK button. */
export function meld(titel: string, tekst?: string): void {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(tekst ? `${titel}\n\n${tekst}` : titel);
    return;
  }
  Alert.alert(titel, tekst);
}

/**
 * Asks for confirmation. Resolves `true` when the user confirms.
 * `destructief` styles the confirm button red on iOS.
 */
export function bevestig(
  titel: string,
  tekst: string,
  opties: { bevestigLabel?: string; annuleerLabel?: string; destructief?: boolean } = {},
): Promise<boolean> {
  const { bevestigLabel = 'OK', annuleerLabel = 'Annuleren', destructief = false } = opties;

  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return Promise.resolve(false);
    return Promise.resolve(window.confirm(`${titel}\n\n${tekst}`));
  }

  return new Promise((resolve) => {
    Alert.alert(
      titel,
      tekst,
      [
        { text: annuleerLabel, style: 'cancel', onPress: () => resolve(false) },
        { text: bevestigLabel, style: destructief ? 'destructive' : 'default', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

/**
 * For actions that need Mollie or NFC (opwaarderen, afrekenen, terugstorten, betalen, kaart scannen).
 * Those are out of scope for now; this tells the user they're coming later.
 *
 * @param onderwerp What the user tried, e.g. "Opwaarderen", "Afrekenen", "Terugstorten".
 */
export function nietBeschikbaar(onderwerp = 'Deze functie'): void {
  meld(
    'Nog niet beschikbaar',
    `${onderwerp} kan nog niet in de app. Betalen via Mollie en betalen of kaarten koppelen met NFC komen in een volgende versie van LagaPay.`,
  );
}
