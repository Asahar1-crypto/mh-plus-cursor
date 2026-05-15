import React, { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Plus,
  ChevronLeft,
  Clock,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadingState, ErrorState } from '@/components/ui/state-views';
import { schoolCalendarService } from '@/integrations/supabase/schoolCalendarService';
import { schoolYearLabelHebrew } from '@/lib/hebrewDates';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { ImportYearDialog } from '@/components/admin/schoolCalendar/ImportYearDialog';

interface YearSummary {
  schoolYear: string;
  totalEvents: number;
  verifiedCount: number;
  lastUpdated: string | null;
}

const AdminSchoolCalendar: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [importOpen, setImportOpen] = useState(false);

  const { data, isLoading, error, refetch } = useQuery<YearSummary[]>({
    queryKey: ['admin-school-calendar-summary'],
    queryFn: async () => {
      const { data: rows, error: err } = await supabase
        .from('school_calendar_events')
        .select('school_year, verified_at, updated_at');
      if (err) throw err;
      const bucket = new Map<string, YearSummary>();
      for (const r of (rows ?? []) as {
        school_year: string;
        verified_at: string | null;
        updated_at: string;
      }[]) {
        const cur = bucket.get(r.school_year) ?? {
          schoolYear: r.school_year,
          totalEvents: 0,
          verifiedCount: 0,
          lastUpdated: null,
        };
        cur.totalEvents += 1;
        if (r.verified_at) cur.verifiedCount += 1;
        if (!cur.lastUpdated || r.updated_at > cur.lastUpdated) {
          cur.lastUpdated = r.updated_at;
        }
        bucket.set(r.school_year, cur);
      }
      return Array.from(bucket.values()).sort((a, b) =>
        a.schoolYear < b.schoolYear ? 1 : -1,
      );
    },
  });

  if (!profile?.is_super_admin) return <Navigate to="/dashboard" />;

  return (
    <div className="container mx-auto max-w-5xl py-6 px-4" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-primary" />
            לוח חופשות בית-ספר (מנהל)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            תחזוקה של תאריכי החופשות לכל שנת-לימודים
          </p>
        </div>
        <Button onClick={() => setImportOpen(true)}>
          <Plus className="ml-2 h-4 w-4" />
          ייבא שנה חדשה
        </Button>
      </div>

      {isLoading ? (
        <LoadingState text="טוען שנים..." />
      ) : error ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !data || data.length === 0 ? (
        <EmptyYearsState onImport={() => setImportOpen(true)} />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-right text-sm">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="p-3 font-semibold">שנה</th>
                <th className="p-3 font-semibold">אירועים</th>
                <th className="p-3 font-semibold">סטטוס</th>
                <th className="p-3 font-semibold">עודכן לאחרונה</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {data.map((y) => (
                <YearRow
                  key={y.schoolYear}
                  summary={y}
                  onOpen={() =>
                    navigate(`/admin/school-calendar/${encodeURIComponent(y.schoolYear)}`)
                  }
                />
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <ImportYearDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={() => refetch()}
      />
    </div>
  );
};

const YearRow: React.FC<{ summary: YearSummary; onOpen: () => void }> = ({
  summary,
  onOpen,
}) => {
  const hebrewLabel = schoolYearLabelHebrew(summary.schoolYear);
  const isFullyVerified = summary.verifiedCount === summary.totalEvents;

  return (
    <tr className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
      <td className="p-3 font-medium">
        {hebrewLabel} · {summary.schoolYear}
      </td>
      <td className="p-3 text-muted-foreground">{summary.totalEvents}</td>
      <td className="p-3">
        {isFullyVerified ? (
          <span className="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            מאומת
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
            <Clock className="w-3.5 h-3.5" />
            {summary.verifiedCount}/{summary.totalEvents} מאומתים
          </span>
        )}
      </td>
      <td className="p-3 text-xs text-muted-foreground">
        {summary.lastUpdated
          ? format(new Date(summary.lastUpdated), 'dd.MM.yyyy', { locale: he })
          : '—'}
      </td>
      <td className="p-3">
        <Button variant="ghost" size="sm" onClick={onOpen}>
          פתח
          <ChevronLeft className="mr-1 w-3 h-3" />
        </Button>
      </td>
    </tr>
  );
};

const EmptyYearsState: React.FC<{ onImport: () => void }> = ({ onImport }) => (
  <Card className="p-8 text-center">
    <GraduationCap className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
    <h2 className="text-lg font-semibold mb-1">עדיין לא הוגדרו שנים</h2>
    <p className="text-sm text-muted-foreground mb-4">
      ייבא את שנת הלימודים הראשונה כדי להתחיל.
    </p>
    <Button onClick={onImport}>
      <Plus className="ml-2 h-4 w-4" />
      ייבא שנה חדשה
    </Button>
  </Card>
);

void schoolCalendarService; // keep import used in case of future wiring
void Loader2;

export default AdminSchoolCalendar;
