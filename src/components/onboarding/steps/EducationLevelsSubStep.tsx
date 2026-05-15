import React, { useState, useMemo } from 'react';
import { GraduationCap, Info, Check, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { EDUCATION_LABELS_HE } from '@/integrations/supabase/custodyTypes';
import type { EducationLevel } from '@/integrations/supabase/custodyTypes';
import { educationLevelForGrade, suggestGradeFromBirthDate } from '@/lib/custody/education';

interface ChildInput {
  id: string;
  name: string;
  birthDate: Date | null;
  currentGrade: number | null;
  override: boolean;
}

interface EducationLevelsSubStepProps {
  childIds: string[];
  onDone: () => void;
  onBack: () => void;
}

const GRADE_LABELS: Record<number, string> = {
  0: 'גן חובה',
  1: 'א׳',
  2: 'ב׳',
  3: 'ג׳',
  4: 'ד׳',
  5: 'ה׳',
  6: 'ו׳',
  7: 'ז׳',
  8: 'ח׳',
  9: 'ט׳',
  10: 'י׳',
  11: 'י"א',
  12: 'י"ב',
};

export const EducationLevelsSubStep: React.FC<EducationLevelsSubStepProps> = ({
  childIds,
  onDone,
  onBack,
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inputs, setInputs] = useState<ChildInput[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('children')
        .select('id, name, birth_date')
        .in('id', childIds);
      if (cancelled) return;
      if (error || !data) {
        toast.error('שגיאה בטעינת פרטי הילדים');
        setLoading(false);
        return;
      }
      setInputs(
        data.map((c: { id: string; name: string; birth_date: string | null }) => ({
          id: c.id,
          name: c.name,
          birthDate: c.birth_date ? new Date(c.birth_date) : null,
          currentGrade: c.birth_date ? suggestGradeFromBirthDate(new Date(c.birth_date)) : null,
          override: false,
        })),
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [childIds]);

  const nextSepYear = useMemo(() => {
    const now = new Date();
    return now.getMonth() >= 8 ? now.getFullYear() + 1 : now.getFullYear();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = inputs.map((child) =>
        supabase
          .from('children')
          .update({
            current_grade: child.currentGrade,
            education_auto: !child.override,
          })
          .eq('id', child.id),
      );
      const results = await Promise.all(updates);
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
      onDone();
    } catch (err) {
      console.error('Error saving education levels:', err);
      toast.error('לא הצלחנו לשמור את המסגרת. נסו שוב.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-16 bg-muted/30 rounded-full mx-auto w-16" />
        <div className="h-4 bg-muted/30 rounded w-1/2 mx-auto" />
        <div className="h-20 bg-muted/30 rounded" />
        <div className="h-20 bg-muted/30 rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right duration-500">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
          <GraduationCap className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">מסגרת חינוכית לכל ילד</h2>
        <p className="text-muted-foreground text-sm">
          המידע הזה עוזר למערכת לזהות את חופשות בית-הספר.
        </p>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
        {inputs.map((child, idx) => (
          <ChildRow
            key={child.id}
            child={child}
            onChange={(patch) =>
              setInputs((cur) => {
                const next = [...cur];
                next[idx] = { ...next[idx], ...patch };
                return next;
              })
            }
          />
        ))}
      </div>

      <Alert className="bg-muted/40">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          בספטמבר הקרוב (1.9.{nextSepYear}) הכיתה תתקדם אוטומטית.
        </AlertDescription>
      </Alert>

      <div className="flex gap-3 pt-4">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={saving}
          className="flex-1 transition-all duration-300 hover:scale-105"
        >
          חזור
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-gradient-to-r from-primary to-primary/80 transition-all duration-300 hover:scale-105"
        >
          {saving ? 'שומר...' : 'המשך'}
        </Button>
      </div>
    </div>
  );
};

const ChildRow: React.FC<{
  child: ChildInput;
  onChange: (patch: Partial<ChildInput>) => void;
}> = ({ child, onChange }) => {
  const level: EducationLevel | null = educationLevelForGrade(child.currentGrade);
  const age =
    child.birthDate !== null
      ? Math.floor((Date.now() - child.birthDate.getTime()) / (365.25 * 86_400_000))
      : null;

  if (!child.birthDate) {
    return (
      <fieldset className="p-4 rounded-lg border bg-muted/30 text-center">
        <legend className="sr-only">{child.name}</legend>
        <p className="text-sm font-semibold mb-1">{child.name}</p>
        <p className="text-xs text-muted-foreground">
          חסר תאריך לידה — חזרו למסך הקודם כדי להוסיף.
        </p>
      </fieldset>
    );
  }

  return (
    <fieldset className="group p-4 rounded-lg border bg-card hover:border-primary/50 transition-all duration-300">
      <legend className="text-sm font-bold px-1">
        {child.name}{age !== null ? ` (גיל ${age})` : ''}
      </legend>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">מסגרת משוערת:</Label>
          <p className="text-sm font-medium">
            {level ? EDUCATION_LABELS_HE[level] : '—'}
          </p>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`grade-${child.id}`} className="text-xs text-muted-foreground">
            כיתה נוכחית
          </Label>
          <Select
            value={child.currentGrade !== null ? String(child.currentGrade) : ''}
            onValueChange={(v) =>
              onChange({ currentGrade: parseInt(v, 10), override: true })
            }
          >
            <SelectTrigger id={`grade-${child.id}`}>
              <SelectValue placeholder="בחרו כיתה" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(GRADE_LABELS).map(([g, label]) => (
                <SelectItem key={g} value={g}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
          <Check className="w-3 h-3" />
          {child.override ? 'הוגדר ידנית' : 'מחושב אוטומטית'}
        </span>
        <FrameworkOverride
          level={level}
          onPick={(lvl) => {
            const defaultGrade: Record<EducationLevel, number> = {
              kindergarten: 0,
              elementary: 1,
              middle_school: 7,
              high_school: 10,
            };
            onChange({ currentGrade: defaultGrade[lvl], override: true });
          }}
        />
      </div>
    </fieldset>
  );
};

const FrameworkOverride: React.FC<{
  level: EducationLevel | null;
  onPick: (l: EducationLevel) => void;
}> = ({ level, onPick }) => {
  const levels: EducationLevel[] = [
    'kindergarten',
    'elementary',
    'middle_school',
    'high_school',
  ];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 text-xs">
          <Pencil className="w-3 h-3 ml-1" />
          שנה מסגרת
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start">
        <div className="flex flex-col gap-1">
          {levels.map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => onPick(lvl)}
              className={`text-right px-3 py-2 rounded text-sm hover:bg-muted ${
                level === lvl ? 'bg-primary/10 text-primary font-semibold' : ''
              }`}
            >
              {EDUCATION_LABELS_HE[lvl]}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
