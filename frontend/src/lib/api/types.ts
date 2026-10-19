// Response shapes of the LagaPay API. Keep in sync with app-design/API.md.

import type { User } from '@/context/auth-context';

export interface EvenementBasis {
  id: number;
  naam: string;
  open: boolean;
  start_datum: string;
  eind_datum: string;
  telefoon_betaling: boolean;
  munten_terugstorten: boolean;
  heeft_tickets: boolean;
  /** Euros per munt, e.g. "1.50". */
  munt_prijs: string;
}

export interface EvenementSamenvatting extends EvenementBasis {
  /** Persoonlijk saldo in munten. */
  saldo: number;
}

/** Whether I am, or may now become, a deelnemer. Evenementen with tickets: the scan of my ticket makes me one. */
export interface Deelname {
  is_deelnemer: boolean;
  heeft_ticket: boolean;
  /** One of my tickets was scanned at the entrance. */
  ticket_gescand: boolean;
  /** start_datum <= now */
  gestart: boolean;
  /** Not a deelnemer yet, and allowed to join right now. */
  kan_deelnemen: boolean;
}

/** Opening an evenement link (POST /evenementen/bekijk). */
export interface EvenementBekeken {
  evenement: EvenementBasis;
  deelname: Deelname;
}

/** 403 body when joining is refused. */
export interface DeelnameWeigering {
  message: string;
  reden: 'gesloten' | 'geblokkeerd' | 'ticket_nodig' | 'niet_gescand';
  evenement_id: number;
}

export interface Transactie {
  id: number;
  type: string;
  label: string;
  /** Signed: positive = munten in, negative = munten out. */
  bedrag: number;
  datum: string;
  /** Set for groepsactiviteit, null for persoonlijke activiteit. */
  gebruiker: { id: number; voornaam: string } | null;
}

export type TransactieFilter = 'alles' | 'opwaarderingen' | 'uitgaven';

export interface EvenementOverzicht {
  evenement: EvenementBasis;
  saldo: number;
  activiteit: Transactie[];
  groep: { id: number; naam: string } | null;
  /** My groep's id when I last switched to the Groep page (then the evenement opens there), otherwise null. */
  betaalbron: number | null;
}

export interface GroepLid {
  id: number;
  naam: string;
  initialen: string;
  is_ik: boolean;
  munten_gekocht: number;
  aandeel: number;
}

export type KaartStatus = 'actief' | 'inactief' | 'verlopen';

export interface Kaart {
  id: number;
  uid_laatste4: string;
  permanent: boolean;
  actief: boolean;
  status: KaartStatus;
  evenement: { id: number; naam: string } | null;
}

export interface GroepDetail {
  id: number;
  naam: string;
  saldo: number;
  uitnodigingslink: string;
  leden: GroepLid[];
  mijn_aandeel: number;
  kaart: Kaart | null;
  activiteit: Transactie[];
}

export interface GroepJoinResultaat {
  groep: { id: number; naam: string };
  evenement_id: number;
}

export interface ProfielKaarten {
  permanente_kaart: Kaart | null;
  tijdelijke_kaarten: Kaart[];
}

export type KaartSoort = 'persoonlijk' | 'groep';

/** Which wallet: my own or my groep's. */
export type PersoonlijkOfGroep = 'persoonlijk' | 'groep';

export interface EvenementKaarten {
  persoonlijk: Kaart | null;
  groep: Kaart | null;
  permanente_kaart: Kaart | null;
  groep_info: { id: number; naam: string } | null;
}

/** Tickets tab: my bought tickets of one evenement. */
export interface GekochteTickets {
  evenement: {
    id: number;
    naam: string;
    start_datum: string;
    eind_datum: string;
    open: boolean;
    is_deelnemer: boolean;
  };
  status: 'geldig' | 'verlopen';
  /** Tickets I bought for this evenement. */
  aantal: number;
  /** Of which scanned at the entrance. */
  aantal_gebruikt: number;
  /** Of which put on offer for friends. */
  aantal_te_geven: number;
  /** Per ticket type, prijs ascending ("2× Dagticket"). */
  soorten: { naam: string; aantal: number }[];
  /** Included munten of all those tickets. */
  munten: number;
}

export interface RecentBekeken {
  id: number;
  naam: string;
  start_datum: string;
  eind_datum: string;
  vanaf_prijs: string | null;
}

export interface MijnTickets {
  gekocht: GekochteTickets[];
  recent_bekeken: RecentBekeken[];
}

export interface TicketType {
  id: number;
  naam: string;
  prijs: string;
  munten: number | null;
  gekocht: boolean;
  /** How many tickets of this type I have. */
  aantal_gekocht: number;
}

/** One line of a ticket order: this many of this ticket type. */
export interface TicketBestelregel {
  id: number;
  aantal: number;
  /** How many of `aantal` are put on offer for friends (default 0). */
  voor_vrienden?: number;
}

/** One bought ticket with its QR code. */
export interface TicketQr {
  id: number;
  code: string;
  /** QR content: "LAGAPAY-TICKET:{code}". */
  qr: string;
  naam: string;
  prijs: string;
  munten: number | null;
  /** Scanned at the entrance. */
  gebruikt: boolean;
  gebruikt_op: string | null;
  /** On offer for a friend. */
  te_geven: boolean;
  /** Can be put on offer (or taken back): mine, unused, evenement open, munten not paid out yet. */
  kan_geven: boolean;
  /** Voornaam of the buyer when a friend gave me this ticket. */
  gekregen_van: string | null;
}

/** My link for handing tickets on offer to friends. */
export interface TicketUitnodiging {
  code: string;
  /** "{link_url}/t/{code}" */
  link: string;
  /** Tickets still on offer. */
  beschikbaar: number;
  /** Tickets friends took. */
  vergeven: number;
  genomen: { naam: string; datum: string }[];
}

export interface EvenementMijnTickets {
  evenement: EvenementBasis;
  tickets: TicketQr[];
  /** null until I put a ticket on offer. */
  uitnodiging: TicketUitnodiging | null;
  deelname: Deelname;
}

/** Opening a buyer's uitnodigingslink. */
export interface TicketUitnodigingResultaat {
  /** gekregen | al_ontvangen (took one before) | al_ticket (own ticket) | eigen_link (my own link) */
  resultaat: 'gekregen' | 'al_ontvangen' | 'al_ticket' | 'eigen_link';
  evenement: EvenementBasis;
  /** Voornaam of the buyer. */
  van: string | null;
  deelname: Deelname;
}

export interface EvenementTickets {
  evenement: EvenementBasis;
  tickets: TicketType[];
  deelname: Deelname;
}

export interface ProfielUpdate {
  voornaam: string;
  tussenvoegsels?: string | null;
  achternaam: string;
  email: string;
}

export interface WachtwoordUpdate {
  huidig_wachtwoord?: string;
  wachtwoord: string;
  wachtwoord_confirmation: string;
}

export type { User };
