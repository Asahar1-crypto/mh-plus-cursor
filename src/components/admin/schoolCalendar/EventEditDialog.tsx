import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { schoolCalendarService } from '@/integrations/supabase/schoolCalendarService';
import { useAuth } from '@/contexts/auth';
import type {
  EducationLevel,
  SchoolCalendarEventRow,
  SchoolCalendarKind,
  SchoolCalendarSource,
} from '@/integrations/supabase/custodyTypes';
import { EDUCATION_LABELS_HE, EDUCATION_LEVELS } from '@/integrations/supabase/custodyTypes';

interface EventEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: SchoolCalendarEventRow | null;
  schoolYear: string;
  onSaved: () => void;
  onDeleted?: () => void;
}

/** I4 — row edit dialog. */
export const EventEditDialog: React.FC<EventEditDialogProps> = ({
  open,
  onOpenChange,
  event,
  schoolYear,
  onSaved,
  onDeleted,
}) => {
  const { user } = useAuth();
  const [form, setForm] = useState<{
    name_he: string;
    start_date: string;
    end_date: string;
    kind: SchoolCalendarKind;
    applies_to: EducationLevel[];
    source: SchoolCalendarSource;
    verified: boolean;
  }>(defaultState());

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (event) {
      setForm({
        name_he: event.name_he,
        start_date: event.start_date,
        end_date: event.end_date,
        kind: event.kind,
        applies_to: event.applies_to,
        source: event.source,
        verified: event.verified_at !== null,
      });
    } else {
      setForm(defaultState());
    }
  }, [open, event]);

  const warnings = validate(form);
  const canSave = warnings.filter((w) => w.severity === 'error').length === 0;

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const eventKey =
        event?.event_key ?? slugify(form.name_he) + '_' + form.start_date;
      const saved = await schoolCalendarService.upsert({
        id: event?.id,
        schoolYear,
        eventKey,
        nameHe: form.name_he,
        startDate: form.start_date,
        endDate: form.end_date,
        kind: form.kind,
        appliesTo: form.applies_to,
        source: form.source,
      });
      if (form.verified && !saved.verified_at) {
        await schoolCalendarService.verify(saved.id, user.id);
      }
      toast.success('נשמר');
      onSaved();
      onOpenChange(false);
    } catch (err) {
      console.error('Save failed:', err);
      toast.error('שמירה נכשלה');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!event) return;
    if (!window.confirm(`למחוק את "${event.name_he}"? פעולה זו אינה הפיכה.`)) return;
    setDeleting(true);
    try {
      await schoolCalendarService.remove(event.id);
      toast.success('נמחק');
      onDeleted?.();
      onOpenChange(false);
    } catch (err) {
      console.error('Delete failed:', err);
      toast.error('מחיקה נכשלה');
    } finally {
      setDeleting(false);
    }
  };

  const toggleLevel = (lvl: EducationLevel) => {
    setForm((prev) => ({
      ...prev,
      applies_to: prev.applies_to.includes(lvl)
        ? prev.applies_to.filter((l) => l !== lvl)
        : [...prev.applies_to, lvl],
    }));
  };

  const toggleAll = () => {
    setForm((prev) => ({
      ...prev,
      applies_to:
        prev.applies_to.length === EDUCATION_LEVELS.length ? [] : [...EDUCATION_LEVELS],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg text-right max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{event ? 'עריכת אירוע' : 'אירוע חדש'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <div className="space-y-1">
            <Label className="text-xs">שם (עברית) *</Label>
            <Input
              value={form.name_he}
              onChange={(e) => setForm((p) => ({ ...p, name_he: e.target.value }))}
              placeholder="למשל: ראש השנה"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">תאריך התחלה *</Label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">תאריך סיום *</Label>
              <Input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">סוג *</Label>
            <RadioGroup
              value={form.kind}
              onValueChange={(v) => setForm((p) => ({ ...p, kind: v as SchoolCalendarKind }))}
              className="flex gap-4"
            >
              <KindOption value="holiday" label="חג" active={form.kind === 'holiday'} />
              <KindOption value="vacation" label="חופשה" active={form.kind === 'vacation'} />
              <KindOption value="irregular" label="יום מיוחד" active={form.kind === 'irregular'} />
            </RadioGroup>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs">מסגרות * (בחר/י לפחות אחת)</Label>
              <Button variant="ghost" size="sm" onClick={toggleAll} className="text-xs">
                {form.applies_to.length === EDUCATION_LEVELS.length ? 'בטל הכל' : 'בחר הכל'}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {EDUCATION_LEVELS.map((lvl) => (
                <label key={lvl} className="flex items-center gap-2 p-2 rounded border text-sm cursor-pointer hover:bg-muted/30">
                  <Checkbox
                    checked={form.applies_to.includes(lvl)}
                    onCheckedChange={() => toggleLevel(lvl)}
                  />
                  <span>{EDUCATION_LABELS_HE[lvl]}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">מקור *</Label>
            <RadioGroup
              value={form.source}
              onValueChange={(v) => setForm((p) => ({ ...p, source: v as SchoolCalendarSource }))}
              className="flex gap-4"
            >
              <KindOption value="hebcal" label="Hebcal" active={form.source === 'hebcal'} />
              <KindOption value="mankal" label="משרד החינוך" active={form.source === 'mankal'} />
              <KindOption value="manual" label="ידני" active={form.source === 'manual'} />
            </RadioGroup>
          </div>

          <div className="flex items-center gap-2 p-2 rounded border">
            <Checkbox
              checked={form.verified}
              onCheckedChange={(v) => setForm((p) => ({ ...p, verified: v === true }))}
            />
            <Label className="text-sm cursor-pointer" onClick={() => setForm((p) => ({ ...p, verified: !p.verified }))}>
              ✅ מאומת
            </Label>
          </div>

          {warnings.length > 0 && (
            <Alert variant={warnings.some((w) => w.severity === 'error') ? 'destructive' : 'default'}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong className="block mb-1">אזהרות:</strong>
                <ul className="list-disc list-inside text-xs space-y-0.5">
                  {warnings.map((w, i) => (
                    <li key={i}>{w.message}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 pt-3 border-t">
            {event && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting || saving}
                className="flex-1"
              >
                <Trash2 className="ml-2 h-4 w-4" />
                {deleting ? 'מוחק...' : 'מחק'}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving || deleting}
              className="flex-1"
            >
              ביטול
            </Button>
            <Button onClick={handleSave} disabled={!canSave || saving || deleting} className="flex-1">
              {saving ? 'שומר...' : 'שמור'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const KindOption: React.FC<{ value: string; label: string; active: boolean }> = ({
  value,
  label,
  active,
}) => (
  <label
    className={`flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded border text-sm transition-colors ${
      active ? 'bg-primary/10 border-primary' : 'bg-card hover:border-primary/40'
    }`}
  >
    <RadioGroupItem value={value} />
    {label}
  </label>
);

type ValidationWarning = { severity: 'error' | 'warn'; message: string };

function validate(form: {
  name_he: string;
  start_date: string;
  end_date: string;
  applies_to: EducationLevel[];
}): ValidationWarning[] {
  const out: ValidationWarning[] = [];
  if (!form.name_he.trim()) {
    out.push({ severity: 'error', message: 'יש להזין שם' });
  }
  if (!form.start_date) {
    out.push({ severity: 'error', message: 'יש לבחור תאריך התחלה' });
  }
  if (!form.end_date) {
    out.push({ severity: 'error', message: 'יש לבחור תאריך סיום' });
  }
  if (form.start_date && form.end_date && form.end_date < form.start_date) {
    out.push({ severity: 'error', message: 'תאריך סיום לפני תאריך התחלה' });
  }
  if (form.applies_to.length === 0) {
    out.push({ severity: 'error', message: 'בחר/י לפחות מסגרת חינוכית אחת' });
  }
  if (form.end_date && form.end_date < new Date().toISOString().slice(0, 10)) {
    out.push({ severity: 'warn', message: 'האירוע כבר חלף' });
  }
  return out;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\u0590-\u05FF]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40);
}

function defaultState() {
  const today = new Date().toISOString().slice(0, 10);
  return {
    name_he: '',
    start_date: today,
    end_date: today,
    kind: 'holiday' as SchoolCalendarKind,
    applies_to: [...EDUCATION_LEVELS] as EducationLevel[],
    source: 'manual' as SchoolCalendarSource,
    verified: false,
  };
}
