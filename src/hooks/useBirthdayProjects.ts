import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  birthdayService,
  BirthdayProject,
  CreateProjectData,
} from '@/integrations/supabase/birthdayService';

export function useBirthdayProjects(accountId: string | undefined) {
  const queryClient = useQueryClient();
  const key = ['birthday-projects', accountId];

  const query = useQuery<BirthdayProject[]>({
    queryKey: key,
    queryFn: () => birthdayService.getProjects(accountId!),
    enabled: !!accountId,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateProjectData) => birthdayService.createProject(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  const confirmBudgetMutation = useMutation({
    mutationFn: (args: {
      projectId: string;
      userId: string;
      totalBudget: number;
      splitRatioA: number;
      isUserA: boolean;
    }) =>
      birthdayService.confirmBudget(
        args.projectId,
        args.userId,
        args.totalBudget,
        args.splitRatioA,
        args.isUserA,
      ),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: key });
      queryClient.invalidateQueries({ queryKey: ['birthday-project', vars.projectId] });
    },
  });

  const markSettledMutation = useMutation({
    mutationFn: (args: { projectId: string; transferAmount: number; transferPayerId: string }) =>
      birthdayService.markSettled(args.projectId, args.transferAmount, args.transferPayerId),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: key });
      queryClient.invalidateQueries({ queryKey: ['birthday-project', vars.projectId] });
    },
  });

  return {
    projects: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createProject: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    confirmBudget: confirmBudgetMutation.mutateAsync,
    isConfirmingBudget: confirmBudgetMutation.isPending,
    markSettled: markSettledMutation.mutateAsync,
    isSettling: markSettledMutation.isPending,
  };
}

export function useBirthdayProject(projectId: string | undefined, accountId: string | undefined) {
  return useQuery<BirthdayProject>({
    queryKey: ['birthday-project', projectId],
    queryFn: () => birthdayService.getProject(projectId!, accountId!),
    enabled: !!projectId && !!accountId,
  });
}
