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
  
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'בוקר טוב' : currentHour < 18 ? 'צהריים טובים' : 'ערב טוב';

  const handleAddExpense = () => {
    navigate('/expenses', { state: { openModal: true } });
  };

  return (
    <Card className="bg-card/95 backdrop-blur-sm border shadow-sm mb-6">
      <div className="p-6">
        <div className="flex flex-col md:flex-row items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                {greeting}, {userName || 'משתמש'}!
              </h2>
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <p className="text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              בואו נראה איך התקציב שלכם מתנהל היום
            </p>
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
            <div className="flex-1 sm:flex-none">
              <Button onClick={handleAddExpense}>
                <Plus className="mr-2 h-4 w-4" />
                הוצאה חדשה
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};