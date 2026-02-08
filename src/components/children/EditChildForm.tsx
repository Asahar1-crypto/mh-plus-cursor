import React, { useState } from 'react';
import { format } from 'date-fns';
import { Calendar, User } from 'lucide-react';
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useExpense } from '@/contexts/expense';
import { Child, ChildGender } from '@/contexts/expense/types';
import { useToast } from '@/hooks/use-toast';

interface EditChildFormProps {
  child: Child;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const EditChildForm: React.FC<EditChildFormProps> = ({ child, open, setOpen }) => {
  const { updateChild } = useExpense();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: child.name,
    birthDate: child.birthDate,
    gender: (child.gender || 'son') as ChildGender,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "שגיאה",
        description: "שם הילד חובה",
        variant: "destructive",
      });
      return;
    }

    if (!formData.birthDate) {
      toast({
        title: "שגיאה", 
        description: "תאריך לידה חובה",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await updateChild(child.id, {
        name: formData.name.trim(),
        birthDate: formData.birthDate,
        gender: formData.gender,
      });
      
      toast({
        title: "הצלחה!",
        description: "פרטי הילד עודכנו בהצלחה",
      });
      
      setOpen(false);
    } catch (error) {
      console.error('Error updating child:', error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בעדכון פרטי הילד",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          עריכת פרטי ילד
        </DialogTitle>
      </DialogHeader>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">שם הילד</Label>
          <Input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="הכנס שם הילד"
            required
          />
        </div>

        {/* Gender selector */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">בן / בת</Label>
          <div className="grid grid-cols-2 gap-3">
            {([
              { value: 'son' as ChildGender, label: 'בן', image: '/avatars/roles/son.png' },
              { value: 'daughter' as ChildGender, label: 'בת', image: '/avatars/roles/daughter.png' },
            ]).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, gender: option.value }))}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200 text-sm font-medium ${
                  formData.gender === option.value
                    ? 'border-primary bg-primary/10 text-primary shadow-sm'
                    : 'border-border/50 bg-background/50 hover:border-primary/40 hover:bg-primary/5 text-muted-foreground'
                }`}
              >
                <img src={option.image} alt={option.label} className="w-12 h-12 sm:w-14 sm:h-14 object-contain rounded-full" />
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="birthDate">תאריך לידה</Label>
          <Input
            id="birthDate"
            type="date"
            value={formData.birthDate}
            onChange={(e) => handleInputChange('birthDate', e.target.value)}
            required
          />
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSubmitting}
          >
            ביטול
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                שומר...
              </span>
            ) : (
              'שמור שינויים'
            )}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
};

export default EditChildForm;