import { supabase } from './client';

// ============================================================
// Types
// ============================================================

export type ProjectStatus = 'draft' | 'budget_pending' | 'active' | 'event_passed' | 'settled' | 'archived';
export type TaskStatus = 'available' | 'claimed' | 'paid' | 'verified' | 'cancelled';
export type TaskCategory = 'venue' | 'food' | 'entertainment' | 'gifts' | 'photography' | 'invitations' | 'decoration' | 'misc';

export interface BirthdayProject {
  id: string;
  accountId: string;
  childId: string | null;
  childName: string;
  birthdayDate: string;
  childAgeAtEvent: number | null;
  status: ProjectStatus;
  totalBudget: number | null;
  splitRatioA: number;
  budgetConfirmedA: boolean;
  budgetConfirmedB: boolean;
  budgetLockedAt: string | null;
  totalSpent: number;
  transferAmount: number | null;
  transferPayerId: string | null;
  settledAt: string | null;
  initiatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BirthdayTask {
  id: string;
  projectId: string;
  accountId: string;
  title: string;
  description: string | null;
  category: TaskCategory;
  estimatedAmount: number | null;
  status: TaskStatus;
  claimedBy: string | null;
  claimedAt: string | null;
  paidBy: string | null;
  paidAt: string | null;
  actualAmount: number | null;
  receiptUrl: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  isSuggested: boolean;
  templateId: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BirthdayTaskTemplate {
  id: string;
  title: string;
  category: TaskCategory;
  ageMin: number;
  ageMax: number;
  isMust: boolean;
  estimatedMin: number | null;
  estimatedMax: number | null;
  sortOrder: number;
  description: string | null;
}

export interface SettlementResult {
  spentByA: number;
  spentByB: number;
  shouldPayA: number;
  shouldPayB: number;
  transferAmount: number;
  transferPayerId: string | null;
}

export interface CreateProjectData {
  accountId: string;
  childId?: string | null;
  childName: string;
  birthdayDate: string;
  childAgeAtEvent?: number | null;
  initiatedBy: string;
}

export interface AddTaskData {
  projectId: string;
  accountId: string;
  title: string;
  description?: string;
  category: TaskCategory;
  estimatedAmount?: number | null;
  isSuggested?: boolean;
  templateId?: string | null;
  createdBy: string;
}

// ============================================================
// Row mappers
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProject(row: any): BirthdayProject {
  return {
    id: row.id,
    accountId: row.account_id,
    childId: row.child_id,
    childName: row.child_name,
    birthdayDate: row.birthday_date,
    childAgeAtEvent: row.child_age_at_event,
    status: row.status as ProjectStatus,
    totalBudget: row.total_budget,
    splitRatioA: row.split_ratio_a,
    budgetConfirmedA: row.budget_confirmed_a,
    budgetConfirmedB: row.budget_confirmed_b,
    budgetLockedAt: row.budget_locked_at,
    totalSpent: row.total_spent ?? 0,
    transferAmount: row.transfer_amount,
    transferPayerId: row.transfer_payer_id,
    settledAt: row.settled_at,
    initiatedBy: row.initiated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTask(row: any): BirthdayTask {
  return {
    id: row.id,
    projectId: row.project_id,
    accountId: row.account_id,
    title: row.title,
    description: row.description,
    category: row.category as TaskCategory,
    estimatedAmount: row.estimated_amount,
    status: row.status as TaskStatus,
    claimedBy: row.claimed_by,
    claimedAt: row.claimed_at,
    paidBy: row.paid_by,
    paidAt: row.paid_at,
    actualAmount: row.actual_amount,
    receiptUrl: row.receipt_url,
    verifiedBy: row.verified_by,
    verifiedAt: row.verified_at,
    isSuggested: row.is_suggested,
    templateId: row.template_id,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTemplate(row: any): BirthdayTaskTemplate {
  return {
    id: row.id,
    title: row.title,
    category: row.category as TaskCategory,
    ageMin: row.age_min,
    ageMax: row.age_max,
    isMust: row.is_must,
    estimatedMin: row.estimated_min,
    estimatedMax: row.estimated_max,
    sortOrder: row.sort_order,
    description: row.description,
  };
}

// ============================================================
// Service
// ============================================================

export const birthdayService = {
  // ── Projects ────────────────────────────────────────────────

  async getProjects(accountId: string): Promise<BirthdayProject[]> {
    const { data, error } = await supabase
      .from('birthday_projects')
      .select('*')
      .eq('account_id', accountId)
      .order('birthday_date', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapProject);
  },

  async getProject(id: string): Promise<BirthdayProject> {
    const { data, error } = await supabase
      .from('birthday_projects')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return mapProject(data);
  },

  async createProject(input: CreateProjectData): Promise<BirthdayProject> {
    const { data, error } = await supabase
      .from('birthday_projects')
      .insert({
        account_id: input.accountId,
        child_id: input.childId ?? null,
        child_name: input.childName,
        birthday_date: input.birthdayDate,
        child_age_at_event: input.childAgeAtEvent ?? null,
        status: 'draft',
        initiated_by: input.initiatedBy,
      })
      .select()
      .single();
    if (error) throw error;
    return mapProject(data);
  },

  async confirmBudget(
    projectId: string,
    userId: string,
    totalBudget: number,
    splitRatioA: number,
    isUserA: boolean,
  ): Promise<void> {
    const updateField = isUserA ? 'budget_confirmed_a' : 'budget_confirmed_b';
    // Fetch current state
    const { data: project, error: fetchError } = await supabase
      .from('birthday_projects')
      .select('budget_confirmed_a, budget_confirmed_b')
      .eq('id', projectId)
      .single();
    if (fetchError) throw fetchError;

    const confirmedA = isUserA ? true : project.budget_confirmed_a;
    const confirmedB = isUserA ? project.budget_confirmed_b : true;
    const bothConfirmed = confirmedA && confirmedB;

    const { error } = await supabase
      .from('birthday_projects')
      .update({
        [updateField]: true,
        total_budget: totalBudget,
        split_ratio_a: splitRatioA,
        status: bothConfirmed ? 'active' : 'budget_pending',
        budget_locked_at: bothConfirmed ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId);
    if (error) throw error;
    void userId; // referenced for audit purposes
  },

  async triggerSettlement(projectId: string, memberAId: string, memberBId: string): Promise<SettlementResult> {
    const { data: tasks, error } = await supabase
      .from('birthday_tasks')
      .select('*')
      .eq('project_id', projectId)
      .eq('status', 'verified');
    if (error) throw error;

    let spentByA = 0;
    let spentByB = 0;
    for (const t of tasks ?? []) {
      const amount = t.actual_amount ?? 0;
      if (t.paid_by === memberAId) spentByA += amount;
      else if (t.paid_by === memberBId) spentByB += amount;
    }

    const { data: project, error: pErr } = await supabase
      .from('birthday_projects')
      .select('total_budget, split_ratio_a')
      .eq('id', projectId)
      .single();
    if (pErr) throw pErr;

    const totalBudget = project.total_budget ?? spentByA + spentByB;
    const ratioA = (project.split_ratio_a ?? 50) / 100;
    const shouldPayA = totalBudget * ratioA;
    const shouldPayB = totalBudget * (1 - ratioA);

    const diffA = spentByA - shouldPayA;
    const transferAmount = Math.abs(diffA);
    const transferPayerId = diffA > 0 ? memberBId : memberAId;

    return { spentByA, spentByB, shouldPayA, shouldPayB, transferAmount, transferPayerId };
  },

  async markSettled(projectId: string, transferAmount: number, transferPayerId: string): Promise<void> {
    const { error } = await supabase
      .from('birthday_projects')
      .update({
        status: 'settled',
        transfer_amount: transferAmount,
        transfer_payer_id: transferPayerId,
        settled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId);
    if (error) throw error;
  },

  // ── Tasks ────────────────────────────────────────────────────

  async getTasks(projectId: string): Promise<BirthdayTask[]> {
    const { data, error } = await supabase
      .from('birthday_tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapTask);
  },

  async addTask(input: AddTaskData): Promise<BirthdayTask> {
    const { data, error } = await supabase
      .from('birthday_tasks')
      .insert({
        project_id: input.projectId,
        account_id: input.accountId,
        title: input.title,
        description: input.description ?? null,
        category: input.category,
        estimated_amount: input.estimatedAmount ?? null,
        is_suggested: input.isSuggested ?? false,
        template_id: input.templateId ?? null,
        created_by: input.createdBy,
        status: 'available',
      })
      .select()
      .single();
    if (error) throw error;
    return mapTask(data);
  },

  async claimTask(taskId: string, userId: string): Promise<void> {
    const { error } = await supabase.rpc('claim_birthday_task', {
      p_task_id: taskId,
      p_user_id: userId,
    });
    if (error) throw error;
  },

  async unclaimTask(taskId: string): Promise<void> {
    const { error } = await supabase
      .from('birthday_tasks')
      .update({
        status: 'available',
        claimed_by: null,
        claimed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId);
    if (error) throw error;
  },

  async markPaid(taskId: string, userId: string, actualAmount: number, receiptUrl?: string): Promise<void> {
    const { error } = await supabase
      .from('birthday_tasks')
      .update({
        status: 'paid',
        paid_by: userId,
        paid_at: new Date().toISOString(),
        actual_amount: actualAmount,
        receipt_url: receiptUrl ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId);
    if (error) throw error;
  },

  async verifyTask(taskId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('birthday_tasks')
      .update({
        status: 'verified',
        verified_by: userId,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId);
    if (error) throw error;
  },

  async cancelTask(taskId: string): Promise<void> {
    const { error } = await supabase
      .from('birthday_tasks')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId);
    if (error) throw error;
  },

  // ── Templates ────────────────────────────────────────────────

  async getTemplates(childAge: number): Promise<BirthdayTaskTemplate[]> {
    const { data, error } = await supabase
      .from('birthday_task_templates')
      .select('*')
      .lte('age_min', childAge)
      .gte('age_max', childAge)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapTemplate);
  },
};
