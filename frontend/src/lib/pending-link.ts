// Remembers a join deep link (/e/{code} or /g/{code}) that was opened while logged out,
// so the auth guard in src/app/_layout.tsx can continue to it after login/registration.

import AsyncStorage from '@react-native-async-storage/async-storage';

const SLEUTEL = 'lagapay.pendingLink';
/** A pending link older than this is ignored (e.g. the user gave up and logged in much later). */
const MAX_LEEFTIJD_MS = 60 * 60 * 1000;

const PAD_PATROON = /^\/(e|g)\/[A-Za-z0-9_-]+\/?$/;

/** True for app paths that may be stored as pending link: "/e/{code}" or "/g/{code}". */
export function isPendingLinkPad(pad: string): boolean {
  return PAD_PATROON.test(pad);
}

/** Stores `pad` (e.g. "/e/AbC123") if it is a join link. */
export async function setPendingLink(pad: string): Promise<void> {
  if (!isPendingLinkPad(pad)) return;
  try {
    await AsyncStorage.setItem(SLEUTEL, JSON.stringify({ pad, tijd: Date.now() }));
  } catch {}
}

/** Returns the stored pending link (if still fresh) and clears it. */
export async function takePendingLink(): Promise<string | null> {
  try {
    const waarde = await AsyncStorage.getItem(SLEUTEL);
    if (!waarde) return null;
    await AsyncStorage.removeItem(SLEUTEL);
    const { pad, tijd } = JSON.parse(waarde) as { pad?: unknown; tijd?: unknown };
    if (typeof pad !== 'string' || !isPendingLinkPad(pad)) return null;
    if (typeof tijd !== 'number' || Date.now() - tijd > MAX_LEEFTIJD_MS) return null;
    return pad;
  } catch {
    return null;
  }
}

export async function clearPendingLink(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SLEUTEL);
  } catch {}
}
