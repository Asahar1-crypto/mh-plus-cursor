import React from 'react';
import { CustodyAssignment } from '@/integrations/supabase/custodyService';
import { AccountMember } from '@/contexts/auth/types';

interface CustodySummaryProps {
  assignments: CustodyAssignment[];
  members: AccountMember[];
}

function countDays(start: string, end: string): number {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
}

const parentColors = [
  'from-blue-400 to-blue-600',
  'from-emerald-400 to-emerald-600',
  'from-purple-400 to-purple-600',
];

const CustodySummary: React.FC<CustodySummaryProps> = ({ assignments, members }) => {
  const summary: Record<string, number> = {};
  let unassignedDays = 0;

  for (const a of assignments) {
    const days = countDays(a.start_date, a.end_date);
    if (a.assigned_parent_id) {
      summary[a.assigned_parent_id] = (summary[a.assigned_parent_id] || 0) + days;
    } else {
      unassignedDays += days;
    }
  }

  const totalDays = Object.values(summary).reduce((s, d) => s + d, 0) + unassignedDays;

  if (totalDays === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
      {members.map((m, idx) => {
        const days = summary[m.user_id] || 0;
        const pct = totalDays > 0 ? Math.round((days / totalDays) * 100) : 0;
        return (
          <div
            key={m.user_id}
            className="relative overflow-hidden rounded-lg sm:rounded-xl border bg-card p-2.5 sm:p-4 shadow-sm"
          >
            <div className={`absolute top-0 right-0 w-1 sm:w-1.5 h-full bg-gradient-to-b ${parentColors[idx] || parentColors[0]}`} />
            <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{m.user_name}</p>
            <p className="text-lg sm:text-2xl font-bold mt-0.5 sm:mt-1">
              {days} <span className="text-xs sm:text-sm font-normal text-muted-foreground">ימים</span>
            </p>
            <div className="mt-1.5 sm:mt-2 h-1 sm:h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${parentColors[idx] || parentColors[0]} transition-all duration-500`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">{pct}%</p>
          </div>
        );
      })}
      {unassignedDays > 0 && (
        <div className="relative overflow-hidden rounded-lg sm:rounded-xl border bg-card p-2.5 sm:p-4 shadow-sm border-dashed">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground">לא משובץ</p>
          <p className="text-lg sm:text-2xl font-bold mt-0.5 sm:mt-1 text-muted-foreground">
            {unassignedDays} <span className="text-xs sm:text-sm font-normal">ימים</span>
          </p>
          <div className="mt-1.5 sm:mt-2 h-1 sm:h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-muted-foreground/30 transition-all duration-500"
              style={{ width: `${Math.round((unassignedDays / totalDays) * 100)}%` }}
            />
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">{Math.round((unassignedDays / totalDays) * 100)}%</p>
        </div>
      )}
    </div>
  );
};

export default CustodySummary;
