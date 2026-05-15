import React, { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Plus, CheckCircle2, Clock } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingState, ErrorState } from '@/components/ui/state-views';
import { schoolCalendarService } from '@/integrations/supabase/schoolCalendarService';
import { schoolYearLabelHebrew } from '@/lib/hebrewDates';
import { EDUCATION_LABELS_HE } from '@/integrations/supabase/custodyTypes';
import type {
  EducationLevel,
  SchoolCalendarEventRow,
  SchoolCalendarKind,
} from '@/integrations/supabase/custodyTypes';
import { EventEditDialog } from '@/components/admin/schoolCalendar/EventEditDialog';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { fromIsoDate } from '@/lib/custody/dateUtils';

const KIND_LABELS: Record<SchoolCalendarKind, string> = {
  holiday: 'חג',
  vacation: 'חופשה',
  irregular: 'יום מיוחד',
};

const AdminSchoolCalendarYear: React.FC = () => {
  const { profile, user } = useAuth();
  const params = useParams<{ year: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const schoolYear = decodeURIComponent(params.year ?? '');

  const [levelFilter, setLevelFilter] = useState<EducationLevel | 'all'>('all');
  const [kindFilter, setKindFilter] = useState<SchoolCalendarKind | 'all'>('all');
  const [editEvent, setEditEvent] = useState<SchoolCalendarEventRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const { data, isLoading, error, refetch } = useQuery<SchoolCalendarEventRow[]>({
    queryKey: ['admin-school-calendar-year', schoolYear],
    enabled: Boolean(schoolYear),
    queryFn: () => schoolCalendarService.list({ schoolYear }),
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter((e) => {
      if (levelFilter !== 'all' && !e.applies_to.includes(levelFilter)) return false;
      if (kindFilter !== 'all' && e.kind !== kindFilter) return false;
      return true;
    });
  }, [data, levelFilter, kindFilter]);

  const stats = useMemo(() => {
    if (!data) return { total: 0, verified: 0 };
    return {
      total: data.length,
      verified: data.filter((e) => e.verified_at !== null).length,
    };
  }, [data]);

  if (!profile?.is_super_admin) return <Navigate to="/dashboard" />;

  const handleVerifyAll = async () => {
    if (!user?.id || !data) return;
    const unverified = data.filter((e) => e.verified_at === null);
    if (unverified.length === 0) {
      toast.info('כל האירועים כבר מאומתים.');
      return;
    }
    if (!window.confirm(`לאשר את כל ${unverified.length} האירועים שלא מאומתים?`)) {
      return;
    }
    try {
      await Promise.all(unverified.map((e) => schoolCalendarService.verify(e.id, user.id)));
      toast.success('כל האירועים אומתו');
      qc.invalidateQueries({ queryKey: ['admin-school-calendar-year', schoolYear] });
      qc.invalidateQueries({ queryKey: ['admin-school-calendar-summary'] });
    } catch (err) {
      console.error(err);
      toast.error('שגיאה באימות מרוכז');
    }
  };

  return (
    <div className="container mx-auto max-w-5xl py-6 px-4" dir="rtl">
      <Button variant="ghost" size="sm" onClick={() => navigate('/admin/school-calendar')} className="mb-3">
        <ArrowRight className="ml-1 h-4 w-4" />
        חזור
      </Button>

      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">
            {schoolYearLabelHebrew(schoolYear)} · {schoolYear}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {stats.total} אירועים ·{' '}
            {stats.verified === stats.total ? (
              <span className="text-green-700 dark:text-green-400">
                <CheckCircle2 className="inline w-3.5 h-3.5 ml-1" />
                מאומת
              </span>
            ) : (
              <span className="text-amber-700 dark:text-amber-400">
                <Clock className="inline w-3.5 h-3.5 ml-1" />
                {stats.verified}/{stats.total} מאומתים
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {stats.verified < stats.total && (
            <Button variant="outline" onClick={handleVerifyAll}>
              <CheckCircle2 className="ml-2 h-4 w-4" />
              אישור מלא
            </Button>
          )}
          <Button
            onClick={() => {
              setEditEvent(null);
              setEditOpen(true);
            }}
          >
            <Plus className="ml-2 h-4 w-4" />
            אירוע חדש
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <Card className="p-3 mb-4 flex gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">מסגרת:</label>
          <Select value={levelFilter} onValueChange={(v) => setLevelFilter(v as typeof levelFilter)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">הכל</SelectItem>
              {(Object.keys(EDUCATION_LABELS_HE) as EducationLevel[]).map((l) => (
                <SelectItem key={l} value={l}>
                  {EDUCATION_LABELS_HE[l]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">סוג:</label>
          <Select value={kindFilter} onValueChange={(v) => setKindFilter(v as typeof kindFilter)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">הכל</SelectItem>
              <SelectItem value="holiday">חג</SelectItem>
              <SelectItem value="vacation">חופשה</SelectItem>
              <SelectItem value="irregular">יום מיוחד</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {isLoading ? (
        <LoadingState text="טוען אירועים..." />
      ) : error ? (
        <ErrorState onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          לא נמצאו אירועים בפילטרים הנוכחיים.
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-right text-sm">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="p-3 font-semibold">תאריכים</th>
                <th className="p-3 font-semibold">שם</th>
                <th className="p-3 font-semibold">סוג</th>
                <th className="p-3 font-semibold">מסגרות</th>
                <th className="p-3 font-semibold">מקור</th>
                <th className="p-3 font-semibold">אימות</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((event) => (
                <tr
                  key={event.id}
                  className="border-b last:border-b-0 hover:bg-muted/20 cursor-pointer transition-colors"
                  onClick={() => {
                    setEditEvent(event);
                    setEditOpen(true);
                  }}
                >
                  <td className="p-3 text-xs">{formatRange(event.start_date, event.end_date)}</td>
                  <td className="p-3 font-medium">{event.name_he}</td>
                  <td className="p-3 text-xs">{KIND_LABELS[event.kind]}</td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {event.applies_to.length === 4
                      ? 'הכל'
                      : event.applies_to.map((l) => EDUCATION_LABELS_HE[l]).join(', ')}
                  </td>
                  <td className="p-3 text-xs">{event.source}</td>
                  <td className="p-3">
                    {event.verified_at ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" aria-label="מאומת" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-600" aria-label="ממתין" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <EventEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        event={editEvent}
        schoolYear={schoolYear}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ['admin-school-calendar-year', schoolYear] });
          qc.invalidateQueries({ queryKey: ['admin-school-calendar-summary'] });
        }}
        onDeleted={() => {
          qc.invalidateQueries({ queryKey: ['admin-school-calendar-year', schoolYear] });
          qc.invalidateQueries({ queryKey: ['admin-school-calendar-summary'] });
        }}
      />
    </div>
  );
};

function formatRange(start: string, end: string): string {
  if (start === end) return format(fromIsoDate(start), 'dd.MM.yyyy', { locale: he });
  const a = fromIsoDate(start);
  const b = fromIsoDate(end);
  const sameYear = a.getFullYear() === b.getFullYear();
  const left = format(a, 'dd.MM', { locale: he });
  const right = format(b, sameYear ? 'dd.MM.yyyy' : 'dd.MM.yyyy', { locale: he });
  return `${left} – ${right}`;
}

export default AdminSchoolCalendarYear;
