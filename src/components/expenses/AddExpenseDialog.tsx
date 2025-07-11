
import React, { useState } from 'react';
import { FileText, ScanLine, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ExpenseForm } from '@/components/expenses/ExpenseForm';

export const AddExpenseDialog: React.FC<{ onSubmitSuccess?: () => void }> = ({ onSubmitSuccess }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isManualForm, setIsManualForm] = useState(true);

  const handleAddExpenseClick = (isManual: boolean) => {
    setIsManualForm(isManual);
    setIsOpen(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> הוצאה חדשה
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isManualForm ? "הוספת הוצאה ידנית" : "סריקת חשבונית"}
          </DialogTitle>
          <DialogDescription>
            {isManualForm 
              ? "הזן את פרטי ההוצאה החדשה" 
              : "העלה קובץ חשבונית לסריקה אוטומטית"}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex gap-4 mb-4">
          <Button 
            variant={isManualForm ? "default" : "outline"} 
            onClick={() => setIsManualForm(true)}
            className="flex-1"
          >
            <FileText className="mr-2 h-4 w-4" /> הזנה ידנית
          </Button>
          <Button 
            variant={!isManualForm ? "default" : "outline"} 
            onClick={() => setIsManualForm(false)}
            className="flex-1"
          >
            <ScanLine className="mr-2 h-4 w-4" /> סריקת חשבונית
          </Button>
        </div>
        
        {isManualForm ? (
          <ExpenseForm onSubmitSuccess={() => {
            if (onSubmitSuccess) onSubmitSuccess();
            setIsOpen(false);
          }} />
        ) : (
          <div className="text-center py-8">
            <ScanLine className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <p>פונקציונליות סריקת חשבוניות תהיה זמינה בקרוב</p>
            <Button 
              onClick={() => setIsManualForm(true)} 
              variant="outline" 
              className="mt-4"
            >
              חזרה להזנה ידנית
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
