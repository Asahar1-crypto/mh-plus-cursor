import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth';
import { custodyService, CustodyAssignment, HolidayItem, EducationLevel } from '@/integrations/supabase/custodyService';
import { memberService } from '@/contexts/auth/services/account/memberService';
import { AccountMember } from '@/contexts/auth/types';
import { toast } from 'sonner';

export function useCustodyAssignments() {
  const { user, account } = useAuth();
  const [assignments, setAssignments] = useState<CustodyAssignment[]>([]);
  const [members, setMembers] = useState<AccountMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingAI, setIsFetchingAI] = useState(false);

  const accountId = account?.id;
  const userId = user?.id;

  const loadMembers = useCallback(async () => {
    if (!accountId) return;
    try {
      const data = await memberService.getAccountMembers(accountId);
      setMembers(data);
    } catch (err) {
      console.error('Failed to load members:', err);
    }
  }, [accountId]);

  const loadAssignments = useCallback(async () => {
    if (!accountId) return;
    setIsLoading(true);
    try {
      const data = await custodyService.getAssignments(accountId);
      setAssignments(data);
    } catch (err) {
      console.error('Failed to load assignments:', err);
      toast.error('שגיאה בטעינת נתוני המשמורת');
    } finally {
      setIsLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    loadAssignments();
    loadMembers();
  }, [loadAssignments, loadMembers]);

  const fetchHolidays = useCallback(async (schoolYear: string) => {
    if (!accountId || !userId) return;
    setIsFetchingAI(true);
    try {
      const items = await custodyService.fetchHolidaysFromAI('holidays', schoolYear, accountId);
      const result = await custodyService.addAssignments(accountId, userId, items, schoolYear);
      await loadAssignments();

      if (result.added > 0) {
        toast.success(`נטענו ${result.added} חגים בהצלחה`);
      } else {
        toast.info('כל החגים כבר קיימים ברשימה');
      }
    } catch (err: any) {
      toast.error(err.message || 'שגיאה בטעינת חגים');
    } finally {
      setIsFetchingAI(false);
    }
  }, [accountId, userId, loadAssignments]);

  const fetchVacations = useCallback(async (schoolYear: string, educationLevel: EducationLevel) => {
    if (!accountId || !userId) return;
    setIsFetchingAI(true);
    try {
      const items = await custodyService.fetchHolidaysFromAI('vacations', schoolYear, accountId, educationLevel);
      const result = await custodyService.addAssignments(accountId, userId, items, schoolYear, educationLevel);
      await loadAssignments();

      if (result.added > 0) {
        toast.success(`נטענו ${result.added} חופשות בהצלחה`);
      } else {
        toast.info('כל החופשות כבר קיימות ברשימה');
      }
    } catch (err: any) {
      toast.error(err.message || 'שגיאה בטעינת חופשות');
    } finally {
      setIsFetchingAI(false);
    }
  }, [accountId, userId, loadAssignments]);

  const assignParent = useCallback(async (assignmentId: string, parentId: string | null) => {
    try {
      await custodyService.updateParent(assignmentId, parentId);
      setAssignments((prev) =>
        prev.map((a) =>
          a.id === assignmentId
            ? { ...a, assigned_parent_id: parentId, updated_at: new Date().toISOString() }
            : a
        )
      );
      toast.success('הורה שובץ בהצלחה');
    } catch {
      toast.error('שגיאה בשיבוץ הורה');
    }
  }, []);

  const updateNotes = useCallback(async (assignmentId: string, notes: string) => {
    try {
      await custodyService.updateNotes(assignmentId, notes);
      setAssignments((prev) =>
        prev.map((a) =>
          a.id === assignmentId ? { ...a, notes } : a
        )
      );
    } catch {
      toast.error('שגיאה בעדכון הערות');
    }
  }, []);

  const deleteAssignment = useCallback(async (assignmentId: string) => {
    try {
      await custodyService.deleteAssignment(assignmentId);
      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
      toast.success('האירוע נמחק');
    } catch {
      toast.error('שגיאה במחיקת האירוע');
    }
  }, []);

  const bulkAssignParent = useCallback(async (assignmentIds: string[], parentId: string | null) => {
    try {
      await custodyService.bulkAssignParent(assignmentIds, parentId);
      setAssignments((prev) =>
        prev.map((a) =>
          assignmentIds.includes(a.id)
            ? { ...a, assigned_parent_id: parentId, updated_at: new Date().toISOString() }
            : a
        )
      );
      toast.success(`${assignmentIds.length} אירועים שובצו בהצלחה`);
    } catch {
      toast.error('שגיאה בשיבוץ מרובה');
    }
  }, []);

  return {
    assignments,
    isLoading,
    isFetchingAI,
    members,
    fetchHolidays,
    fetchVacations,
    assignParent,
    updateNotes,
    deleteAssignment,
    bulkAssignParent,
    reload: loadAssignments,
  };
}
