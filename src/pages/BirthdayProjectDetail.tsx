import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/auth';
import { useQuery } from '@tanstack/react-query';
import { useBirthdayProject } from '@/hooks/useBirthdayProjects';
import { useBirthdayProjects } from '@/hooks/useBirthdayProjects';
import { useBirthdayTasks } from '@/hooks/useBirthdayTasks';
import { memberService } from '@/contexts/auth/services/account/memberService';
import { BudgetFramePanel } from '@/components/birthday/BudgetFramePanel';
import { BudgetProgressBar } from '@/components/birthday/BudgetProgressBar';
import { TaskBoard } from '@/components/birthday/TaskBoard';
import { SettlementPanel } from '@/components/birthday/SettlementPanel';
import { ProjectStatus } from '@/integrations/supabase/birthdayService';
import { differenceInCalendarDays, parseISO } from 'date-fns';

const STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: 'טיוטה',
  budget_pending: 'ממתין לתקציב',
  active: 'פעיל',
  event_passed: 'האירוע עבר',
  settled: 'סוגר',
  archived: 'ארכיון',
};

const STATUS_VARIANTS: Record<ProjectStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'outline',
  budget_pending: 'secondary',
  active: 'default',
  event_passed: 'secondary',
  settled: 'outline',
  archived: 'outline',
};

const BirthdayProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, account } = useAuth();

  const { data: project, isLoading: projectLoading, error: projectError } = useBirthdayProject(id, account?.id);
  const { tasks, isLoading: tasksLoading, addTask, claimTask, unclaimTask, markPaid, verifyTask, cancelTask, isAddingTask } =
    useBirthdayTasks(id);
  const { confirmBudget, isConfirmingBudget, markSettled, isSettling } = useBirthdayProjects(account?.id);

  const { data: members = [] } = useQuery({
    queryKey: ['account-members', account?.id],
    queryFn: () => memberService.getAccountMembers(account!.id),
    enabled: !!account?.id,
  });

  if (!user || !account) return null;

  if (projectLoading || tasksLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (projectError || !project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-muted-foreground">לא נמצא פרויקט</p>
        <Button variant="outline" onClick={() => navigate('/birthday-projects')}>
          חזור לרשימה
        </Button>
      </div>
    );
  }

  // Resolve members: memberA = initiatedBy, memberB = the other
  const memberA = members.find((m) => m.user_id === project.initiatedBy) ?? members[0];
  const memberB = members.find((m) => m.user_id !== project.initiatedBy) ?? members[1];
  const memberAId = memberA?.user_id ?? project.initiatedBy ?? '';
  const memberBId = memberB?.user_id ?? '';
  const memberAName = memberA?.user_name ?? 'הורה א';
  const memberBName = memberB?.user_name ?? 'הורה ב';

  const daysUntil = differenceInCalendarDays(parseISO(project.birthdayDate), new Date());
  const birthdayLabel = new Date(project.birthdayDate).toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const showBudgetPanel = project.status === 'draft' || project.status === 'budget_pending';
  const showTaskBoard = project.status === 'active' || project.status === 'event_passed';
  const showSettlement = project.status === 'event_passed' || project.status === 'settled' || project.status === 'archived';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30">
      <div className="w-full max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        {/* Back button */}
        <Button variant="ghost" size="sm" onClick={() => navigate('/birthday-projects')} className="gap-2">
          <ArrowRight className="h-4 w-4" />
          כל הפרויקטים
        </Button>

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl border border-primary/20">
              <PartyPopper className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">
                {project.childName}
                {project.childAgeAtEvent != null && (
                  <span className="text-muted-foreground font-normal text-base"> · גיל {project.childAgeAtEvent}</span>
                )}
              </h1>
              <p className="text-sm text-muted-foreground">{birthdayLabel}</p>
            </div>
          </div>
          <Badge variant={STATUS_VARIANTS[project.status]}>{STATUS_LABELS[project.status]}</Badge>
        </div>

        {/* Countdown */}
        <div className="text-sm font-medium">
          {daysUntil > 0 ? (
            <span className="text-primary">{daysUntil} ימים ליום ההולדת</span>
          ) : daysUntil === 0 ? (
            <span className="text-green-600">היום יום ההולדת!</span>
          ) : (
            <span className="text-muted-foreground">יום ההולדת עבר לפני {Math.abs(daysUntil)} ימים</span>
          )}
        </div>

        {/* Budget progress (when active) */}
        {showTaskBoard && project.totalBudget != null && project.totalBudget > 0 && (
          <BudgetProgressBar
            committed={project.totalSpent}
            total={project.totalBudget}
          />
        )}

        {/* Phase panels */}
        {showBudgetPanel && (
          <BudgetFramePanel
            project={project}
            currentUserId={user.id}
            memberAId={memberAId}
            memberAName={memberAName}
            memberBName={memberBName}
            onConfirm={async (totalBudget, splitRatioA, isUserA) => {
              await confirmBudget({
                projectId: project.id,
                userId: user.id,
                totalBudget,
                splitRatioA,
                isUserA,
              });
            }}
            isLoading={isConfirmingBudget}
          />
        )}

        {showTaskBoard && (
          <TaskBoard
            project={project}
            tasks={tasks}
            currentUserId={user.id}
            memberAId={memberAId}
            memberAName={memberAName}
            memberBName={memberBName}
            onAddTask={addTask}
            onClaimTask={claimTask}
            onUnclaimTask={unclaimTask}
            onMarkPaid={markPaid}
            onVerifyTask={verifyTask}
            onCancelTask={cancelTask}
            isAddingTask={isAddingTask}
          />
        )}

        {showSettlement && (
          <SettlementPanel
            project={project}
            tasks={tasks}
            memberAId={memberAId}
            memberAName={memberAName}
            memberBId={memberBId}
            memberBName={memberBName}
            onMarkSettled={markSettled}
            isLoading={isSettling}
          />
        )}
      </div>
    </div>
  );
};

export default BirthdayProjectDetail;
