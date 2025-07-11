import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FileText, ScanLine, PlusCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExpenseForm } from '@/components/expenses/ExpenseForm';
import { ReceiptUpload } from '@/components/expenses/ReceiptUpload';
import { ReceiptValidation } from '@/components/expenses/ReceiptValidation';

interface AddExpenseModalProps {
  onSubmitSuccess?: () => void;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({ onSubmitSuccess }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isManualForm, setIsManualForm] = useState(true);
  const [scanResult, setScanResult] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState<'select' | 'upload' | 'validate'>('select');

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
  };

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && currentStep === 'select') {
        handleCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, currentStep]);

  if (!isOpen) {
    return (
      <Button onClick={() => {
        setCurrentStep('select');
        setIsManualForm(true);
        setIsOpen(true);
      }}>
        <PlusCircle className="mr-2 h-4 w-4" /> הוצאה חדשה
      </Button>
    );
  }

  return createPortal(
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-[60]"
        onClick={(e) => {
          if (currentStep === 'select') {
            handleCancel();
          }
        }}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div 
          className="bg-background border rounded-lg shadow-lg w-[95vw] max-w-[800px] max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h2 className="text-lg font-semibold">
                {currentStep === 'select' ? "הוספת הוצאה" 
                 : currentStep === 'upload' ? "סריקת חשבונית"
                 : "אימות פרטי החשבונית"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {currentStep === 'select' ? "בחר את הדרך להוספת ההוצאה"
                 : currentStep === 'upload' ? "העלה קובץ חשבונית לסריקה אוטומטית"
                 : "בדוק ואשר את הפריטים שזוהו"}
              </p>
            </div>
            {currentStep === 'select' && (
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Content */}
          <div className="p-6">
            {currentStep === 'select' && (
              <>
                <div className="flex gap-4 mb-4">
                  <Button 
                    variant="default"
                    onClick={() => {
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
                      setIsManualForm(false);
                      setCurrentStep('upload');
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
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};