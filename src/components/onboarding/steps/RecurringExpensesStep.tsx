import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Repeat } from 'lucide-react';
import { OnboardingStepProps } from '../types';
import { useExpense } from '@/contexts/expense';
import { useNavigate } from 'react-router-dom';

export const RecurringExpensesStep: React.FC<OnboardingStepProps> = ({ onNext, onBack, onSkip }) => {
  const navigate = useNavigate();

  const handleAddExpense = () => {
    // Navigate to expenses page where user can add recurring expenses
    navigate('/expenses');
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right duration-500">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2 animate-in zoom-in duration-500">
          <Repeat className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">הוצאות קבועות</h2>
        <p className="text-muted-foreground">
          הוסיפו הוצאות שחוזרות על עצמן מידי חודש
        </p>
      </div>

      {/* Info Cards */}
      <div className="space-y-3 animate-in slide-in-from-bottom duration-500 delay-100">
        {[
          {
            title: '💰 הוצאות אוטומטיות',
            description: 'המערכת תיצר אוטומטית את ההוצאות מדי חודש',
          },
          {
            title: '⏰ חסכון זמן',
            description: 'לא צריך להזין מידי חודש את אותן ההוצאות',
          },
          {
            title: '📊 מעקב מדויק',
            description: 'עקבו בקלות אחרי ההוצאות החודשיות הקבועות',
          },
        ].map((item, index) => (
          <div
            key={index}
            className="p-4 rounded-lg bg-card border hover:border-primary/50 transition-all duration-300 hover:scale-[1.02]"
            style={{ animationDelay: `${(index + 1) * 100}ms` }}
          >
            <h3 className="font-semibold mb-1">{item.title}</h3>
            <p className="text-sm text-muted-foreground">{item.description}</p>
          </div>
        ))}
      </div>

      {/* Examples */}
      <div className="p-4 rounded-lg bg-muted/50 space-y-2 animate-in fade-in duration-500 delay-300">
        <p className="text-sm font-semibold">דוגמאות להוצאות קבועות:</p>
        <div className="flex flex-wrap gap-2">
          {['ארנונה', 'חשמל', 'גז', 'מים', 'אינטרנט', 'ביטוח', 'משכנתא'].map((example, index) => (
            <span
              key={index}
              className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm"
              style={{ animationDelay: `${(index + 4) * 50}ms` }}
            >
              {example}
            </span>
          ))}
        </div>
      </div>

      {/* Info Note */}
      <div className="p-4 rounded-lg bg-muted/50 space-y-2 animate-in fade-in duration-500 delay-400">
        <p className="text-sm text-muted-foreground">
          💡 <span className="font-semibold">טיפ:</span> תוכלו להוסיף הוצאות קבועות בכל עת מעמוד ההוצאות
        </p>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 pt-4">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex-1 transition-all duration-300 hover:scale-105"
        >
          חזור
        </Button>
        <Button
          variant="outline"
          onClick={onSkip}
          className="flex-1 transition-all duration-300 hover:scale-105"
        >
          דלג לעכשיו
        </Button>
        <Button
          onClick={onNext}
          className="flex-1 bg-gradient-to-r from-primary to-primary/80 transition-all duration-300 hover:scale-105"
        >
          המשך
        </Button>
      </div>
    </div>
  );
};
