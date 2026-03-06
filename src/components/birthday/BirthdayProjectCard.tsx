import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BirthdayProject, ProjectStatus } from '@/integrations/supabase/birthdayService';
import { BudgetProgressBar } from './BudgetProgressBar';
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

interface BirthdayProjectCardProps {
  project: BirthdayProject;
  taskCount?: number;
  verifiedCount?: number;
}

export const BirthdayProjectCard: React.FC<BirthdayProjectCardProps> = ({
  project,
  taskCount = 0,
  verifiedCount = 0,
}) => {
  const navigate = useNavigate();
  const daysUntil = differenceInCalendarDays(parseISO(project.birthdayDate), new Date());
  const birthdayLabel = new Date(project.birthdayDate).toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'long',
  });

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate(`/birthday-projects/${project.id}`)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-base">
              {project.childName}
              {project.childAgeAtEvent != null && (
                <span className="text-muted-foreground font-normal text-sm"> · גיל {project.childAgeAtEvent}</span>
              )}
            </h3>
            <p className="text-sm text-muted-foreground">{birthdayLabel}</p>
          </div>
          <Badge variant={STATUS_VARIANTS[project.status]}>{STATUS_LABELS[project.status]}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Countdown */}
        <div className="text-sm">
          {daysUntil > 0 ? (
            <span className="text-primary font-medium">{daysUntil} ימים</span>
          ) : daysUntil === 0 ? (
            <span className="text-green-600 font-medium">היום!</span>
          ) : (
            <span className="text-muted-foreground">{Math.abs(daysUntil)} ימים אחרי</span>
          )}
        </div>

        {/* Budget bar */}
        {project.totalBudget != null && project.totalBudget > 0 && (
          <BudgetProgressBar
            committed={project.totalSpent}
            total={project.totalBudget}
            showWarning={false}
          />
        )}

        {/* Task summary */}
        {taskCount > 0 && (
          <p className="text-xs text-muted-foreground">
            {verifiedCount}/{taskCount} משימות הושלמו
          </p>
        )}
      </CardContent>
    </Card>
  );
};
