
import React, { useState } from 'react';
import { FileText, ScanLine, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ExpenseForm } from '@/components/expenses/ExpenseForm';
import { ReceiptUpload } from '@/components/expenses/ReceiptUpload';
import { ReceiptValidation } from '@/components/expenses/ReceiptValidation';

export const AddExpenseDialog: React.FC<{ onSubmitSuccess?: () => void }> = ({ onSubmitSuccess }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isManualForm, setIsManualForm] = useState(true);
  const [scanResult, setScanResult] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState<'select' | 'upload' | 'validate'>('select');
  const [preventClose, setPreventClose] = useState(false);

  const handleScanComplete = (result: any) => {
    setScanResult(result);
    setCurrentStep('validate');
  };

  const handleScanApprove = () => {
    handleCancel();
    if (onSubmitSuccess) onSubmitSuccess();
  };

  const handleCancel = () => {
    setIsOpen(false);
    setCurrentStep('select');
    setScanResult(null);
    setIsManualForm(true);
    setPreventClose(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button onClick={() => {
          setCurrentStep('select');
          setIsManualForm(true);
          setIsOpen(true);
          setPreventClose(false);
        }}>
          <PlusCircle className="mr-2 h-4 w-4" /> הוצאה חדשה
        </Button>
      </DialogTrigger>
      <DialogContent 
        className="w-[95vw] max-w-[800px] max-h-[90vh] overflow-y-auto z-[9999]"
        onPointerDownOutside={(e) => {
          if (currentStep === 'upload' || currentStep === 'validate') {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          if (currentStep === 'upload' || currentStep === 'validate') {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {currentStep === 'select' ? "הוספת הוצאה" 
             : currentStep === 'upload' ? "סריקת חשבונית"
             : "אימות פרטי החשבונית"}
          </DialogTitle>
          <DialogDescription>
            {currentStep === 'select' ? "בחר את הדרך להוספת ההוצאה"
             : currentStep === 'upload' ? "העלה קובץ חשבונית לסריקה אוטומטית"
             : "בדוק ואשר את הפריטים שזוהו"}
          </DialogDescription>
        </DialogHeader>
        
        {currentStep === 'select' && (
          <>
            <div className="flex gap-4 mb-4">
              <Button 
                variant="default"
                onClick={() => {
                  setIsManualForm(true);
                  setCurrentStep('select');
                  setPreventClose(false);
                }}
                className="flex-1"
              >
                <FileText className="mr-2 h-4 w-4" /> הזנה ידנית
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  setIsManualForm(false);
                  setCurrentStep('upload');
                  setPreventClose(true);
                }}
                className="flex-1"
              >
                <ScanLine className="mr-2 h-4 w-4" /> סריקת חשבונית
              </Button>
            </div>

            {isManualForm && (
              <ExpenseForm onSubmitSuccess={() => {
                if (onSubmitSuccess) onSubmitSuccess();
                handleCancel();
              }} />
            )}
          </>
        )}

        {currentStep === 'upload' && (
          <ReceiptUpload 
            onScanComplete={handleScanComplete}
            onCancel={handleCancel}
          />
        )}

        {currentStep === 'validate' && scanResult && (
          <ReceiptValidation
            scanResult={scanResult}
            onApprove={handleScanApprove}
            onCancel={handleCancel}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
