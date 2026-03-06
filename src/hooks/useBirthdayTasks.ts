import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  birthdayService,
  BirthdayTask,
  BirthdayTaskTemplate,
  AddTaskData,
} from '@/integrations/supabase/birthdayService';

export function useBirthdayTasks(projectId: string | undefined) {
  const queryClient = useQueryClient();
  const key = ['birthday-tasks', projectId];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });

  const query = useQuery<BirthdayTask[]>({
    queryKey: key,
    queryFn: () => birthdayService.getTasks(projectId!),
    enabled: !!projectId,
  });

  const addTaskMutation = useMutation({
    mutationFn: (data: AddTaskData) => birthdayService.addTask(data),
    onSuccess: invalidate,
  });

  const claimMutation = useMutation({
    mutationFn: ({ taskId, userId }: { taskId: string; userId: string }) =>
      birthdayService.claimTask(taskId, userId),
    onSuccess: invalidate,
  });

  const unclaimMutation = useMutation({
    mutationFn: (taskId: string) => birthdayService.unclaimTask(taskId),
    onSuccess: invalidate,
  });

  const markPaidMutation = useMutation({
    mutationFn: (args: {
      taskId: string;
      userId: string;
      actualAmount: number;
      receiptUrl?: string;
    }) => birthdayService.markPaid(args.taskId, args.userId, args.actualAmount, args.receiptUrl),
    onSuccess: invalidate,
  });

  const verifyMutation = useMutation({
    mutationFn: ({ taskId, userId }: { taskId: string; userId: string }) =>
      birthdayService.verifyTask(taskId, userId),
    onSuccess: invalidate,
  });

  const cancelMutation = useMutation({
    mutationFn: (taskId: string) => birthdayService.cancelTask(taskId),
    onSuccess: invalidate,
  });

  return {
    tasks: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    addTask: addTaskMutation.mutateAsync,
    isAddingTask: addTaskMutation.isPending,
    claimTask: claimMutation.mutateAsync,
    isClaimingTask: claimMutation.isPending,
    unclaimTask: unclaimMutation.mutateAsync,
    markPaid: markPaidMutation.mutateAsync,
    verifyTask: verifyMutation.mutateAsync,
    cancelTask: cancelMutation.mutateAsync,
  };
}

export function useBirthdayTemplates(childAge: number | null | undefined) {
  return useQuery<BirthdayTaskTemplate[]>({
    queryKey: ['birthday-templates', childAge],
    queryFn: () => birthdayService.getTemplates(childAge!),
    enabled: childAge != null,
  });
}
