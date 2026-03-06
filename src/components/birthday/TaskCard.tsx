import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lock, CheckCircle2, Clock } from 'lucide-react';
import { BirthdayTask, TaskCategory } from '@/integrations/supabase/birthdayService';
import { cn } from '@/lib/utils';

const CATEGORY_ICONS: Record<TaskCategory, string> = {
  venue: '🏛',
  food: '🍰',
  entertainment: '🎪',
  gifts: '🎁',
  photography: '📸',
  invitations: '✉️',
  decoration: '🎈',
  misc: '📋',
};

const STATUS_LABELS: Record<string, string> = {
  available: 'פנוי',
  claimed: 'נלקח',
  paid: 'שולם',
  verified: 'מאומת',
  cancelled: 'בוטל',
};

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  claimed: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  paid: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  verified: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  cancelled: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

interface TaskCardProps {
  task: BirthdayTask;
  currentUserId: string;
  partnerName: string;
  onClaim: () => void;
  onUnclaim: () => void;
  onMarkPaid: () => void;
  onVerify: () => void;
  onCancel: () => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  currentUserId,
  partnerName,
  onClaim,
  onUnclaim,
  onMarkPaid,
  onVerify,
  onCancel,
}) => {
  const isMyTask = task.claimedBy === currentUserId || task.paidBy === currentUserId;
  const isPartnerTask = (task.claimedBy && task.claimedBy !== currentUserId) ||
    (task.paidBy && task.paidBy !== currentUserId);

  return (
    <Card className={cn('transition-all', task.status === 'cancelled' && 'opacity-50')}>
      <CardContent className="pt-4 pb-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg flex-shrink-0">{CATEGORY_ICONS[task.category]}</span>
            <p className="font-medium text-sm truncate">{task.title}</p>
          </div>
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0', STATUS_COLORS[task.status])}>
            {STATUS_LABELS[task.status]}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {task.actualAmount != null
              ? `₪${task.actualAmount.toLocaleString()} שולם`
              : task.estimatedAmount != null
              ? `~₪${task.estimatedAmount.toLocaleString()} משוער`
              : 'אין הערכת עלות'}
          </span>
          {task.status === 'verified' && (
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle2 className="h-3 w-3" /> אומת
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap">
          {task.status === 'available' && (
            <>
              <Button size="sm" className="h-7 text-xs" onClick={onClaim}>
                לקח/י
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={onCancel}>
                בטל
              </Button>
            </>
          )}

          {task.status === 'claimed' && isMyTask && (
            <>
              <Button size="sm" className="h-7 text-xs" onClick={onMarkPaid}>
                הוסף קבלה
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onUnclaim}>
                שחרר
              </Button>
            </>
          )}

          {task.status === 'claimed' && isPartnerTask && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" /> {partnerName} לקח/ה
            </span>
          )}

          {task.status === 'paid' && isPartnerTask && (
            <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700" onClick={onVerify}>
              אמת תשלום
            </Button>
          )}

          {task.status === 'paid' && isMyTask && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" /> ממתין לאימות
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
