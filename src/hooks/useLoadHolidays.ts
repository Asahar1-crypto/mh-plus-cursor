import { useCallback } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { schoolCalendarService } from '@/integrations/supabase/schoolCalendarService';
import { custodyExceptionService } from '@/integrations/supabase/custodyService';
import type { EducationLevel } from '@/integrations/supabase/custodyTypes';

/**
 * Loads school-calendar events for a given school year into the account's
 * custody_exceptions. Skips events whose source_event_id has already been
 * imported, so it's safe to run repeatedly.
 */
export function useLoadHolidays() {
  const { user, account } = useAuth();
  const qc = useQueryClient();

  return useCallback(
    async (schoolYear: string) => {
      if (!user?.id || !account?.id) {
        toast.error('יש להתחבר לפני טעינת חגים');
        return;
      }
      try {
        // 1. Load the account's children's education levels.
        const { data: children } = await supabase
          .from('children')
          .select('education_level')
          .eq('account_id', account.id);

        const levels = new Set<EducationLevel>();
        for (const c of (children ?? []) as { education_level: EducationLevel | null }[]) {
          if (c.education_level) levels.add(c.education_level);
        }
        if (levels.size === 0) {
          toast.info(
            'לא הוגדרו מסגרות חינוכיות לילדים. יש לעדכן אותן בהגדרות כדי לטעון חופשות.',
          );
          return;
        }

        // 2. Load events from school_calendar_events that apply to these levels.
        const events = await schoolCalendarService.list({ schoolYear });
        const relevant = events.filter((e) =>
          e.applies_to.some((l) => levels.has(l)),
        );
        if (relevant.length === 0) {
          toast.info(`לא נמצאו אירועים לשנת הלימודים ${schoolYear}`);
          return;
        }

        // 3. Find which source_event_ids are already imported.
        const { data: existing } = await supabase
          .from('custody_exceptions')
          .select('source_event_id')
          .eq('account_id', account.id)
          .in(
            'source_event_id',
            relevant.map((e) => e.id),
          );
        const existingSet = new Set<string>();
        for (const r of (existing ?? []) as { source_event_id: string | null }[]) {
          if (r.source_event_id) existingSet.add(r.source_event_id);
        }

        const toInsert = relevant.filter((e) => !existingSet.has(e.id));
        if (toInsert.length === 0) {
          toast.info('כל האירועים לשנה זו כבר נטענו.');
          return;
        }

        await custodyExceptionService.bulkInsert(
          account.id,
          user.id,
          toInsert.map((e) => ({
            kind: e.kind === 'vacation' ? 'vacation' : e.kind === 'holiday' ? 'holiday' : 'one_off',
            eventName: e.name_he,
            parentEvent: e.parent_event_key,
            sourceEventId: e.id,
            // For vacation rows we pick the first applies_to level we serve.
            // The exception is account-wide so the level is informational.
            educationLevel: e.kind === 'vacation' ? e.applies_to.find((l) => levels.has(l)) ?? null : null,
            startDate: e.start_date,
            endDate: e.end_date,
          })),
        );

        toast.success(`נטענו ${toInsert.length} אירועים לשנת ${schoolYear}`);
        qc.invalidateQueries({ queryKey: ['custody-data'] });
      } catch (err) {
        console.error('Load holidays failed:', err);
        const msg = err instanceof Error ? err.message : 'שגיאה בטעינת חגים';
        toast.error(msg);
      }
    },
    [user?.id, account?.id, qc],
  );
}
