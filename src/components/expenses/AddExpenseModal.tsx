import React, { useEffect, useState } from 'react';
import { FileText, ScanLine, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ExpenseForm } from '@/components/expenses/ExpenseForm';
import { ReceiptUpload } from '@/components/expenses/ReceiptUpload';
import { ReceiptValidation } from '@/components/expenses/ReceiptValidation';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAddExpenseModal } from '@/hooks/useAddExpenseModal';
import { useDialogBackClose } from '@/hooks/useDialogBackClose';

type Step = 'select' | 'upload' | 'validate';

const titleFor = (step: Step) =>
  step === 'select' ? 'הוספת הוצאה' : step === 'upload' ? 'סריקת חשבונית' : 'אימות פרטי החשבונית';

const descriptionFor = (step: Step) =>
  step === 'select'
    ? 'בחר את הדרך להוספת ההוצאה'
    : step === 'upload'
      ? 'העלה קובץ חשבונית לסריקה אוטומטית'
      : 'בדוק ואשר את הפריטים שזוהו';

export const AddExpenseModal: React.FC = () => {
  const isMobile = useIsMobile();
  const { isOpen, initialMode, closeModal, onSubmitSuccess } = useAddExpenseModal();

  const [isManualForm, setIsManualForm] = useState(true);
  const [scanResult, setScanResult] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState<Step>('select');
  // Lifted from ReceiptUpload via onWorkInProgressChange — true only while
  // the non-abortable OCR scan call is in flight.
  const [isUploadBusy, setIsUploadBusy] = useState(false);

  // Block close only when there is actually unsaved work at risk: an active
  // OCR call (no abort API) or the validation step where the user has scan
  // results to approve. A locally-selected file alone is NOT considered work
  // at risk — it can be re-picked.
  const shouldPreventClose = isUploadBusy || currentStep === 'validate';

  const resetAndClose = () => {
    setCurrentStep('select');
    setScanResult(null);
    setIsManualForm(true);
    setIsUploadBusy(false);
    closeModal();
  };

  useDialogBackClose(isOpen, resetAndClose, shouldPreventClose);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Honour the initialMode requested by the caller: scan jumps straight
      // to the upload step, manual lands on the select/form view.
      if (initialMode === 'scan') {
        setIsManualForm(false);
        setCurrentStep('upload');
      } else {
        setIsManualForm(true);
        setCurrentStep('select');
      }
    } else {
      document.body.style.overflow = 'unset';
      setCurrentStep('select');
      setScanResult(null);
      setIsManualForm(true);
      setIsUploadBusy(false);
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, initialMode]);

  useEffect(() => {
    if (!shouldPreventClose) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && e.key === 'w') ||
        (e.altKey && e.key === 'F4') ||
        e.key === 'F5' ||
        (e.ctrlKey && e.key === 'r')
      ) {
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
  }, [shouldPreventClose]);

  const handleOpenChange = (open: boolean) => {
    if (!open && shouldPreventClose) return;
    if (!open) resetAndClose();
  };

  const handleScanComplete = (result: any) => {
    setScanResult(result);
    setCurrentStep('validate');
  };

  const handleScanApprove = () => {
    resetAndClose();
    onSubmitSuccess?.();
  };

  const content = (
    <>
      {currentStep === 'select' && (
        <div className="space-y-6">
          <div className="flex gap-4">
            <Button
              type="button"
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
              type="button"
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
            <div className="pb-4">
              <ExpenseForm
                onSubmitSuccess={() => {
                  onSubmitSuccess?.();
                  resetAndClose();
                }}
                onCancel={resetAndClose}
              />
            </div>
          )}
        </div>
      )}

      {currentStep === 'upload' && (
        <div className="pb-4">
          <ReceiptUpload
            onScanComplete={handleScanComplete}
            onCancel={resetAndClose}
            onWorkInProgressChange={setIsUploadBusy}
          />
        </div>
      )}

      {currentStep === 'validate' && scanResult && (
        <div className="pb-4">
          <ReceiptValidation
            scanResult={scanResult}
            onApprove={handleScanApprove}
            onCancel={resetAndClose}
          />
        </div>
      )}
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={handleOpenChange} dismissible={!shouldPreventClose}>
        <DrawerContent className="max-h-[92vh] z-[9999]">
          <DrawerHeader className="text-right px-4 pb-2 pt-2 flex-shrink-0">
            <DrawerTitle className="text-base">{titleFor(currentStep)}</DrawerTitle>
            <DrawerDescription className="text-xs">{descriptionFor(currentStep)}</DrawerDescription>
          </DrawerHeader>
          {/* Native overflow-y-auto instead of Radix ScrollArea — vaul's
              drag detection walks up from the touch target looking for an
              element whose computed style has overflow auto/scroll. Radix
              ScrollArea wraps content in a Root with overflow:hidden plus
              a nested Viewport whose overflow is async-toggled, which can
              cause vaul to preventDefault every touchmove until the
              observer settles — leaving the form unscrollable. Native
              overflow is detected immediately. overscroll-contain blocks
              the scroll chain from bubbling out and triggering a
              drawer-dismiss when the user reaches the form's bottom. */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-3 pb-4">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {/* [&>button]:hidden hides the default shadcn close button (a direct
          <button> child of DialogContent) so we can render our own with a
          disabled-when-busy state instead of silently swallowing the click. */}
      <DialogContent
        className="w-[95vw] max-w-[900px] h-[85vh] sm:h-[90vh] max-h-[90vh] z-[9999] flex flex-col p-0 [&>button]:hidden"
        onPointerDownOutside={(e) => shouldPreventClose && e.preventDefault()}
        onEscapeKeyDown={(e) => shouldPreventClose && e.preventDefault()}
        onInteractOutside={(e) => shouldPreventClose && e.preventDefault()}
        onFocusOutside={(e) => shouldPreventClose && e.preventDefault()}
      >
        <DialogHeader className="relative flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-b">
          <DialogTitle className="text-base sm:text-lg">{titleFor(currentStep)}</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {descriptionFor(currentStep)}
          </DialogDescription>
          <button
            type="button"
            onClick={resetAndClose}
            disabled={shouldPreventClose}
            aria-label={shouldPreventClose ? 'המתן לסיום הסריקה' : 'סגירה'}
            title={shouldPreventClose ? 'המתן לסיום הסריקה...' : 'סגירה'}
            className="absolute right-3 top-3 sm:right-4 sm:top-4 rounded-sm p-1 opacity-70 transition-all duration-200 hover:opacity-100 hover:scale-110 hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">סגירה</span>
          </button>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full px-3 sm:px-6 py-3 sm:py-4">{content}</ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
