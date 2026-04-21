import type { EnrichedBestellposition } from '@/types/enriched';
import type { Bestellposition, Bestellrunde, Speisekarte } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface BestellpositionMaps {
  bestellrundeMap: Map<string, Bestellrunde>;
  speisekarteMap: Map<string, Speisekarte>;
}

export function enrichBestellposition(
  bestellposition: Bestellposition[],
  maps: BestellpositionMaps
): EnrichedBestellposition[] {
  return bestellposition.map(r => ({
    ...r,
    ausgewaehlte_rundeName: resolveDisplay(r.fields.ausgewaehlte_runde, maps.bestellrundeMap, 'runde_titel'),
    ausgewaehltes_gerichtName: resolveDisplay(r.fields.ausgewaehltes_gericht, maps.speisekarteMap, 'gericht_name'),
  }));
}
