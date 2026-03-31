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
  const [error, setError] = useState<string | null>(null);
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
    setError(null);
    try {
      const data = await custodyService.getAssignments(accountId);
      setAssignments(data);
    } catch (err) {
      console.error('Failed to load assignments:', err);
      setError('שגיאה בטעינת נתוני המשמורת');
      toast.error('שגיאה בטעינת נתוני המשמורת — רענן את הדף');
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
    if (!accountId) return;
    try {
      await custodyService.updateParent(assignmentId, accountId, parentId);
      setAssignments((prev) =>
        prev.map((a) =>
          a.id === assignmentId
            ? { ...a, assigned_parent_id: parentId, updated_at: new Date().toISOString() }
            : a
        )
      );
      toast.success('הורה שובץ בהצלחה');
    } catch {
      toast.error('שגיאה בשיבוץ הורה — נסה שוב');
    }
  }, []);

  const updateNotes = useCallback(async (assignmentId: string, notes: string) => {
    if (!accountId) return;
    try {
      await custodyService.updateNotes(assignmentId, accountId, notes);
      setAssignments((prev) =>
        prev.map((a) =>
          a.id === assignmentId ? { ...a, notes } : a
        )
      );
    } catch {
      toast.error('שגיאה בעדכון הערות — נסה שוב');
    }
  }, [accountId]);

  const deleteAssignment = useCallback(async (assignmentId: string) => {
    if (!accountId) return;
    try {
      await custodyService.deleteAssignment(assignmentId, accountId);
      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
      toast.success('האירוע נמחק');
    } catch {
      toast.error('שגיאה במחיקת האירוע — נסה שוב');
    }
  }, []);

  const bulkAssignParent = useCallback(async (assignmentIds: string[], parentId: string | null) => {
    if (!accountId) return;
    try {
      await custodyService.bulkAssignParent(assignmentIds, accountId, parentId);
      setAssignments((prev) =>
        prev.map((a) =>
          assignmentIds.includes(a.id)
            ? { ...a, assigned_parent_id: parentId, updated_at: new Date().toISOString() }
            : a
        )
      );
      toast.success(`${assignmentIds.length} אירועים שובצו בהצלחה`);
    } catch {
      toast.error('שגיאה בשיבוץ מרובה — נסה שוב');
    }
  }, []);

  return {
    assignments,
    isLoading,
    error,
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
