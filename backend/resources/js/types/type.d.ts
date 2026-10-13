export interface Gebruiker {
    id: number;
    voornaam: string;
    achternaam: string;
    tussenvoegsels: string | null;
    rol?: 'admin' | 'organizator' | 'gebruiker';
    email: string;
    google_id?: number | string | null;
    kaarten?: Kaart[];
    groepen?: Groep[];
    tickets?: Ticket[];
    munten?: Munt[];
    pivot?: {
        ticket_id?: number;
        groep_id?: number;
    };
}

export interface Evenement {
    id: number;
    naam: string;
    gebruiker?: number | Gebruiker;
    open: boolean;
    start_datum: string | Date | null;
    eind_datum: string | Date | null;
    telefoon_betaling: boolean;
    munten_terugstorten: boolean;
    munt_prijs: number;
    code: string | null;
    groepen_count?: number;
    tickets_count?: number;
    producten_count?: number;
    transacties_count?: number;
    kaarten_count?: number;
    deelnemers_count?: number;
    groepen?: Groep[];
    tickets?: Ticket[];
    producten?: Product[];
    kaarten?: Kaart[];
    deelnemers?: Gebruiker[];
}

export interface Groep {
    id: number;
    naam: string;
    evenement_id: number | Evenement;
    code: string;
    gebruikers_count?: number;
    gebruikers?: Gebruiker[];
    transacties_count?: number;
    munten_sum_hoeveelheid?: number;
    munten: number;
}

export interface Kaart {
    id: number;
    uid: string;
    type: 'persoonlijk' | 'tijdelijk';
    actief: boolean;
    evenement_id: null | number | Evenement;
    gebruiker_id: null | number | Gebruiker;
    gebruiker?: Gebruiker;
}

export interface Transactie {
    id: number;
    gebruiker_id: number | Gebruiker;
    evenement_id: number | Evenement;
    groep_id: null | number | Groep;
    hoeveelheid: number;
    type: 'opwaardering' | 'uitgave';
    created_at?: string;
}

export interface Munt {
    id: number;
    gebruiker_id: null | number | Gebruiker;
    evenement_id: number | Evenement;
    groep_id: null | number | Groep;
    hoeveelheid: number;
    laatste_transactie?: null | Transactie;
}

export interface Product {
    id: number;
    evenement_id: number | Evenement;
    prijs: number;
    naam: string;
}

export interface Ticket {
    id: number;
    evenement_id: number | Evenement;
    prijs: number;
    naam: string;
    munten: null | number;
    gebruikers_count?: number;
    gebruikers?: Gebruiker[];
}
