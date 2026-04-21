import { useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, parseISO, isFuture } from 'date-fns';
import { de } from 'date-fns/locale';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { BudgetTracker } from '@/components/BudgetTracker';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BestellrundeDialog } from '@/components/dialogs/BestellrundeDialog';
import { SpeisekarteDialog } from '@/components/dialogs/SpeisekarteDialog';
import { useDashboardData } from '@/hooks/useDashboardData';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import { APP_IDS } from '@/types/app';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import type { Bestellrunde, Speisekarte } from '@/types/app';
import { formatCurrency } from '@/lib/formatters';
import {
  IconShoppingCart,
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconPlus,
  IconClock,
  IconTag,
} from '@tabler/icons-react';

const WIZARD_STEPS = [
  { label: 'Runde wählen' },
  { label: 'Gericht wählen' },
  { label: 'Details eingeben' },
  { label: 'Zusammenfassung' },
];

function formatDatetime(s: string | undefined): string {
  if (!s) return '—';
  try {
    return format(parseISO(s), 'dd.MM.yyyy HH:mm', { locale: de });
  } catch {
    return s;
  }
}

function isRundeOffen(runde: Bestellrunde): boolean {
  const frist = runde.fields.bestellfrist;
  if (!frist) return true;
  try {
    return isFuture(parseISO(frist));
  } catch {
    return true;
  }
}

export default function BestellungAufgebenPage() {
  const [searchParams] = useSearchParams();
  const { bestellrunde, speisekarte, bestellposition, loading, error, fetchAll } = useDashboardData();

  // Initialize step from URL params — must be before any early returns (Rules of Hooks)
  const initialStep = (() => {
    const urlRundeId = searchParams.get('rundeId');
    const urlStep = parseInt(searchParams.get('step') ?? '', 10);
    if (urlRundeId) return urlStep >= 1 && urlStep <= 4 ? urlStep : 2;
    return urlStep >= 1 && urlStep <= 4 ? urlStep : 1;
  })();

  const [currentStep, setCurrentStep] = useState(initialStep);
  const [selectedRundeId, setSelectedRundeId] = useState<string | null>(
    searchParams.get('rundeId') ?? null
  );
  const [selectedGerichtId, setSelectedGerichtId] = useState<string | null>(null);

  // Step 3 form state
  const [vorname, setVorname] = useState('');
  const [nachname, setNachname] = useState('');
  const [menge, setMenge] = useState(1);
  const [sonderwunsch, setSonderwunsch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Step 4 summary state
  const [lastOrderInfo, setLastOrderInfo] = useState<{
    rundeTitel: string;
    restaurantName: string;
    gerichtName: string;
    gerichtPreis: number;
    vorname: string;
    nachname: string;
    menge: number;
  } | null>(null);

  // Dialog state
  const [rundeDialogOpen, setRundeDialogOpen] = useState(false);
  const [speisekarteDialogOpen, setSpeisekarteDialogOpen] = useState(false);

  const selectedRunde = useMemo(
    () => bestellrunde.find(r => r.record_id === selectedRundeId) ?? null,
    [bestellrunde, selectedRundeId]
  );

  const selectedGericht = useMemo(
    () => speisekarte.find(s => s.record_id === selectedGerichtId) ?? null,
    [speisekarte, selectedGerichtId]
  );

  // Compute running total for selected Runde (sum of menge * gericht_preis for this runde)
  const rundeTotal = useMemo(() => {
    if (!selectedRundeId) return 0;
    const rundeUrl = createRecordUrl(APP_IDS.BESTELLRUNDE, selectedRundeId);
    return bestellposition
      .filter(p => p.fields.ausgewaehlte_runde === rundeUrl)
      .reduce((sum, p) => {
        const gerichtId = extractRecordId(p.fields.ausgewaehltes_gericht);
        const gericht = gerichtId ? speisekarte.find(s => s.record_id === gerichtId) : null;
        const preis = gericht?.fields.gericht_preis ?? 0;
        const qty = p.fields.menge ?? 1;
        return sum + preis * qty;
      }, 0);
  }, [bestellposition, selectedRundeId, speisekarte]);

  const handleRundeSelect = useCallback((id: string) => {
    setSelectedRundeId(id);
    setCurrentStep(2);
  }, []);

  const handleGerichtSelect = useCallback((gericht: Speisekarte) => {
    setSelectedGerichtId(gericht.record_id);
    setCurrentStep(3);
  }, []);

  const handleSubmitBestellung = useCallback(async () => {
    if (!selectedRundeId || !selectedGerichtId || !vorname.trim() || !nachname.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await LivingAppsService.createBestellpositionEntry({
        teilnehmer_vorname: vorname.trim(),
        teilnehmer_nachname: nachname.trim(),
        ausgewaehlte_runde: createRecordUrl(APP_IDS.BESTELLRUNDE, selectedRundeId),
        ausgewaehltes_gericht: createRecordUrl(APP_IDS.SPEISEKARTE, selectedGerichtId),
        menge,
        sonderwunsch: sonderwunsch.trim() || undefined,
      });
      await fetchAll();
      setLastOrderInfo({
        rundeTitel: selectedRunde?.fields.runde_titel ?? '',
        restaurantName: selectedRunde?.fields.restaurant_name ?? '',
        gerichtName: selectedGericht?.fields.gericht_name ?? '',
        gerichtPreis: selectedGericht?.fields.gericht_preis ?? 0,
        vorname: vorname.trim(),
        nachname: nachname.trim(),
        menge,
      });
      setCurrentStep(4);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unbekannter Fehler beim Speichern.');
    } finally {
      setSubmitting(false);
    }
  }, [selectedRundeId, selectedGerichtId, vorname, nachname, menge, sonderwunsch, selectedRunde, selectedGericht, fetchAll]);

  const handleWeitereBestellung = useCallback(() => {
    setSelectedGerichtId(null);
    setVorname('');
    setNachname('');
    setMenge(1);
    setSonderwunsch('');
    setLastOrderInfo(null);
    setSubmitError(null);
    setCurrentStep(2);
  }, []);

  const handleNeueRundeCreated = useCallback(async (fields: Bestellrunde['fields']) => {
    await LivingAppsService.createBestellrundeEntry(fields);
    await fetchAll();
  }, [fetchAll]);

  const handleNeueSpeisekarteCreated = useCallback(async (fields: Speisekarte['fields']) => {
    await LivingAppsService.createSpeisekarteEntry(fields);
    await fetchAll();
  }, [fetchAll]);

  const subtotal = (selectedGericht?.fields.gericht_preis ?? 0) * menge;

  // --- Step 1: Bestellrunde wählen ---
  const step1Content = (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Wähle eine aktive Bestellrunde aus oder erstelle eine neue.
      </p>
      <EntitySelectStep
        items={bestellrunde.map(r => {
          const offen = isRundeOffen(r);
          return {
            id: r.record_id,
            title: r.fields.runde_titel ?? '(Kein Titel)',
            subtitle: r.fields.restaurant_name,
            status: {
              key: offen ? 'offen' : 'abgeschlossen',
              label: offen ? 'Offen' : 'Abgelaufen',
            },
            stats: [
              {
                label: 'Frist',
                value: formatDatetime(r.fields.bestellfrist),
              },
              ...(r.fields.mindestbestellwert != null
                ? [{ label: 'Mindestbestellwert', value: formatCurrency(r.fields.mindestbestellwert) }]
                : []),
            ],
          };
        })}
        onSelect={handleRundeSelect}
        searchPlaceholder="Runde suchen..."
        emptyIcon={<IconShoppingCart size={32} />}
        emptyText="Noch keine Bestellrunden vorhanden."
        createLabel="Neue Runde erstellen"
        onCreateNew={() => setRundeDialogOpen(true)}
        createDialog={
          <BestellrundeDialog
            open={rundeDialogOpen}
            onClose={() => setRundeDialogOpen(false)}
            onSubmit={handleNeueRundeCreated}
            defaultValues={undefined}
            enablePhotoScan={AI_PHOTO_SCAN['Bestellrunde']}
            enablePhotoLocation={AI_PHOTO_LOCATION['Bestellrunde']}
          />
        }
      />
    </div>
  );

  // --- Step 2: Gericht wählen ---
  const step2Content = selectedRunde ? (
    <div className="space-y-4">
      {/* Runde Info Card */}
      <div className="rounded-xl border bg-card p-4 space-y-2 overflow-hidden">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="min-w-0">
            <h2 className="font-semibold text-base truncate">
              {selectedRunde.fields.runde_titel}
            </h2>
            <p className="text-sm text-muted-foreground truncate">
              {selectedRunde.fields.restaurant_name}
            </p>
          </div>
          <StatusBadge
            statusKey={isRundeOffen(selectedRunde) ? 'offen' : 'abgeschlossen'}
            label={isRundeOffen(selectedRunde) ? 'Offen' : 'Abgelaufen'}
          />
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          {selectedRunde.fields.bestellfrist && (
            <span className="flex items-center gap-1">
              <IconClock size={13} />
              Frist: <span className="font-medium text-foreground ml-1">{formatDatetime(selectedRunde.fields.bestellfrist)}</span>
            </span>
          )}
          {selectedRunde.fields.lieferkosten != null && (
            <span>
              Lieferkosten: <span className="font-medium text-foreground">{formatCurrency(selectedRunde.fields.lieferkosten)}</span>
            </span>
          )}
        </div>
        {selectedRunde.fields.runde_hinweis && (
          <p className="text-xs text-muted-foreground border-t pt-2 mt-1 line-clamp-2">
            {selectedRunde.fields.runde_hinweis}
          </p>
        )}
      </div>

      {/* Budget Tracker */}
      {selectedRunde.fields.mindestbestellwert != null && (
        <BudgetTracker
          budget={selectedRunde.fields.mindestbestellwert}
          booked={rundeTotal}
          label="Mindestbestellwert"
        />
      )}

      {/* Speisekarte */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-sm">Speisekarte</h3>
        <Button variant="outline" size="sm" onClick={() => setSpeisekarteDialogOpen(true)} className="gap-1.5 shrink-0">
          <IconPlus size={14} />
          Neues Gericht
        </Button>
      </div>

      <SpeisekarteDialog
        open={speisekarteDialogOpen}
        onClose={() => setSpeisekarteDialogOpen(false)}
        onSubmit={handleNeueSpeisekarteCreated}
        defaultValues={undefined}
        enablePhotoScan={AI_PHOTO_SCAN['Speisekarte']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Speisekarte']}
      />

      {speisekarte.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <div className="mb-3 flex justify-center opacity-40">
            <IconShoppingCart size={32} />
          </div>
          <p className="text-sm">Noch keine Gerichte in der Speisekarte.</p>
          <Button variant="outline" size="sm" onClick={() => setSpeisekarteDialogOpen(true)} className="mt-3 gap-1.5">
            <IconPlus size={14} />
            Neues Gericht erstellen
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {speisekarte.map(gericht => (
            <button
              key={gericht.record_id}
              onClick={() => handleGerichtSelect(gericht)}
              className="w-full text-left rounded-xl border bg-card p-4 hover:bg-accent hover:border-primary/30 transition-colors overflow-hidden group"
            >
              <div className="flex items-start justify-between gap-2 min-w-0">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                    {gericht.fields.gericht_name ?? '(Unbekannt)'}
                  </p>
                  {gericht.fields.gericht_beschreibung && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {gericht.fields.gericht_beschreibung}
                    </p>
                  )}
                </div>
                <span className="font-semibold text-sm text-primary shrink-0">
                  {formatCurrency(gericht.fields.gericht_preis)}
                </span>
              </div>
              {gericht.fields.gericht_kategorie && (
                <div className="mt-2 flex items-center gap-1">
                  <IconTag size={11} className="text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground truncate">
                    {typeof gericht.fields.gericht_kategorie === 'object'
                      ? gericht.fields.gericht_kategorie.label
                      : gericht.fields.gericht_kategorie}
                  </span>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="pt-2">
        <Button variant="ghost" size="sm" onClick={() => setCurrentStep(1)} className="gap-1.5">
          <IconArrowLeft size={15} />
          Andere Runde wählen
        </Button>
      </div>
    </div>
  ) : null;

  // --- Step 3: Bestelldetails ---
  const step3Content = selectedGericht ? (
    <div className="space-y-5">
      {/* Selected Gericht Summary */}
      <div className="rounded-xl border bg-card p-4 overflow-hidden">
        <div className="flex items-start justify-between gap-2 min-w-0">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-base truncate">{selectedGericht.fields.gericht_name}</p>
            {selectedGericht.fields.gericht_beschreibung && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-3">
                {selectedGericht.fields.gericht_beschreibung}
              </p>
            )}
          </div>
          <span className="font-bold text-lg text-primary shrink-0">
            {formatCurrency(selectedGericht.fields.gericht_preis)}
          </span>
        </div>
        {selectedGericht.fields.gericht_kategorie && (
          <div className="mt-2 flex items-center gap-1">
            <IconTag size={12} className="text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground">
              {typeof selectedGericht.fields.gericht_kategorie === 'object'
                ? selectedGericht.fields.gericht_kategorie.label
                : selectedGericht.fields.gericht_kategorie}
            </span>
          </div>
        )}
      </div>

      {/* Form */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="vorname">Vorname *</Label>
            <Input
              id="vorname"
              placeholder="z.B. Anna"
              value={vorname}
              onChange={e => setVorname(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nachname">Nachname *</Label>
            <Input
              id="nachname"
              placeholder="z.B. Müller"
              value={nachname}
              onChange={e => setNachname(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="menge">Menge *</Label>
          <Input
            id="menge"
            type="number"
            min={1}
            value={menge}
            onChange={e => setMenge(Math.max(1, parseInt(e.target.value) || 1))}
            className="max-w-[120px]"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sonderwunsch">Sonderwunsch (optional)</Label>
          <Textarea
            id="sonderwunsch"
            placeholder="z.B. ohne Zwiebeln, extra scharf..."
            value={sonderwunsch}
            onChange={e => setSonderwunsch(e.target.value)}
            rows={3}
          />
        </div>
      </div>

      {/* Subtotal */}
      <div className="rounded-xl border bg-muted/50 p-4 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Zwischensumme</span>
        <span className="text-xl font-bold text-primary">{formatCurrency(subtotal)}</span>
      </div>

      {submitError && (
        <p className="text-sm text-destructive rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2">
          {submitError}
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button variant="ghost" size="sm" onClick={() => setCurrentStep(2)} className="gap-1.5">
          <IconArrowLeft size={15} />
          Anderes Gericht
        </Button>
        <Button
          className="flex-1 gap-2"
          disabled={!vorname.trim() || !nachname.trim() || submitting}
          onClick={handleSubmitBestellung}
        >
          {submitting ? (
            <>Wird gespeichert...</>
          ) : (
            <>
              <IconArrowRight size={16} />
              Bestellung hinzufügen
            </>
          )}
        </Button>
      </div>
    </div>
  ) : null;

  // --- Step 4: Zusammenfassung ---
  const step4Content = lastOrderInfo ? (
    <div className="space-y-5">
      {/* Success Banner */}
      <div className="rounded-xl bg-green-50 border border-green-200 p-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
          <IconCheck size={20} className="text-green-600" stroke={2.5} />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-green-800">Bestellung gespeichert!</p>
          <p className="text-sm text-green-700 mt-0.5">
            Deine Bestellung wurde erfolgreich zur Runde hinzugefügt.
          </p>
        </div>
      </div>

      {/* Summary Card */}
      <div className="rounded-xl border bg-card divide-y overflow-hidden">
        <div className="px-4 py-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-2">Zusammenfassung</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Runde</span>
              <span className="font-medium text-right truncate max-w-[60%]">{lastOrderInfo.rundeTitel}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Restaurant</span>
              <span className="font-medium text-right truncate max-w-[60%]">{lastOrderInfo.restaurantName}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Gericht</span>
              <span className="font-medium text-right truncate max-w-[60%]">{lastOrderInfo.gerichtName}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Teilnehmer</span>
              <span className="font-medium">{lastOrderInfo.vorname} {lastOrderInfo.nachname}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Menge</span>
              <span className="font-medium">{lastOrderInfo.menge}</span>
            </div>
          </div>
        </div>
        <div className="px-4 py-3 bg-muted/30 flex items-center justify-between">
          <span className="text-sm font-medium">Gesamtbetrag</span>
          <span className="text-lg font-bold text-primary">
            {formatCurrency(lastOrderInfo.gerichtPreis * lastOrderInfo.menge)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button variant="outline" onClick={handleWeitereBestellung} className="flex-1 gap-2">
          <IconPlus size={16} />
          Weitere Bestellung aufgeben
        </Button>
        <Button asChild className="flex-1 gap-2">
          <a href="#/">
            <IconCheck size={16} />
            Zur Übersicht
          </a>
        </Button>
      </div>
    </div>
  ) : null;

  const stepContent = [step1Content, step2Content, step3Content, step4Content];

  return (
    <IntentWizardShell
      title="Bestellung aufgeben"
      subtitle="Wähle eine Bestellrunde, such dir ein Gericht aus und gib deine Bestellung auf."
      steps={WIZARD_STEPS}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {stepContent[currentStep - 1]}
    </IntentWizardShell>
  );
}
