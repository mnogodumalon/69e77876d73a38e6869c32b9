import type { Bestellposition } from './app';

export type EnrichedBestellposition = Bestellposition & {
  ausgewaehlte_rundeName: string;
  ausgewaehltes_gerichtName: string;
};
