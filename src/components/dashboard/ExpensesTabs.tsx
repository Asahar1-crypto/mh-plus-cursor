
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExpenseCard } from './ExpenseCard';

interface ExpensesTabsProps {
  pendingExpenses: any[];
  approvedExpenses: any[];
  paidExpenses: any[];
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  onMarkPaid: (id: string) => Promise<void>;
}

export const ExpensesTabs: React.FC<ExpensesTabsProps> = ({
  pendingExpenses,
  approvedExpenses,
  paidExpenses,
  onApprove,
  onReject,
  onMarkPaid
}) => {
  return (
    <Tabs defaultValue="pending" className="w-full">
      <TabsList className="w-full mb-4">
        <TabsTrigger value="pending" className="flex-1">ממתינות ({pendingExpenses.length})</TabsTrigger>
        <TabsTrigger value="approved" className="flex-1">מאושרות ({approvedExpenses.length})</TabsTrigger>
        <TabsTrigger value="paid" className="flex-1">שולמו ({paidExpenses.length})</TabsTrigger>
      </TabsList>
      
      <TabsContent value="pending">
        {pendingExpenses.length > 0 ? (
          pendingExpenses.map((expense) => (
            <ExpenseCard 
              key={expense.id} 
              expense={expense} 
              onApprove={() => onApprove(expense.id)}
              onReject={() => onReject(expense.id)}
              onMarkPaid={() => {}}
            />
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            אין הוצאות ממתינות לאישור
          </div>
        )}
      </TabsContent>
      
      <TabsContent value="approved">
        {approvedExpenses.length > 0 ? (
          approvedExpenses.map((expense) => (
            <ExpenseCard 
              key={expense.id} 
              expense={expense}
              onApprove={() => {}} 
              onReject={() => {}}
              onMarkPaid={() => onMarkPaid(expense.id)}
            />
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            אין הוצאות מאושרות
          </div>
        )}
      </TabsContent>
      
      <TabsContent value="paid">
        {paidExpenses.length > 0 ? (
          paidExpenses.map((expense) => (
            <ExpenseCard 
              key={expense.id} 
              expense={expense}
              onApprove={() => {}} 
              onReject={() => {}} 
              onMarkPaid={() => {}}
            />
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            אין הוצאות ששולמו
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
};
