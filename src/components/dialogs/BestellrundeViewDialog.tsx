import type { Bestellrunde } from '@/types/app';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { IconPencil } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface BestellrundeViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Bestellrunde | null;
  onEdit: (record: Bestellrunde) => void;
}

export function BestellrundeViewDialog({ open, onClose, record, onEdit }: BestellrundeViewDialogProps) {
  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bestellrunde anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Titel der Bestellrunde</Label>
            <p className="text-sm">{record.fields.runde_titel ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Restaurant</Label>
            <p className="text-sm">{record.fields.restaurant_name ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bestellfrist</Label>
            <p className="text-sm">{formatDate(record.fields.bestellfrist)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Voraussichtliche Lieferzeit</Label>
            <p className="text-sm">{formatDate(record.fields.lieferzeit)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Mindestbestellwert (€)</Label>
            <p className="text-sm">{record.fields.mindestbestellwert ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Lieferkosten (€)</Label>
            <p className="text-sm">{record.fields.lieferkosten ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Hinweis / Anmerkung</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.runde_hinweis ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Vorname des Organisators</Label>
            <p className="text-sm">{record.fields.organisator_vorname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nachname des Organisators</Label>
            <p className="text-sm">{record.fields.organisator_nachname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">E-Mail des Organisators</Label>
            <p className="text-sm">{record.fields.organisator_email ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}