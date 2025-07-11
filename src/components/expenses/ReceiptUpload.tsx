import React, { useState, useCallback } from 'react';
import { Upload, FileImage, FileText, Camera, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

interface ReceiptUploadProps {
  onScanComplete: (scanResult: any) => void;
  onCancel: () => void;
}

export const ReceiptUpload: React.FC<ReceiptUploadProps> = ({ onScanComplete, onCancel }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const { toast } = useToast();
  const { account } = useAuth();

  const acceptedTypes = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'application/pdf': ['.pdf']
  };

  const maxFileSize = 5 * 1024 * 1024; // 5MB

  const handleFileSelect = useCallback((file: File) => {
    // Validate file type
    if (!Object.keys(acceptedTypes).includes(file.type)) {
      toast({
        variant: "destructive",
        title: "פורמט קובץ לא נתמך",
        description: "אנא העלה קובץ PDF, JPG או PNG בלבד."
      });
      return;
    }

    // Validate file size
    if (file.size > maxFileSize) {
      toast({
        variant: "destructive",
        title: "קובץ גדול מדי",
        description: "גודל הקובץ לא יכול לעלות על 5MB."
      });
      return;
    }

    setSelectedFile(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const uploadFileToStorage = async (file: File): Promise<string> => {
    if (!account?.id) {
      throw new Error('לא נמצא חשבון פעיל');
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${account.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(filePath, file);

    if (uploadError) {
      throw new Error(`שגיאה בהעלאת הקובץ: ${uploadError.message}`);
    }

    const { data } = supabase.storage
      .from('receipts')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const scanReceipt = async () => {
    if (!selectedFile || !account) return;

    setIsUploading(true);
    setIsScanning(true);

    try {
      // Upload file to storage
      const fileUrl = await uploadFileToStorage(selectedFile);

      // Call scan function
      const { data, error } = await supabase.functions.invoke('scan-receipt', {
        body: {
          file_url: fileUrl,
          file_name: selectedFile.name,
          file_size: selectedFile.size,
          file_type: selectedFile.type,
          account_id: account.id
        }
      });

      if (error) {
        throw new Error(error.message || 'שגיאה בסריקת החשבונית');
      }

      if (!data.success) {
        throw new Error(data.error || 'לא הצלחנו לסרוק את החשבונית');
      }

      toast({
        title: "החשבונית נסרקה בהצלחה!",
        description: `זוהו ${data.result.items.length} פריטים`
      });

      onScanComplete(data.result);

    } catch (error) {
      console.error('Scan error:', error);
      toast({
        variant: "destructive",
        title: "שגיאה בסריקה",
        description: error instanceof Error ? error.message : "אירעה שגיאה לא צפויה"
      });
    } finally {
      setIsUploading(false);
      setIsScanning(false);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  return (
    <div className="space-y-4">
      {!selectedFile ? (
        <Card
          className="border-dashed border-2 border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors cursor-pointer"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Upload className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">העלה חשבונית לסריקה</h3>
            <p className="text-muted-foreground mb-4">
              גרור קובץ לכאן או לחץ לבחירת קובץ
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileImage className="h-4 w-4" />
              <span>JPG, PNG</span>
              <span>•</span>
              <FileText className="h-4 w-4" />
              <span>PDF</span>
              <span>•</span>
              <span>עד 5MB</span>
            </div>
            <input
              id="file-input"
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={handleFileInput}
              className="hidden"
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                {selectedFile.type.startsWith('image/') ? (
                  <FileImage className="h-8 w-8 text-blue-500" />
                ) : (
                  <FileText className="h-8 w-8 text-red-500" />
                )}
                <div>
                  <h3 className="font-medium">{selectedFile.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                disabled={isUploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {previewUrl && (
              <div className="mb-4">
                <img
                  src={previewUrl}
                  alt="תצוגה מקדימה"
                  className="max-w-full h-auto max-h-64 rounded-lg border"
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={scanReceipt}
                disabled={isUploading}
                className="flex-1"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    סורק עם AI...
                  </>
                ) : (
                  <>
                    <Camera className="mr-2 h-4 w-4" />
                    סרוק עם AI
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={onCancel} disabled={isUploading}>
                ביטול
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};