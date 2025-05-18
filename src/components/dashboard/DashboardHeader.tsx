
import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DashboardHeaderProps {
  userName: string | undefined;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ userName }) => {
  const navigate = useNavigate();
  
  return (
    <div className="flex flex-col md:flex-row items-start justify-between mb-6">
      <div>
        <h1 className="text-3xl font-bold">שלום, {userName || 'משתמש'}</h1>
        <p className="text-muted-foreground">ברוכים הבאים למערכת הניהול שלך</p>
      </div>
      <Button 
        onClick={() => navigate('/add-expense')}
        className="mt-4 md:mt-0"
      >
        <Plus className="mr-2 h-4 w-4" /> הוספת הוצאה
      </Button>
    </div>
  );
};
