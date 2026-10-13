// Typed LagaPay API calls. Endpoint contract: app-design/API.md.

import apiClient from '@/lib/api/client';
import type {
  EvenementBasis,
  EvenementBekeken,
  EvenementKaarten,
  EvenementOverzicht,
  EvenementSamenvatting,
  EvenementTickets,
  GroepDetail,
  GroepJoinResultaat,
  KaartSoort,
  PersoonlijkOfGroep,
  MijnTickets,
  ProfielKaarten,
  ProfielUpdate,
  Transactie,
  TransactieFilter,
  User,
  WachtwoordUpdate,
} from '@/lib/api/types';

export async function getEvenementen(): Promise<EvenementSamenvatting[]> {
  const res = await apiClient.get('/evenementen');
  return res.data.evenementen;
}

/** Opening an evenement link: the evenement and my deelname status, without joining. */
export async function bekijkEvenement(code: string): Promise<EvenementBekeken> {
  const res = await apiClient.post('/evenementen/bekijk', { code });
  return res.data;
}

export async function joinEvenement(code: string): Promise<EvenementBasis> {
  const res = await apiClient.post('/evenementen/join', { code });
  return res.data.evenement;
}

/** "Deelnemen" on the tickets screen, once I have a ticket and the evenement has started. */
export async function deelnemen(evenementId: number | string): Promise<EvenementBasis> {
  const res = await apiClient.post(`/evenementen/${evenementId}/deelnemen`);
  return res.data.evenement;
}

export async function getEvenementOverzicht(id: number | string): Promise<EvenementOverzicht> {
  const res = await apiClient.get(`/evenementen/${id}`);
  return res.data;
}

/** Test betaling (no Mollie yet): adds the munten straight away. Returns the new saldo of that wallet. */
export async function opwaarderen(
  evenementId: number | string,
  munten: number,
  voor: PersoonlijkOfGroep,
): Promise<number> {
  const res = await apiClient.post(`/evenementen/${evenementId}/opwaarderen`, { munten, voor });
  return res.data.saldo;
}

export async function getTransacties(
  id: number | string,
  filter: TransactieFilter = 'alles',
): Promise<Transactie[]> {
  const res = await apiClient.get(`/evenementen/${id}/transacties`, { params: { filter } });
  return res.data.transacties;
}

export async function getGroep(evenementId: number | string): Promise<GroepDetail | null> {
  const res = await apiClient.get(`/evenementen/${evenementId}/groep`);
  return res.data.groep;
}

/** Creates a groep in this evenement with me as its first lid; returns the new groep (same shape as getGroep). */
export async function maakGroep(evenementId: number | string, naam: string): Promise<GroepDetail> {
  const res = await apiClient.post(`/evenementen/${evenementId}/groepen`, { naam });
  return res.data.groep;
}

export async function joinGroep(code: string): Promise<GroepJoinResultaat> {
  const res = await apiClient.post('/groepen/join', { code });
  return res.data;
}

export async function getProfielKaarten(): Promise<ProfielKaarten> {
  const res = await apiClient.get('/kaarten');
  return res.data;
}

export async function getEvenementKaarten(evenementId: number | string): Promise<EvenementKaarten> {
  const res = await apiClient.get(`/evenementen/${evenementId}/kaarten`);
  return res.data;
}

export async function koppelPermanenteKaart(
  evenementId: number | string,
  soort: KaartSoort,
): Promise<EvenementKaarten> {
  const res = await apiClient.post(`/evenementen/${evenementId}/kaarten/permanent`, { soort });
  return res.data;
}

export async function getMijnTickets(): Promise<MijnTickets> {
  const res = await apiClient.get('/tickets');
  return res.data;
}

export async function getEvenementTickets(evenementId: number | string): Promise<EvenementTickets> {
  const res = await apiClient.get(`/evenementen/${evenementId}/tickets`);
  return res.data;
}

/** Test betaling (no Mollie yet): the ticket is mine straight away. Returns the updated tickets screen data. */
export async function koopTicket(evenementId: number | string, ticketId: number): Promise<EvenementTickets> {
  const res = await apiClient.post(`/evenementen/${evenementId}/tickets/${ticketId}/kopen`);
  return res.data;
}

export async function updateProfiel(data: ProfielUpdate): Promise<User> {
  const res = await apiClient.put('/profiel', data);
  return res.data.user;
}

export async function updateWachtwoord(data: WachtwoordUpdate): Promise<string> {
  const res = await apiClient.put('/profiel/wachtwoord', data);
  return res.data.message;
}

/**
 * Dutch message for an apiClient error: the first Laravel validation error or the API's `{ message }`.
 * Network failures and 5xx responses get a Dutch text instead of the English framework/browser text
 * ("Failed to fetch", "Server Error").
 */
export function foutmelding(err: any, fallback = 'Er ging iets mis. Probeer het opnieuw.'): string {
  const status: number | undefined = err?.response?.status;

  if (status === undefined) {
    // apiClient marks native network failures with ERR_NETWORK; fetch on web throws a TypeError.
    if (err?.code === 'ERR_NETWORK' || err instanceof TypeError) {
      return 'Geen verbinding met LagaPay. Controleer je internet en probeer het opnieuw.';
    }
    return err?.message || fallback;
  }

  if (status >= 500) return fallback;

  const errors = err.response.data?.errors;
  if (errors && typeof errors === 'object') {
    const first = Object.values(errors)[0];
    if (Array.isArray(first) && typeof first[0] === 'string') return first[0];
  }
  const message = err.response.data?.message;
  return typeof message === 'string' && message ? message : fallback;
}
