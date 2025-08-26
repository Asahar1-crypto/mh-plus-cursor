
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExpenseCard } from './ExpenseCard';
import { Clock, CheckCircle, CreditCard, FileText } from 'lucide-react';

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
    <div className="bg-gradient-to-br from-card/90 to-card/95 backdrop-blur-lg border border-border/50 shadow-xl hover:shadow-2xl rounded-xl p-4 sm:p-6 transition-all duration-500 group overflow-hidden animate-fade-in">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/10 opacity-60 group-hover:opacity-90 transition-opacity duration-500"></div>
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-accent/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
      
      <Tabs defaultValue="pending" className="w-full relative z-10" dir="rtl">
        <TabsList className="w-full mb-6 grid grid-cols-3 h-auto bg-gradient-to-r from-background/80 to-background/60 backdrop-blur-sm border border-border/50 rounded-xl p-1">
          <TabsTrigger 
            value="pending" 
            className="flex-1 text-sm px-4 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500/20 data-[state=active]:to-orange-500/20 data-[state=active]:text-amber-700 dark:data-[state=active]:text-amber-300 data-[state=active]:border data-[state=active]:border-amber-200 dark:data-[state=active]:border-amber-800 rounded-lg transition-all duration-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 font-semibold"
          >
            <div className="flex items-center gap-2 justify-center">
              <Clock className="h-4 w-4 animate-pulse" />
              ממתינות ({pendingExpenses.length})
            </div>
          </TabsTrigger>
          <TabsTrigger 
            value="approved" 
            className="flex-1 text-sm px-4 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500/20 data-[state=active]:to-emerald-500/20 data-[state=active]:text-green-700 dark:data-[state=active]:text-green-300 data-[state=active]:border data-[state=active]:border-green-200 dark:data-[state=active]:border-green-800 rounded-lg transition-all duration-300 hover:bg-green-50 dark:hover:bg-green-950/30 font-semibold"
          >
            <div className="flex items-center gap-2 justify-center">
              <CheckCircle className="h-4 w-4 animate-pulse" />
              מאושרות ({approvedExpenses.length})
            </div>
          </TabsTrigger>
          <TabsTrigger 
            value="paid" 
            className="flex-1 text-sm px-4 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500/20 data-[state=active]:to-cyan-500/20 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-300 data-[state=active]:border data-[state=active]:border-blue-200 dark:data-[state=active]:border-blue-800 rounded-lg transition-all duration-300 hover:bg-blue-50 dark:hover:bg-blue-950/30 font-semibold"
          >
            <div className="flex items-center gap-2 justify-center">
              <CreditCard className="h-4 w-4 animate-pulse" />
              שולמו ({paidExpenses.length})
            </div>
          </TabsTrigger>
        </TabsList>
      
        <TabsContent value="pending" className="mt-6 space-y-4" dir="rtl">
          {pendingExpenses.length > 0 ? (
            <div className="space-y-4">
              {pendingExpenses.map((expense, index) => (
                <div 
                  key={expense.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <ExpenseCard 
                    expense={expense} 
                    onApprove={() => onApprove(expense.id)}
                    onReject={() => onReject(expense.id)}
                    onMarkPaid={() => {}}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 animate-fade-in">
              <div className="p-8 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-xl border border-amber-200 dark:border-amber-800">
                <Clock className="h-12 w-12 text-amber-500 mx-auto mb-4 animate-pulse" />
                <div className="text-amber-700 dark:text-amber-300 font-semibold text-lg mb-2">
                  אין הוצאות ממתינות לאישור
                </div>
                <div className="text-amber-600 dark:text-amber-400 text-sm">
                  כל ההוצאות אושרו או ששולמו
                </div>
              </div>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="approved" className="mt-6 space-y-4" dir="rtl">
          {approvedExpenses.length > 0 ? (
            <div className="space-y-4">
              {approvedExpenses.map((expense, index) => (
                <div 
                  key={expense.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <ExpenseCard 
                    expense={expense}
                    onApprove={() => {}} 
                    onReject={() => {}}
                    onMarkPaid={() => onMarkPaid(expense.id)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 animate-fade-in">
              <div className="p-8 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl border border-green-200 dark:border-green-800">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4 animate-bounce" />
                <div className="text-green-700 dark:text-green-300 font-semibold text-lg mb-2">
                  אין הוצאות מאושרות
                </div>
                <div className="text-green-600 dark:text-green-400 text-sm">
                  כל ההוצאות המאושרות כבר שולמו
                </div>
              </div>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="paid" className="mt-6 space-y-4" dir="rtl">
          {paidExpenses.length > 0 ? (
            <div className="space-y-4">
              {paidExpenses.map((expense, index) => (
                <div 
                  key={expense.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <ExpenseCard 
                    expense={expense}
                    onApprove={() => {}} 
                    onReject={() => {}} 
                    onMarkPaid={() => {}}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 animate-fade-in">
              <div className="p-8 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 rounded-xl border border-blue-200 dark:border-blue-800">
                <CreditCard className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-ping" />
                <div className="text-blue-700 dark:text-blue-300 font-semibold text-lg mb-2">
                  אין הוצאות ששולמו
                </div>
                <div className="text-blue-600 dark:text-blue-400 text-sm">
                  עדיין לא שולמו הוצאות החודש
                </div>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
