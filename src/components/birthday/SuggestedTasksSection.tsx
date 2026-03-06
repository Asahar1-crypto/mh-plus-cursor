import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { useBirthdayTemplates } from '@/hooks/useBirthdayTasks';
import { BirthdayTask, BirthdayTaskTemplate, AddTaskData } from '@/integrations/supabase/birthdayService';

interface SuggestedTasksSectionProps {
  projectId: string;
  accountId: string;
  childAge: number | null;
  existingTasks: BirthdayTask[];
  currentUserId: string;
  onAddTask: (data: AddTaskData) => Promise<void>;
  isLoading?: boolean;
}

export const SuggestedTasksSection: React.FC<SuggestedTasksSectionProps> = ({
  projectId,
  accountId,
  childAge,
  existingTasks,
  currentUserId,
  onAddTask,
  isLoading,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const { data: templates = [] } = useBirthdayTemplates(childAge);

  const existingTemplateIds = new Set(existingTasks.map((t) => t.templateId).filter(Boolean));
  const available = templates.filter((t: BirthdayTaskTemplate) => !existingTemplateIds.has(t.id));

  if (available.length === 0) return null;

  const handleAdd = async (template: BirthdayTaskTemplate) => {
    setAddingId(template.id);
    try {
      await onAddTask({
        projectId,
        accountId,
        title: template.title,
        description: template.description ?? undefined,
        category: template.category,
        estimatedAmount: template.estimatedMin
          ? Math.round((template.estimatedMin + (template.estimatedMax ?? template.estimatedMin)) / 2)
          : null,
        isSuggested: true,
        templateId: template.id,
        createdBy: currentUserId,
      });
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/50 hover:bg-muted transition-colors text-sm font-medium"
        onClick={() => setCollapsed((v) => !v)}
      >
        <span>הצעות מוכנות ({available.length})</span>
        {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
      </button>
      {!collapsed && (
        <ul className="divide-y">
          {available.map((t: BirthdayTaskTemplate) => (
            <li key={t.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30">
              <div>
                <span className="text-sm font-medium">{t.title}</span>
                {t.isMust && <span className="mr-2 text-xs text-orange-500">חובה</span>}
                {(t.estimatedMin || t.estimatedMax) && (
                  <span className="block text-xs text-muted-foreground">
                    ₪{t.estimatedMin?.toLocaleString() ?? 0}–₪{t.estimatedMax?.toLocaleString() ?? 0}
                  </span>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                disabled={isLoading || addingId === t.id}
                onClick={() => handleAdd(t)}
              >
                <Plus className="h-3 w-3 ml-1" />
                הוסף
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
