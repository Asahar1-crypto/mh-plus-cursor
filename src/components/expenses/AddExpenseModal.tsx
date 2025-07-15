
import React, { useState, useEffect } from 'react';
import { FileText, ScanLine, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ExpenseForm } from '@/components/expenses/ExpenseForm';
import { ReceiptUpload } from '@/components/expenses/ReceiptUpload';
import { ReceiptValidation } from '@/components/expenses/ReceiptValidation';

export const AddExpenseModal: React.FC<{ onSubmitSuccess?: () => void }> = ({ onSubmitSuccess }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isManualForm, setIsManualForm] = useState(true);
  const [scanResult, setScanResult] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState<'select' | 'upload' | 'validate'>('select');

  const handleScanComplete = (result: any) => {
    console.log('🔍 AddExpenseModal: Scan completed, result:', result);
    setScanResult(result);
    setCurrentStep('validate');
  };

  const handleScanApprove = () => {
    console.log('✅ AddExpenseModal: Scan approved, calling onSubmitSuccess');
    handleCancel();
    if (onSubmitSuccess) onSubmitSuccess();
  };

  const handleCancel = () => {
    console.log('❌ AddExpenseModal: Handling cancel');
    setIsOpen(false);
    setCurrentStep('select');
    setScanResult(null);
    setIsManualForm(true);
  };

  const shouldPreventClose = currentStep === 'upload' || currentStep === 'validate';

  // Prevent body scroll when dialog is open and manage escape key
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Prevent navigation during critical steps
  useEffect(() => {
    if (shouldPreventClose) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '';
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        // Prevent common navigation shortcuts
        if (e.key === 'Escape' || 
            (e.ctrlKey && e.key === 'w') || 
            (e.altKey && e.key === 'F4') ||
            (e.key === 'F5') ||
            (e.ctrlKey && e.key === 'r')) {
          e.preventDefault();
          e.stopPropagation();
        }
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      document.addEventListener('keydown', handleKeyDown, { capture: true });

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        document.removeEventListener('keydown', handleKeyDown, { capture: true });
      };
    }
  }, [shouldPreventClose]);

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        console.log('🔄 AddExpenseModal: Dialog onOpenChange called, open:', open, 'currentStep:', currentStep, 'shouldPreventClose:', shouldPreventClose);
        // Only allow closing if we're not in a step that should prevent close
        if (!open && shouldPreventClose) {
          console.log('🚫 AddExpenseModal: Preventing dialog close during critical step:', currentStep);
          return;
        }
        setIsOpen(open);
        if (!open) {
          // Reset state when dialog closes
          console.log('🔄 AddExpenseModal: Resetting state after dialog close');
          setCurrentStep('select');
          setScanResult(null);
          setIsManualForm(true);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button onClick={() => {
          console.log('🖱️ AddExpenseModal: Open button clicked');
          setCurrentStep('select');
          setIsManualForm(true);
          setIsOpen(true);
        }}>
          <PlusCircle className="mr-2 h-4 w-4" /> הוצאה חדשה
        </Button>
      </DialogTrigger>
      <DialogContent 
        className="w-[95vw] max-w-[900px] h-[90vh] max-h-[90vh] z-[9999] flex flex-col p-0"
        onPointerDownOutside={(e) => {
          if (shouldPreventClose) {
            console.log('Preventing dialog close via pointer down outside:', currentStep);
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          if (shouldPreventClose) {
            console.log('Preventing dialog close via escape key:', currentStep);
            e.preventDefault();
          }
        }}
        onInteractOutside={(e) => {
          if (shouldPreventClose) {
            console.log('Preventing dialog close via interaction outside:', currentStep);
            e.preventDefault();
          }
        }}
      >
        <DialogHeader className="flex-shrink-0 px-6 py-4 border-b">
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
        
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full px-6 py-4">
            {currentStep === 'select' && (
              <div className="space-y-6">
                <div className="flex gap-4">
                  <Button 
                    variant="default"
                    onClick={() => {
                      console.log('📝 AddExpenseModal: Manual form button clicked');
                      setIsManualForm(true);
                      setCurrentStep('select');
                    }}
                    className="flex-1"
                  >
                    <FileText className="mr-2 h-4 w-4" /> הזנה ידנית
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      console.log('📸 AddExpenseModal: Scan receipt button clicked');
                      setIsManualForm(false);
                      setCurrentStep('upload');
                    }}
                    className="flex-1"
                  >
                    <ScanLine className="mr-2 h-4 w-4" /> סריקת חשבונית
                  </Button>
                </div>

                {isManualForm && (
                  <div className="pb-4">
                    <ExpenseForm 
                      onSubmitSuccess={() => {
                        console.log('✅ AddExpenseModal: Manual form submitted successfully');
                        if (onSubmitSuccess) onSubmitSuccess();
                        handleCancel();
                      }}
                      onCancel={() => {
                        console.log('❌ AddExpenseModal: Manual form cancelled');
                        handleCancel();
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {currentStep === 'upload' && (
              <div className="pb-4">
                <ReceiptUpload 
                  onScanComplete={(result) => {
                    console.log('📸 AddExpenseModal: Receipt uploaded, calling handleScanComplete');
                    handleScanComplete(result);
                  }}
                  onCancel={() => {
                    console.log('❌ AddExpenseModal: Receipt upload cancelled');
                    handleCancel();
                  }}
                />
              </div>
            )}

            {currentStep === 'validate' && scanResult && (
              <div className="pb-4">
                <ReceiptValidation
                  scanResult={scanResult}
                  onApprove={() => {
                    console.log('✅ AddExpenseModal: Receipt validation approved');
                    handleScanApprove();
                  }}
                  onCancel={() => {
                    console.log('❌ AddExpenseModal: Receipt validation cancelled');
                    handleCancel();
                  }}
                />
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
