import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichBestellposition } from '@/lib/enrich';
import type { EnrichedBestellposition } from '@/types/enriched';
import type { Bestellrunde, Speisekarte } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl, extractRecordId } from '@/services/livingAppsService';
import { formatDate, formatCurrency } from '@/lib/formatters';
import { useState, useMemo, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { BestellrundeDialog } from '@/components/dialogs/BestellrundeDialog';
import { BestellpositionDialog } from '@/components/dialogs/BestellpositionDialog';
import { SpeisekarteDialog } from '@/components/dialogs/SpeisekarteDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import {
  IconAlertCircle, IconTool, IconRefresh, IconCheck,
  IconPlus, IconPencil, IconTrash, IconUsers, IconClock,
  IconShoppingCart, IconSalad, IconChevronRight, IconBuildingStore,
  IconCurrencyEuro, IconInfoCircle,
} from '@tabler/icons-react';

const APPGROUP_ID = '69e77876d73a38e6869c32b9';
const REPAIR_ENDPOINT = '/claude/build/repair';

export default function DashboardOverview() {
  const {
    speisekarte, bestellrunde, bestellposition,
    speisekarteMap, bestellrundeMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedBestellposition = enrichBestellposition(bestellposition, { bestellrundeMap, speisekarteMap });

  // All hooks BEFORE any early returns
  const [selectedRundeId, setSelectedRundeId] = useState<string | null>(null);

  // Bestellrunde dialog state
  const [rundeDialogOpen, setRundeDialogOpen] = useState(false);
  const [editRunde, setEditRunde] = useState<Bestellrunde | null>(null);
  const [deleteRunde, setDeleteRunde] = useState<Bestellrunde | null>(null);

  // Bestellposition dialog state
  const [posDialogOpen, setPosDialogOpen] = useState(false);
  const [editPos, setEditPos] = useState<EnrichedBestellposition | null>(null);
  const [deletePos, setDeletePos] = useState<EnrichedBestellposition | null>(null);

  // Speisekarte dialog state
  const [speiseDialogOpen, setSpeiseDialogOpen] = useState(false);
  const [editSpeise, setEditSpeise] = useState<Speisekarte | null>(null);
  const [deleteSpeise, setDeleteSpeise] = useState<Speisekarte | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<'bestellungen' | 'speisekarte'>('bestellungen');

  // Echter Fehler für Sentry + Repair-Endpoint-Test
  const [runtimeError, setRuntimeError] = useState<Error | null>(null);
  useEffect(() => {
    fetch('/api/v2/bestellrunden/aktiv/zusammenfassung')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}: Endpunkt /api/v2/bestellrunden/aktiv/zusammenfassung nicht gefunden`);
        return r.json();
      })
      .catch((err: Error) => setRuntimeError(err));
  }, []);

  const selectedRunde = useMemo(
    () => bestellrunde.find(r => r.record_id === selectedRundeId) ?? bestellrunde[0] ?? null,
    [bestellrunde, selectedRundeId],
  );

  const rundePositionen = useMemo(
    () => enrichedBestellposition.filter(p => {
      const rid = extractRecordId(p.fields.ausgewaehlte_runde);
      return rid === (selectedRunde?.record_id ?? null);
    }),
    [enrichedBestellposition, selectedRunde],
  );

  const rundeTotal = useMemo(
    () => rundePositionen.reduce((sum, p) => {
      const gericht = speisekarteMap.get(extractRecordId(p.fields.ausgewaehltes_gericht) ?? '');
      const preis = gericht?.fields.gericht_preis ?? 0;
      return sum + preis * (p.fields.menge ?? 1);
    }, 0),
    [rundePositionen, speisekarteMap],
  );

  const kategorien = useMemo(() => {
    const cats: Record<string, Speisekarte[]> = {};
    speisekarte.forEach(s => {
      const k = s.fields.gericht_kategorie?.label ?? 'Sonstiges';
      if (!cats[k]) cats[k] = [];
      cats[k].push(s);
    });
    return cats;
  }, [speisekarte]);

  if (loading) return <DashboardSkeleton />;
  if (error || runtimeError) return <DashboardError error={error ?? runtimeError!} onRetry={fetchAll} />;

  const activeRunde = selectedRunde;

  const isDeadlinePassed = (runde: Bestellrunde) => {
    if (!runde.fields.bestellfrist) return false;
    return new Date(runde.fields.bestellfrist) < new Date();
  };

  const handleCreateRunde = async (fields: Bestellrunde['fields']) => {
    await LivingAppsService.createBestellrundeEntry(fields);
    fetchAll();
  };

  const handleUpdateRunde = async (fields: Bestellrunde['fields']) => {
    if (!editRunde) return;
    await LivingAppsService.updateBestellrundeEntry(editRunde.record_id, fields);
    setEditRunde(null);
    fetchAll();
  };

  const handleDeleteRunde = async () => {
    if (!deleteRunde) return;
    await LivingAppsService.deleteBestellrundeEntry(deleteRunde.record_id);
    if (selectedRundeId === deleteRunde.record_id) setSelectedRundeId(null);
    setDeleteRunde(null);
    fetchAll();
  };

  const handleCreatePos = async (fields: EnrichedBestellposition['fields']) => {
    await LivingAppsService.createBestellpositionEntry(fields);
    fetchAll();
  };

  const handleUpdatePos = async (fields: EnrichedBestellposition['fields']) => {
    if (!editPos) return;
    await LivingAppsService.updateBestellpositionEntry(editPos.record_id, fields);
    setEditPos(null);
    fetchAll();
  };

  const handleDeletePos = async () => {
    if (!deletePos) return;
    await LivingAppsService.deleteBestellpositionEntry(deletePos.record_id);
    setDeletePos(null);
    fetchAll();
  };

  const handleCreateSpeise = async (fields: Speisekarte['fields']) => {
    await LivingAppsService.createSpeisekarteEntry(fields);
    fetchAll();
  };

  const handleUpdateSpeise = async (fields: Speisekarte['fields']) => {
    if (!editSpeise) return;
    await LivingAppsService.updateSpeisekarteEntry(editSpeise.record_id, fields);
    setEditSpeise(null);
    fetchAll();
  };

  const handleDeleteSpeise = async () => {
    if (!deleteSpeise) return;
    await LivingAppsService.deleteSpeisekarteEntry(deleteSpeise.record_id);
    setDeleteSpeise(null);
    fetchAll();
  };

  return (
    <div className="space-y-6">
      {/* Workflow Navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <a
          href="#/intents/bestellung-aufgeben"
          className="flex items-center gap-4 bg-card border border-border border-l-4 border-l-primary rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <IconShoppingCart size={22} className="text-primary shrink-0" stroke={1.5} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm text-foreground">Bestellung aufgeben</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">Runde wählen, Gericht aussuchen & Bestellung platzieren</p>
          </div>
          <IconChevronRight size={16} className="text-muted-foreground shrink-0" />
        </a>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Bestellrunden"
          value={String(bestellrunde.length)}
          description="Gesamt"
          icon={<IconShoppingCart size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Bestellungen"
          value={String(bestellposition.length)}
          description="Alle Positionen"
          icon={<IconUsers size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Gerichte"
          value={String(speisekarte.length)}
          description="In der Speisekarte"
          icon={<IconSalad size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Aktiv"
          value={String(bestellrunde.filter(r => !isDeadlinePassed(r)).length)}
          description="Offene Runden"
          icon={<IconClock size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setActiveTab('bestellungen')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'bestellungen' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Bestellrunden
        </button>
        <button
          onClick={() => setActiveTab('speisekarte')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'speisekarte' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Speisekarte
        </button>
      </div>

      {activeTab === 'bestellungen' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Bestellrunden List */}
          <div className="lg:col-span-1 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Bestellrunden</h2>
              <Button size="sm" onClick={() => { setEditRunde(null); setRundeDialogOpen(true); }}>
                <IconPlus size={14} className="shrink-0 mr-1" />
                Neu
              </Button>
            </div>

            {bestellrunde.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 border border-dashed border-border rounded-2xl text-center">
                <IconShoppingCart size={36} className="text-muted-foreground" stroke={1.5} />
                <p className="text-sm text-muted-foreground">Noch keine Bestellrunden.<br />Erstelle eine neue!</p>
                <Button size="sm" variant="outline" onClick={() => { setEditRunde(null); setRundeDialogOpen(true); }}>
                  <IconPlus size={14} className="mr-1" />Erstellen
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {bestellrunde.map(runde => {
                  const isSelected = (selectedRunde?.record_id ?? bestellrunde[0]?.record_id) === runde.record_id;
                  const passed = isDeadlinePassed(runde);
                  const posCount = bestellposition.filter(p => extractRecordId(p.fields.ausgewaehlte_runde) === runde.record_id).length;
                  return (
                    <div
                      key={runde.record_id}
                      onClick={() => setSelectedRundeId(runde.record_id)}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all ${isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/40'}`}
                    >
                      <div className="flex items-start justify-between gap-2 min-w-0">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm truncate">{runde.fields.runde_titel ?? '—'}</span>
                            <Badge variant={passed ? 'secondary' : 'default'} className="text-xs shrink-0">
                              {passed ? 'Abgelaufen' : 'Offen'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <IconBuildingStore size={11} className="text-muted-foreground shrink-0" />
                            <span className="text-xs text-muted-foreground truncate">{runde.fields.restaurant_name ?? '—'}</span>
                          </div>
                          {runde.fields.bestellfrist && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <IconClock size={11} className="text-muted-foreground shrink-0" />
                              <span className="text-xs text-muted-foreground">{formatDate(runde.fields.bestellfrist)}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1 mt-0.5">
                            <IconUsers size={11} className="text-muted-foreground shrink-0" />
                            <span className="text-xs text-muted-foreground">{posCount} Bestellung{posCount !== 1 ? 'en' : ''}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={e => { e.stopPropagation(); setEditRunde(runde); setRundeDialogOpen(true); }}
                            className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                            title="Bearbeiten"
                          >
                            <IconPencil size={13} className="text-muted-foreground" />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); setDeleteRunde(runde); }}
                            className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                            title="Löschen"
                          >
                            <IconTrash size={13} className="text-muted-foreground hover:text-destructive" />
                          </button>
                          <IconChevronRight size={13} className={`transition-colors ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Detail panel */}
          <div className="lg:col-span-2 space-y-4">
            {activeRunde ? (
              <>
                {/* Runde Info */}
                <div className="border border-border rounded-2xl p-4 bg-card space-y-3">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-lg leading-tight truncate">{activeRunde.fields.runde_titel ?? '—'}</h3>
                      <div className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <IconBuildingStore size={13} className="shrink-0" />
                        <span className="truncate">{activeRunde.fields.restaurant_name ?? '—'}</span>
                        {activeRunde.fields.organisator_vorname && (
                          <>
                            <span className="text-muted-foreground/40">·</span>
                            <span>Org.: {activeRunde.fields.organisator_vorname} {activeRunde.fields.organisator_nachname}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <Badge variant={isDeadlinePassed(activeRunde) ? 'secondary' : 'default'}>
                      {isDeadlinePassed(activeRunde) ? 'Abgelaufen' : 'Offen'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    {activeRunde.fields.bestellfrist && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Bestellfrist</p>
                        <p className="font-medium">{formatDate(activeRunde.fields.bestellfrist)}</p>
                      </div>
                    )}
                    {activeRunde.fields.lieferzeit && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Lieferzeit</p>
                        <p className="font-medium">{formatDate(activeRunde.fields.lieferzeit)}</p>
                      </div>
                    )}
                    {activeRunde.fields.mindestbestellwert != null && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Mindestbestellwert</p>
                        <p className="font-medium">{formatCurrency(activeRunde.fields.mindestbestellwert)}</p>
                      </div>
                    )}
                    {activeRunde.fields.lieferkosten != null && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Lieferkosten</p>
                        <p className="font-medium">{formatCurrency(activeRunde.fields.lieferkosten)}</p>
                      </div>
                    )}
                  </div>

                  {activeRunde.fields.runde_hinweis && (
                    <div className="flex items-start gap-2 bg-muted/50 rounded-xl p-3">
                      <IconInfoCircle size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                      <p className="text-sm text-muted-foreground">{activeRunde.fields.runde_hinweis}</p>
                    </div>
                  )}
                </div>

                {/* Bestellpositionen */}
                <div className="border border-border rounded-2xl overflow-hidden bg-card">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <h4 className="font-semibold text-sm">Bestellpositionen</h4>
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditPos(null);
                        setPosDialogOpen(true);
                      }}
                    >
                      <IconPlus size={13} className="shrink-0 mr-1" />
                      Bestellen
                    </Button>
                  </div>

                  {rundePositionen.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2 text-center px-4">
                      <IconUsers size={32} className="text-muted-foreground" stroke={1.5} />
                      <p className="text-sm text-muted-foreground">Noch keine Bestellungen für diese Runde.</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setEditPos(null); setPosDialogOpen(true); }}
                      >
                        <IconPlus size={13} className="mr-1" />Jetzt bestellen
                      </Button>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {rundePositionen.map(pos => {
                        const gericht = speisekarteMap.get(extractRecordId(pos.fields.ausgewaehltes_gericht) ?? '');
                        const preis = gericht?.fields.gericht_preis;
                        const menge = pos.fields.menge ?? 1;
                        return (
                          <div key={pos.record_id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm truncate">
                                  {pos.fields.teilnehmer_vorname} {pos.fields.teilnehmer_nachname}
                                </span>
                                <Badge variant="outline" className="text-xs shrink-0">{menge}x</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                {pos.ausgewaehltes_gerichtName || '—'}
                                {preis != null && <span className="ml-1 text-foreground/60">{formatCurrency(preis * menge)}</span>}
                              </p>
                              {pos.fields.sonderwunsch && (
                                <p className="text-xs text-muted-foreground/70 italic mt-0.5 truncate">"{pos.fields.sonderwunsch}"</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => { setEditPos(pos); setPosDialogOpen(true); }}
                                className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                                title="Bearbeiten"
                              >
                                <IconPencil size={13} className="text-muted-foreground" />
                              </button>
                              <button
                                onClick={() => setDeletePos(pos)}
                                className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                                title="Löschen"
                              >
                                <IconTrash size={13} className="text-muted-foreground hover:text-destructive" />
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {/* Summe */}
                      <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
                        <div className="flex items-center gap-1.5 text-sm font-medium">
                          <IconCurrencyEuro size={14} className="text-muted-foreground shrink-0" />
                          <span>Gesamtsumme</span>
                        </div>
                        <span className="font-bold text-sm">{formatCurrency(rundeTotal)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 gap-3 border border-dashed border-border rounded-2xl text-center">
                <IconShoppingCart size={40} className="text-muted-foreground" stroke={1.5} />
                <p className="text-sm text-muted-foreground">Wähle eine Bestellrunde aus<br />oder erstelle eine neue.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'speisekarte' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Speisekarte</h2>
            <Button size="sm" onClick={() => { setEditSpeise(null); setSpeiseDialogOpen(true); }}>
              <IconPlus size={14} className="shrink-0 mr-1" />
              Gericht hinzufügen
            </Button>
          </div>

          {speisekarte.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed border-border rounded-2xl text-center">
              <IconSalad size={40} className="text-muted-foreground" stroke={1.5} />
              <p className="text-sm text-muted-foreground">Noch keine Gerichte in der Speisekarte.</p>
              <Button size="sm" variant="outline" onClick={() => { setEditSpeise(null); setSpeiseDialogOpen(true); }}>
                <IconPlus size={14} className="mr-1" />Gericht hinzufügen
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(kategorien).map(([kat, gerichte]) => (
                <div key={kat}>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">{kat}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {gerichte.map(gericht => (
                      <div key={gericht.record_id} className="border border-border rounded-2xl p-3 bg-card hover:border-primary/30 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{gericht.fields.gericht_name ?? '—'}</p>
                            {gericht.fields.gericht_beschreibung && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{gericht.fields.gericht_beschreibung}</p>
                            )}
                            {gericht.fields.gericht_preis != null && (
                              <p className="text-sm font-semibold text-primary mt-1.5">{formatCurrency(gericht.fields.gericht_preis)}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => { setEditSpeise(gericht); setSpeiseDialogOpen(true); }}
                              className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                              title="Bearbeiten"
                            >
                              <IconPencil size={13} className="text-muted-foreground" />
                            </button>
                            <button
                              onClick={() => setDeleteSpeise(gericht)}
                              className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                              title="Löschen"
                            >
                              <IconTrash size={13} className="text-muted-foreground hover:text-destructive" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dialogs: Bestellrunde */}
      <BestellrundeDialog
        open={rundeDialogOpen}
        onClose={() => { setRundeDialogOpen(false); setEditRunde(null); }}
        onSubmit={editRunde ? handleUpdateRunde : handleCreateRunde}
        defaultValues={editRunde?.fields}
        enablePhotoScan={AI_PHOTO_SCAN['Bestellrunde']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Bestellrunde']}
      />

      <ConfirmDialog
        open={!!deleteRunde}
        title="Bestellrunde löschen"
        description={`Möchtest du die Runde "${deleteRunde?.fields.runde_titel}" wirklich löschen?`}
        onConfirm={handleDeleteRunde}
        onClose={() => setDeleteRunde(null)}
      />

      {/* Dialogs: Bestellposition */}
      <BestellpositionDialog
        open={posDialogOpen}
        onClose={() => { setPosDialogOpen(false); setEditPos(null); }}
        onSubmit={editPos ? handleUpdatePos : handleCreatePos}
        defaultValues={editPos
          ? editPos.fields
          : activeRunde
            ? { ausgewaehlte_runde: createRecordUrl(APP_IDS.BESTELLRUNDE, activeRunde.record_id) }
            : undefined
        }
        bestellrundeList={bestellrunde}
        speisekarteList={speisekarte}
        enablePhotoScan={AI_PHOTO_SCAN['Bestellposition']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Bestellposition']}
      />

      <ConfirmDialog
        open={!!deletePos}
        title="Bestellposition löschen"
        description={`Möchtest du die Bestellung von ${deletePos?.fields.teilnehmer_vorname} ${deletePos?.fields.teilnehmer_nachname} wirklich löschen?`}
        onConfirm={handleDeletePos}
        onClose={() => setDeletePos(null)}
      />

      {/* Dialogs: Speisekarte */}
      <SpeisekarteDialog
        open={speiseDialogOpen}
        onClose={() => { setSpeiseDialogOpen(false); setEditSpeise(null); }}
        onSubmit={editSpeise ? handleUpdateSpeise : handleCreateSpeise}
        defaultValues={editSpeise?.fields}
        enablePhotoScan={AI_PHOTO_SCAN['Speisekarte']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Speisekarte']}
      />

      <ConfirmDialog
        open={!!deleteSpeise}
        title="Gericht löschen"
        description={`Möchtest du "${deleteSpeise?.fields.gericht_name}" wirklich aus der Speisekarte entfernen?`}
        onConfirm={handleDeleteSpeise}
        onClose={() => setDeleteSpeise(null)}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) {
            setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          }
          if (content.startsWith('[DONE]')) {
            setRepairDone(true);
            setRepairing(false);
          }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) {
            setRepairFailed(true);
          }
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktieren Sie den Support.</p>}
    </div>
  );
}
