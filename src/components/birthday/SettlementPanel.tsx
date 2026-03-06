import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ArrowLeft } from 'lucide-react';
import { BirthdayTask, BirthdayProject } from '@/integrations/supabase/birthdayService';
import { birthdayService, SettlementResult } from '@/integrations/supabase/birthdayService';

interface SettlementPanelProps {
  project: BirthdayProject;
  tasks: BirthdayTask[];
  memberAId: string;
  memberAName: string;
  memberBId: string;
  memberBName: string;
  onMarkSettled: (args: { projectId: string; transferAmount: number; transferPayerId: string }) => Promise<void>;
  isLoading?: boolean;
}

export const SettlementPanel: React.FC<SettlementPanelProps> = ({
  project,
  tasks,
  memberAId,
  memberAName,
  memberBId,
  memberBName,
  onMarkSettled,
  isLoading,
}) => {
  const [settlement, setSettlement] = useState<SettlementResult | null>(null);
  const [calculating, setCalculating] = useState(false);

  const verifiedTasks = tasks.filter((t) => t.status === 'verified');

  const nameById = (id: string | null) => {
    if (id === memberAId) return memberAName;
    if (id === memberBId) return memberBName;
    return 'לא ידוע';
  };

  const calculate = async () => {
    setCalculating(true);
    try {
      const result = await birthdayService.triggerSettlement(project.id, memberAId, memberBId);
      setSettlement(result);
    } finally {
      setCalculating(false);
    }
  };

  const handleSettle = async () => {
    if (!settlement) return;
    await onMarkSettled({
      projectId: project.id,
      transferAmount: settlement.transferAmount,
      transferPayerId: settlement.transferPayerId ?? memberAId,
    });
  };

  if (project.status === 'settled' || project.status === 'archived') {
    return (
      <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-5 w-5" />
            פרויקט סוגר!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {project.transferAmount != null && (
            <p>
              {nameById(project.transferPayerId)} העביר/ה{' '}
              <strong>₪{project.transferAmount.toLocaleString()}</strong>{' '}
              ל{nameById(project.transferPayerId === memberAId ? memberBId : memberAId)}
            </p>
          )}
          {project.settledAt && (
            <p className="text-muted-foreground">
              תאריך סגירה: {new Date(project.settledAt).toLocaleDateString('he-IL')}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>סיכום תשלומים</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-right py-2 font-medium">משימה</th>
                  <th className="text-right py-2 font-medium">שילם/ה</th>
                  <th className="text-right py-2 font-medium">סכום</th>
                </tr>
              </thead>
              <tbody>
                {verifiedTasks.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center text-muted-foreground py-4">
                      אין עדיין משימות מאומתות
                    </td>
                  </tr>
                ) : (
                  verifiedTasks.map((t) => (
                    <tr key={t.id} className="border-b last:border-0">
                      <td className="py-2">{t.title}</td>
                      <td className="py-2">{nameById(t.paidBy)}</td>
                      <td className="py-2">₪{(t.actualAmount ?? 0).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {settlement ? (
        <Card>
          <CardHeader>
            <CardTitle>חישוב קיזוז</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground">{memberAName} שילם/ה</p>
                <p className="text-lg font-bold">₪{settlement.spentByA.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">צריך לשלם: ₪{settlement.shouldPayA.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{memberBName} שילם/ה</p>
                <p className="text-lg font-bold">₪{settlement.spentByB.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">צריך לשלם: ₪{settlement.shouldPayB.toLocaleString()}</p>
              </div>
            </div>
            <div className="border-t pt-3 flex items-center gap-2 font-medium">
              <span>{nameById(settlement.transferPayerId)}</span>
              <ArrowLeft className="h-4 w-4" />
              <span>מעביר ₪{settlement.transferAmount.toLocaleString()}</span>
              <span className="text-muted-foreground">ל{nameById(
                settlement.transferPayerId === memberAId ? memberBId : memberAId
              )}</span>
            </div>
            <Button
              onClick={handleSettle}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'מסגר...' : 'סיים וקזז'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Button
          variant="outline"
          onClick={calculate}
          disabled={calculating || verifiedTasks.length === 0}
          className="w-full"
        >
          {calculating ? 'מחשב...' : 'חשב קיזוז'}
        </Button>
      )}
    </div>
  );
};
