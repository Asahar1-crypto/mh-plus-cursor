import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BirthdayTask, BirthdayProject, AddTaskData, TaskStatus } from '@/integrations/supabase/birthdayService';
import { TaskCard } from './TaskCard';
import { TaskActionModal } from './TaskActionModal';
import { SuggestedTasksSection } from './SuggestedTasksSection';
import { AddTaskModal } from './AddTaskModal';

type ActionType = 'claim' | 'unclaim' | 'mark_paid' | 'verify' | 'cancel';

interface TaskBoardProps {
  project: BirthdayProject;
  tasks: BirthdayTask[];
  currentUserId: string;
  memberAId: string;
  memberAName: string;
  memberBName: string;
  onAddTask: (data: AddTaskData) => Promise<void>;
  onClaimTask: (args: { taskId: string; userId: string }) => Promise<void>;
  onUnclaimTask: (taskId: string) => Promise<void>;
  onMarkPaid: (args: { taskId: string; userId: string; actualAmount: number; receiptUrl?: string }) => Promise<void>;
  onVerifyTask: (args: { taskId: string; userId: string }) => Promise<void>;
  onCancelTask: (taskId: string) => Promise<void>;
  isAddingTask?: boolean;
}

const STATUS_ORDER: TaskStatus[] = ['available', 'claimed', 'paid', 'verified', 'cancelled'];
const STATUS_LABELS: Record<TaskStatus, string> = {
  available: 'פנויות',
  claimed: 'בתהליך',
  paid: 'שולם – ממתין לאימות',
  verified: 'מאומתות',
  cancelled: 'בוטלו',
};

export const TaskBoard: React.FC<TaskBoardProps> = ({
  project,
  tasks,
  currentUserId,
  memberAId,
  memberAName,
  memberBName,
  onAddTask,
  onClaimTask,
  onUnclaimTask,
  onMarkPaid,
  onVerifyTask,
  onCancelTask,
  isAddingTask,
}) => {
  const [selectedTask, setSelectedTask] = useState<BirthdayTask | null>(null);
  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);

  const partnerName = currentUserId === memberAId ? memberBName : memberAName;

  const openAction = (task: BirthdayTask, action: ActionType) => {
    setSelectedTask(task);
    setSelectedAction(action);
  };

  const closeModal = () => {
    setSelectedTask(null);
    setSelectedAction(null);
  };

  const handleConfirm = async (args?: { actualAmount?: number; receiptUrl?: string }) => {
    if (!selectedTask || !selectedAction) return;
    setModalLoading(true);
    try {
      if (selectedAction === 'claim') {
        await onClaimTask({ taskId: selectedTask.id, userId: currentUserId });
      } else if (selectedAction === 'unclaim') {
        await onUnclaimTask(selectedTask.id);
      } else if (selectedAction === 'mark_paid') {
        await onMarkPaid({
          taskId: selectedTask.id,
          userId: currentUserId,
          actualAmount: args?.actualAmount ?? 0,
          receiptUrl: args?.receiptUrl,
        });
      } else if (selectedAction === 'verify') {
        await onVerifyTask({ taskId: selectedTask.id, userId: currentUserId });
      } else if (selectedAction === 'cancel') {
        await onCancelTask(selectedTask.id);
      }
      closeModal();
    } finally {
      setModalLoading(false);
    }
  };

  const grouped = STATUS_ORDER.reduce<Record<TaskStatus, BirthdayTask[]>>(
    (acc, s) => ({ ...acc, [s]: tasks.filter((t) => t.status === s) }),
    {} as Record<TaskStatus, BirthdayTask[]>,
  );

  return (
    <div className="space-y-5">
      <SuggestedTasksSection
        projectId={project.id}
        accountId={project.accountId}
        childAge={project.childAgeAtEvent}
        existingTasks={tasks}
        currentUserId={currentUserId}
        onAddTask={onAddTask}
        isLoading={isAddingTask}
      />

      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">משימות הפרויקט</h3>
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setAddModalOpen(true)}>
          <Plus className="h-3 w-3 ml-1" />
          משימה חדשה
        </Button>
      </div>

      {STATUS_ORDER.filter((s) => grouped[s].length > 0).map((status) => (
        <div key={status} className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {STATUS_LABELS[status]} ({grouped[status].length})
          </h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {grouped[status].map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                currentUserId={currentUserId}
                partnerName={partnerName}
                onClaim={() => openAction(task, 'claim')}
                onUnclaim={() => openAction(task, 'unclaim')}
                onMarkPaid={() => openAction(task, 'mark_paid')}
                onVerify={() => openAction(task, 'verify')}
                onCancel={() => openAction(task, 'cancel')}
              />
            ))}
          </div>
        </div>
      ))}

      {tasks.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">
          אין עדיין משימות – הוסף משימות מהרשימה או צור חדשות
        </p>
      )}

      <TaskActionModal
        task={selectedTask}
        action={selectedAction}
        open={!!selectedTask}
        onClose={closeModal}
        onConfirm={handleConfirm}
        isLoading={modalLoading}
      />

      <AddTaskModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={async ({ title, category, estimatedAmount }) => {
          await onAddTask({
            projectId: project.id,
            accountId: project.accountId,
            title,
            category,
            estimatedAmount,
            isSuggested: false,
            createdBy: currentUserId,
          });
          setAddModalOpen(false);
        }}
        isLoading={isAddingTask}
      />
    </div>
  );
};
