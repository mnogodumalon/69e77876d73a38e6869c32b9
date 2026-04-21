import type { Bestellposition, Bestellrunde, Speisekarte } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { IconPencil } from '@tabler/icons-react';

interface BestellpositionViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Bestellposition | null;
  onEdit: (record: Bestellposition) => void;
  bestellrundeList: Bestellrunde[];
  speisekarteList: Speisekarte[];
}

export function BestellpositionViewDialog({ open, onClose, record, onEdit, bestellrundeList, speisekarteList }: BestellpositionViewDialogProps) {
  function getBestellrundeDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return bestellrundeList.find(r => r.record_id === id)?.fields.runde_titel ?? '—';
  }

  function getSpeisekarteDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return speisekarteList.find(r => r.record_id === id)?.fields.gericht_name ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bestellposition anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Vorname</Label>
            <p className="text-sm">{record.fields.teilnehmer_vorname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nachname</Label>
            <p className="text-sm">{record.fields.teilnehmer_nachname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bestellrunde</Label>
            <p className="text-sm">{getBestellrundeDisplayName(record.fields.ausgewaehlte_runde)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Gericht</Label>
            <p className="text-sm">{getSpeisekarteDisplayName(record.fields.ausgewaehltes_gericht)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Anzahl</Label>
            <p className="text-sm">{record.fields.menge ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Sonderwünsche / Anmerkungen</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.sonderwunsch ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}