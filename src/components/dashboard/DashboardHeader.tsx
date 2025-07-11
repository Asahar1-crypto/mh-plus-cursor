
import React from 'react';
import { AddExpenseDialog } from '@/components/expenses/AddExpenseDialog';
import { Logo } from '@/components/ui/Logo';
import { Card } from '@/components/ui/card';
import { Sparkles, TrendingUp, Plus } from 'lucide-react';

interface DashboardHeaderProps {
  userName: string | undefined;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ userName }) => {
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'בוקר טוב' : currentHour < 18 ? 'צהריים טובים' : 'ערב טוב';

  return (
    <Card className="glass shadow-card border-0 overflow-hidden relative mb-6">
      <div className="absolute inset-0 gradient-primary opacity-5"></div>
      <div className="relative p-6">
        <div className="flex flex-col md:flex-row items-start justify-between gap-6">
          <div className="flex items-center gap-6">
            <Logo size="lg" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-3xl font-bold text-foreground">
                  {greeting}, {userName || 'משתמש'}!
                </h2>
                <Sparkles className="h-6 w-6 text-primary animate-pulse-slow" />
              </div>
              <p className="text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                בואו נראה איך התקציב שלכם מתנהל היום
              </p>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="hidden md:flex flex-col items-end space-y-1">
              <div className="text-sm text-muted-foreground">
                {new Date().toLocaleDateString('he-IL', { 
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-primary rounded-lg blur opacity-30"></div>
              <div className="relative">
                <AddExpenseDialog />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
