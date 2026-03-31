import React from 'react';
import { useExpense } from '@/contexts/ExpenseContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, TrendingUp, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DashboardHeaderProps {
  userName: string | undefined;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ userName }) => {
  const { refreshData } = useExpense();
  const navigate = useNavigate();
  
  const greeting = "היי 👋";

  const handleAddExpense = () => {
    navigate('/expenses', { state: { openModal: true } });
  };

  return (
    <Card className="bg-card border border-border/50 shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden mb-4 sm:mb-6">
      <div className="p-4 sm:p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-start justify-between gap-4 sm:gap-6">
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                {greeting}, {userName || 'משתמש'}!
              </h2>
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <p className="text-muted-foreground flex items-center gap-2 text-sm sm:text-base">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              בואו נראה איך התקציב שלכם מתנהל היום
            </p>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-3 sm:gap-4 w-full md:w-auto">
            <div className="hidden md:flex flex-col items-end space-y-1 p-3 rounded-lg bg-muted/30 border border-border/30">
              <div className="text-sm font-medium text-muted-foreground">
                {new Date().toLocaleDateString('he-IL', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>
            <Button
              onClick={handleAddExpense}
              className="w-full md:w-auto shadow-md hover:shadow-lg transition-shadow duration-300 h-11 sm:h-12"
              size="lg"
            >
              <Plus className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              הוצאה חדשה
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};