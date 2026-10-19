// Where an evenement or groep link leads. Used by the deep links (e/[code], g/[code]) and the QR scanner.
//
// Evenementen without tickets: the link makes you a deelnemer right away. Evenementen with tickets: you
// first get the tickets screen; scanning your ticket at the entrance makes you a deelnemer (opening the link
// then opens the evenement). Rules: app-design/API.md, "Deelname".

import { accepteerTicketUitnodiging, bekijkEvenement, joinEvenement, joinGroep } from '@/lib/api/lagapay';
import type { DeelnameWeigering } from '@/lib/api/types';

export interface LinkBestemming {
  evenementId: number;
  /** Open the evenement's tickets screen instead of the evenement (or its groep). */
  naarTickets: boolean;
}

/** Opens an evenement link: joins when allowed now, otherwise points to the tickets screen. */
export async function openEvenementLink(code: string): Promise<LinkBestemming> {
  const { evenement, deelname } = await bekijkEvenement(code);

  if (deelname.is_deelnemer) {
    return { evenementId: evenement.id, naarTickets: false };
  }
  if (deelname.kan_deelnemen) {
    await joinEvenement(code);
    return { evenementId: evenement.id, naarTickets: false };
  }
  return { evenementId: evenement.id, naarTickets: true };
}

/**
 * Opens a friend's ticket link: takes the ticket (joining only once it is scanned at the entrance). Until then, or when
 * it's my own link, the tickets screen shows the state (own link: my QR codes).
 */
export async function openTicketLink(code: string): Promise<LinkBestemming> {
  const { resultaat, evenement, deelname } = await accepteerTicketUitnodiging(code);

  if (resultaat === 'eigen_link') {
    return { evenementId: evenement.id, naarTickets: true };
  }
  return { evenementId: evenement.id, naarTickets: !deelname.is_deelnemer };
}

/**
 * Opens a groep link: joins the groep (and its evenement). When that needs a ticket first, or a scan of it,
 * points to the evenement's tickets screen. Other errors are thrown as usual.
 */
export async function openGroepLink(code: string): Promise<LinkBestemming> {
  try {
    const { evenement_id } = await joinGroep(code);
    return { evenementId: evenement_id, naarTickets: false };
  } catch (err: any) {
    const weigering: Partial<DeelnameWeigering> | undefined = err?.response?.data;
    if (
      err?.response?.status === 403 &&
      typeof weigering?.evenement_id === 'number' &&
      (weigering.reden === 'ticket_nodig' || weigering.reden === 'niet_gescand')
    ) {
      return { evenementId: weigering.evenement_id, naarTickets: true };
    }
    throw err;
  }
}
