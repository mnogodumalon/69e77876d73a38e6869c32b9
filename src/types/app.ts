// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface Speisekarte {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    gericht_name?: string;
    gericht_beschreibung?: string;
    gericht_preis?: number;
    gericht_kategorie?: LookupValue;
  };
}

export interface Bestellposition {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    teilnehmer_vorname?: string;
    teilnehmer_nachname?: string;
    ausgewaehlte_runde?: string; // applookup -> URL zu 'Bestellrunde' Record
    ausgewaehltes_gericht?: string; // applookup -> URL zu 'Speisekarte' Record
    menge?: number;
    sonderwunsch?: string;
  };
}

export interface Bestellrunde {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    runde_titel?: string;
    restaurant_name?: string;
    bestellfrist?: string; // Format: YYYY-MM-DD oder ISO String
    lieferzeit?: string; // Format: YYYY-MM-DD oder ISO String
    mindestbestellwert?: number;
    lieferkosten?: number;
    runde_hinweis?: string;
    organisator_vorname?: string;
    organisator_nachname?: string;
    organisator_email?: string;
  };
}

export const APP_IDS = {
  SPEISEKARTE: '69e7785a5f873fbe904233a4',
  BESTELLPOSITION: '69e778613af3af4f8fbc0827',
  BESTELLRUNDE: '69e778603a19b181a0ef8872',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'speisekarte': {
    gericht_kategorie: [{ key: "vorspeise", label: "Vorspeise" }, { key: "hauptgericht", label: "Hauptgericht" }, { key: "dessert", label: "Dessert" }, { key: "getraenk", label: "Getränk" }, { key: "beilage", label: "Beilage" }, { key: "sonstiges", label: "Sonstiges" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'speisekarte': {
    'gericht_name': 'string/text',
    'gericht_beschreibung': 'string/textarea',
    'gericht_preis': 'number',
    'gericht_kategorie': 'lookup/select',
  },
  'bestellposition': {
    'teilnehmer_vorname': 'string/text',
    'teilnehmer_nachname': 'string/text',
    'ausgewaehlte_runde': 'applookup/select',
    'ausgewaehltes_gericht': 'applookup/select',
    'menge': 'number',
    'sonderwunsch': 'string/textarea',
  },
  'bestellrunde': {
    'runde_titel': 'string/text',
    'restaurant_name': 'string/text',
    'bestellfrist': 'date/datetimeminute',
    'lieferzeit': 'date/datetimeminute',
    'mindestbestellwert': 'number',
    'lieferkosten': 'number',
    'runde_hinweis': 'string/textarea',
    'organisator_vorname': 'string/text',
    'organisator_nachname': 'string/text',
    'organisator_email': 'string/email',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateSpeisekarte = StripLookup<Speisekarte['fields']>;
export type CreateBestellposition = StripLookup<Bestellposition['fields']>;
export type CreateBestellrunde = StripLookup<Bestellrunde['fields']>;