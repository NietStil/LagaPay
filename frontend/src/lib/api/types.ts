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

/** Whether I am, or may now become, a deelnemer. Evenementen with tickets need a ticket and must have started. */
export interface Deelname {
  is_deelnemer: boolean;
  heeft_ticket: boolean;
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
  reden: 'gesloten' | 'geblokkeerd' | 'ticket_nodig' | 'niet_gestart';
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

export interface GekochtTicket {
  id: number;
  naam: string;
  prijs: string;
  munten: number | null;
  status: 'geldig' | 'verlopen';
  evenement: {
    id: number;
    naam: string;
    start_datum: string;
    eind_datum: string;
    open: boolean;
    /** false: "Bekijk" opens the tickets screen, with "Deelnemen" once the evenement has started. */
    is_deelnemer: boolean;
  };
}

export interface RecentBekeken {
  id: number;
  naam: string;
  start_datum: string;
  eind_datum: string;
  vanaf_prijs: string | null;
}

export interface MijnTickets {
  gekocht: GekochtTicket[];
  recent_bekeken: RecentBekeken[];
}

export interface TicketType {
  id: number;
  naam: string;
  prijs: string;
  munten: number | null;
  gekocht: boolean;
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
