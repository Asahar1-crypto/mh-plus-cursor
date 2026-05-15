import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { useAuth } from '@/contexts/auth';
import { activityService, ActivityLog as ActivityLogEntry } from '@/integrations/supabase/activityService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { MascotImage } from '@/components/mascot/MascotImage';

/**
 * Per-action visual config. Colors lean on the brand status quartet
 * (pending=amber, approved=green, paid=blue, rejected=red) rather than the
 * old rainbow palette so the activity log reads as part of the new design
 * system. The `accent` color drives a 3px start-edge bar on each row for
 * visual rhythm without competing badges.
 */
const ACTION_CONFIG: Record<string, { label: string; color: string; accent: string }> = {
  add_expense: {
    label: 'הוספה',
    color:
      'bg-[hsl(195_55%_94%)] text-[hsl(195_70%_25%)] dark:bg-[hsl(195_55%_18%)] dark:text-[hsl(195_55%_85%)]',
    accent: 'bg-primary',
  },
  approve_expense: {
    label: 'אישור',
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200',
    accent: 'bg-emerald-500',
  },
  reject_expense: {
    label: 'דחייה',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
    accent: 'bg-red-500',
  },
  mark_paid: {
    label: 'תשלום',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
    accent: 'bg-blue-500',
  },
  close_month: {
    label: 'סגירת חודש',
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
    accent: 'bg-amber-500',
  },
};

export const ActivityLog: React.FC<{ limit?: number }> = ({ limit = 30 }) => {
  const { account } = useAuth();
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [isOpen, setIsOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!account?.id) return;
    setIsLoading(true);
    activityService.fetch(account.id, limit).then(data => {
      setLogs(data);
      setIsLoading(false);
    });
  }, [account?.id, limit]);

  if (!account || (logs.length === 0 && !isLoading)) return null;

  return (
    <Card className="bg-card border border-border/50 shadow-xl">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer pb-2 hover:bg-muted/20 transition-colors rounded-t-lg">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3 text-base sm:text-lg">
                <MascotImage
                  kind="blue"
                  pose="checking"
                  size="sm"
                  animate="idle"
                  className="!h-10 !w-10"
                />
                יומן פעילות
                {logs.length > 0 && (
                  <Badge variant="secondary" className="text-xs">{logs.length}</Badge>
                )}
              </CardTitle>
              {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="px-4 pb-4 pt-0">
            {isLoading ? (
              <div className="py-4 text-center text-sm text-muted-foreground">טוען...</div>
            ) : (
              <div className="space-y-1">
                {logs.map(log => {
                  const cfg = ACTION_CONFIG[log.action] ?? {
                    label: log.action,
                    color: 'bg-muted text-muted-foreground',
                    accent: 'bg-muted-foreground/40',
                  };
                  return (
                    <div
                      key={log.id}
                      className="relative flex items-start gap-3 py-2.5 ps-3 border-b border-border/30 last:border-0"
                    >
                      {/* Logical start-edge accent bar (RTL-safe via inset-inline-start) */}
                      <span
                        aria-hidden="true"
                        className={`absolute inset-y-2 start-0 w-[3px] rounded-full ${cfg.accent}`}
                      />
                      <Badge className={`text-[10px] px-1.5 py-0.5 rounded-md shrink-0 mt-0.5 ${cfg.color}`}>
                        {cfg.label}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-snug">{log.description}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
                          {format(new Date(log.created_at), 'dd/MM/yy HH:mm', { locale: he })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
