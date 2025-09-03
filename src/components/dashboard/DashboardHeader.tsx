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
    <Card className="bg-gradient-to-br from-card/90 to-card/95 backdrop-blur-lg border border-border/50 shadow-xl hover:shadow-2xl transition-all duration-500 group overflow-hidden mb-6">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl opacity-50 group-hover:opacity-75 transition-opacity duration-500"></div>
      
      <div className="p-6 sm:p-8 relative">
        <div className="flex flex-col md:flex-row items-start justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent hover:scale-105 transition-transform duration-300">
                {greeting}, {userName || 'משתמש'}!
              </h2>
              <Sparkles className="h-6 w-6 text-primary animate-pulse hover:animate-spin transition-all duration-300" />
            </div>
            <p className="text-muted-foreground flex items-center gap-2 text-base hover:text-foreground transition-colors duration-300">
              <TrendingUp className="h-5 w-5 text-primary animate-pulse" />
              בואו נראה איך התקציב שלכם מתנהל היום
            </p>
          </div>
          
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="hidden md:flex flex-col items-end space-y-1 p-3 rounded-lg bg-background/50 backdrop-blur-sm border border-border/30">
              <div className="text-sm font-medium text-muted-foreground">
                {new Date().toLocaleDateString('he-IL', { 
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>
            <div className="w-full sm:w-auto">
              <Button 
                onClick={handleAddExpense}
                className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group"
                size="lg"
              >
                <Plus className="mr-2 h-5 w-5 group-hover:rotate-90 transition-transform duration-300" />
                הוצאה חדשה
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};