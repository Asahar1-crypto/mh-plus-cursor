import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { useAuth } from '@/contexts/auth';
import { activityService, ActivityLog as ActivityLogEntry } from '@/integrations/supabase/activityService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Activity, ChevronDown, ChevronUp } from 'lucide-react';

const ACTION_CONFIG: Record<string, { label: string; color: string }> = {
  add_expense:     { label: 'הוספה',   color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  approve_expense: { label: 'אישור',   color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  reject_expense:  { label: 'דחייה',   color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  mark_paid:       { label: 'תשלום',   color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  close_month:     { label: 'סגירת חודש', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
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
    <Card className="bg-gradient-to-br from-card/90 to-card/95 backdrop-blur-lg border border-border/50 shadow-xl">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer pb-2 hover:bg-muted/20 transition-colors rounded-t-lg">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <div className="p-2 bg-slate-500/10 rounded-lg">
                  <Activity className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                </div>
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
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {logs.map(log => {
                  const cfg = ACTION_CONFIG[log.action] ?? { label: log.action, color: 'bg-muted text-muted-foreground' };
                  return (
                    <div key={log.id} className="flex items-start gap-2.5 py-2 border-b border-border/30 last:border-0">
                      <Badge className={`text-[10px] px-1.5 py-0.5 rounded-md shrink-0 mt-0.5 ${cfg.color}`}>
                        {cfg.label}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-snug">{log.description}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
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
