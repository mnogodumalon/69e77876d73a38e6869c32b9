import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Speisekarte, Bestellrunde, Bestellposition } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [speisekarte, setSpeisekarte] = useState<Speisekarte[]>([]);
  const [bestellrunde, setBestellrunde] = useState<Bestellrunde[]>([]);
  const [bestellposition, setBestellposition] = useState<Bestellposition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [speisekarteData, bestellrundeData, bestellpositionData] = await Promise.all([
        LivingAppsService.getSpeisekarte(),
        LivingAppsService.getBestellrunde(),
        LivingAppsService.getBestellposition(),
      ]);
      setSpeisekarte(speisekarteData);
      setBestellrunde(bestellrundeData);
      setBestellposition(bestellpositionData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [speisekarteData, bestellrundeData, bestellpositionData] = await Promise.all([
          LivingAppsService.getSpeisekarte(),
          LivingAppsService.getBestellrunde(),
          LivingAppsService.getBestellposition(),
        ]);
        setSpeisekarte(speisekarteData);
        setBestellrunde(bestellrundeData);
        setBestellposition(bestellpositionData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const speisekarteMap = useMemo(() => {
    const m = new Map<string, Speisekarte>();
    speisekarte.forEach(r => m.set(r.record_id, r));
    return m;
  }, [speisekarte]);

  const bestellrundeMap = useMemo(() => {
    const m = new Map<string, Bestellrunde>();
    bestellrunde.forEach(r => m.set(r.record_id, r));
    return m;
  }, [bestellrunde]);

  return { speisekarte, setSpeisekarte, bestellrunde, setBestellrunde, bestellposition, setBestellposition, loading, error, fetchAll, speisekarteMap, bestellrundeMap };
}