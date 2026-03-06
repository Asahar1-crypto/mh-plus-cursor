import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, Lock } from 'lucide-react';
import { BirthdayProject } from '@/integrations/supabase/birthdayService';

interface BudgetFramePanelProps {
  project: BirthdayProject;
  currentUserId: string;
  memberAId: string;
  memberAName: string;
  memberBName: string;
  onConfirm: (totalBudget: number, splitRatioA: number, isUserA: boolean) => Promise<void>;
  isLoading?: boolean;
}

export const BudgetFramePanel: React.FC<BudgetFramePanelProps> = ({
  project,
  currentUserId,
  memberAId,
  memberAName,
  memberBName,
  onConfirm,
  isLoading,
}) => {
  const isUserA = currentUserId === memberAId;
  const alreadyConfirmed = isUserA ? project.budgetConfirmedA : project.budgetConfirmedB;

  const [totalBudget, setTotalBudget] = useState(project.totalBudget?.toString() ?? '');
  const [splitA, setSplitA] = useState(project.splitRatioA?.toString() ?? '50');

  const splitB = Math.max(0, 100 - parseFloat(splitA || '0'));
  const isLocked = project.budgetConfirmedA && project.budgetConfirmedB;

  const handleConfirm = async () => {
    const budget = parseFloat(totalBudget);
    const ratio = parseFloat(splitA);
    if (isNaN(budget) || budget <= 0) return;
    if (isNaN(ratio) || ratio < 0 || ratio > 100) return;
    await onConfirm(budget, ratio, isUserA);
  };

  if (isLocked) {
    return (
      <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <Lock className="h-5 w-5" />
            תקציב נעול
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>סה"כ תקציב: <strong>₪{(project.totalBudget ?? 0).toLocaleString()}</strong></p>
          <p>{memberAName}: <strong>{project.splitRatioA}%</strong> &nbsp;|&nbsp; {memberBName}: <strong>{(100 - project.splitRatioA).toFixed(0)}%</strong></p>
          <p className="text-muted-foreground">שני ההורים אישרו – פרויקט פעיל</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>קביעת תקציב</CardTitle>
        <p className="text-sm text-muted-foreground">
          שני ההורים צריכים לאשר את התקציב לפני שהפרויקט יפתח
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Confirmation status */}
        <div className="flex gap-4">
          <div className={`flex items-center gap-1 text-sm ${project.budgetConfirmedA ? 'text-green-600' : 'text-muted-foreground'}`}>
            <CheckCircle2 className="h-4 w-4" />
            {memberAName}
          </div>
          <div className={`flex items-center gap-1 text-sm ${project.budgetConfirmedB ? 'text-green-600' : 'text-muted-foreground'}`}>
            <CheckCircle2 className="h-4 w-4" />
            {memberBName}
          </div>
        </div>

        {alreadyConfirmed ? (
          <p className="text-sm text-green-600 font-medium">אישרת את התקציב – ממתין לאישור השני</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="budget">סה"כ תקציב (₪)</Label>
              <Input
                id="budget"
                type="number"
                min={0}
                value={totalBudget}
                onChange={(e) => setTotalBudget(e.target.value)}
                placeholder="לדוגמה: 3000"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="splitA">{memberAName} (%)</Label>
                <Input
                  id="splitA"
                  type="number"
                  min={0}
                  max={100}
                  value={splitA}
                  onChange={(e) => setSplitA(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>{memberBName} (%)</Label>
                <Input value={splitB.toFixed(0)} readOnly className="bg-muted" />
              </div>
            </div>
            <Button
              onClick={handleConfirm}
              disabled={isLoading || !totalBudget}
              className="w-full"
            >
              {isLoading ? 'שומר...' : 'אשר תקציב'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
