import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Trash2, CalendarIcon, Users } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { OnboardingStepProps } from '../types';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Child {
  id?: string;
  name: string;
  birthDate: Date | undefined;
}

export const ChildrenStep: React.FC<OnboardingStepProps> = ({ onNext, onBack }) => {
  const { account, user } = useAuth();
  const [children, setChildren] = useState<Child[]>([{ name: '', birthDate: undefined }]);
  const [isLoading, setIsLoading] = useState(false);

  const addChild = () => {
    setChildren([...children, { name: '', birthDate: undefined }]);
  };

  const removeChild = (index: number) => {
    if (children.length > 1) {
      setChildren(children.filter((_, i) => i !== index));
    }
  };

  const updateChild = (index: number, field: keyof Child, value: any) => {
    const updated = [...children];
    updated[index] = { ...updated[index], [field]: value };
    setChildren(updated);
  };

  const handleNext = async () => {
    if (!account) {
      toast.error('לא נמצא חשבון פעיל');
      return;
    }

    // Validate at least one child with complete data
    const validChildren = children.filter(c => c.name.trim() && c.birthDate);
    
    if (validChildren.length === 0) {
      toast.error('יש להוסיף לפחות ילד אחד עם שם ותאריך לידה');
      return;
    }

    setIsLoading(true);
    try {
      // First, verify account membership
      const { data: membershipData, error: membershipError } = await supabase
        .from('account_members')
        .select('role')
        .eq('account_id', account.id)
        .eq('user_id', user?.id)
        .single();

      if (membershipError || !membershipData) {
        console.error('Membership check failed:', membershipError);
        toast.error('אין לך הרשאות להוסיף ילדים לחשבון זה. יש לפנות לתמיכה.');
        return;
      }

      // Insert children to database
      const childrenToInsert = validChildren.map(c => ({
        account_id: account.id,
        name: c.name.trim(),
        birth_date: format(c.birthDate!, 'yyyy-MM-dd'),
      }));

      const { error } = await supabase
        .from('children')
        .insert(childrenToInsert);

      if (error) {
        console.error('Insert error:', error);
        
        // Handle specific RLS error
        if (error.code === '42501') {
          toast.error('אין הרשאות להוסיף ילדים. אנא פנה לתמיכה.');
          return;
        }
        
        throw error;
      }

      toast.success(`נוספו ${validChildren.length} ילדים בהצלחה!`);
      onNext();
    } catch (error) {
      console.error('Error adding children:', error);
      toast.error('שגיאה בהוספת ילדים. אנא נסה שוב או פנה לתמיכה.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right duration-500">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2 animate-in zoom-in duration-500">
          <Users className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">הוספת ילדים</h2>
        <p className="text-muted-foreground">
          הוסיפו את פרטי הילדים שלכם כדי לעקוב אחר ההוצאות שלהם
        </p>
      </div>

      {/* Children List */}
      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
        {children.map((child, index) => (
          <div
            key={index}
            className="group p-4 rounded-lg border bg-card hover:border-primary/50 transition-all duration-300 animate-in slide-in-from-bottom-2"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-start gap-4">
              <div className="flex-1 space-y-4">
                {/* Name Input */}
                <div className="space-y-2">
                  <Label htmlFor={`child-name-${index}`}>שם הילד/ה</Label>
                  <Input
                    id={`child-name-${index}`}
                    placeholder="לדוגמה: יוסי"
                    value={child.name}
                    onChange={(e) => updateChild(index, 'name', e.target.value)}
                    className="transition-all duration-300 focus:scale-[1.02]"
                  />
                </div>

                {/* Birth Date Picker */}
                <div className="space-y-2">
                  <Label>תאריך לידה</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-right font-normal transition-all duration-300 hover:scale-[1.02]",
                          !child.birthDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="ml-2 h-4 w-4" />
                        {child.birthDate ? (
                          format(child.birthDate, 'PPP', { locale: he })
                        ) : (
                          <span>בחרו תאריך</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={child.birthDate}
                        onSelect={(date) => updateChild(index, 'birthDate', date)}
                        disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Remove Button */}
              {children.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeChild(index)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Child Button */}
      <Button
        type="button"
        variant="outline"
        onClick={addChild}
        className="w-full group hover:border-primary/50 transition-all duration-300 hover:scale-[1.02]"
      >
        <Plus className="w-4 h-4 ml-2 group-hover:rotate-90 transition-transform duration-300" />
        הוספת ילד/ה נוסף/ת
      </Button>

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
          onClick={() => onNext()}
          className="flex-1 transition-all duration-300 hover:scale-105"
        >
          דלג לעכשיו
        </Button>
        <Button
          onClick={handleNext}
          disabled={isLoading}
          className="flex-1 bg-gradient-to-r from-primary to-primary/80 transition-all duration-300 hover:scale-105"
        >
          {isLoading ? 'שומר...' : 'המשך'}
        </Button>
      </div>
    </div>
  );
};
