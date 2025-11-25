import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ReceiptPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  receiptId: string;
}

export const ReceiptPreviewDialog: React.FC<ReceiptPreviewDialogProps> = ({
  isOpen,
  onClose,
  receiptId
}) => {
  const [receipt, setReceipt] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const { toast } = useToast();

  React.useEffect(() => {
    const fetchReceipt = async () => {
      if (!receiptId) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('scanned_receipts')
          .select('*')
          .eq('id', receiptId)
          .single();

        if (error) throw error;
        setReceipt(data);
      } catch (error) {
        console.error('Error fetching receipt:', error);
        toast({
          variant: "destructive",
          title: "שגיאה",
          description: "לא ניתן לטעון את החשבונית"
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      fetchReceipt();
    }
  }, [receiptId, isOpen, toast]);

  const handleDownload = () => {
    if (!receipt) return;

    // Create temporary anchor element to trigger download
    const link = document.createElement('a');
    link.href = receipt.file_url;
    link.download = receipt.file_name || 'receipt';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "מוריד קובץ...",
      description: "החשבונית בהורדה"
    });
  };

  const isPDF = receipt?.file_type === 'application/pdf';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>תצוגה מקדימה - חשבונית</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={!receipt}
              >
                <Download className="h-4 w-4 mr-2" />
                הורדה
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : !receipt ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              לא נמצאה חשבונית
            </div>
          ) : isPDF ? (
            <div className="h-full flex flex-col items-center justify-center gap-4">
              <FileText className="h-16 w-16 text-muted-foreground" />
              <p className="text-muted-foreground">תצוגה מקדימה של PDF לא זמינה</p>
              <Button onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                הורד קובץ PDF
              </Button>
            </div>
          ) : (
            <div className="h-full overflow-auto">
              <img
                src={receipt.file_url}
                alt="Receipt preview"
                className="w-full h-auto object-contain"
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};