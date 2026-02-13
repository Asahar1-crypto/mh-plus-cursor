import React, { useState, useCallback, useRef } from 'react';
import { Upload, FileImage, FileText, Camera, X, Loader2, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

interface ReceiptUploadProps {
  onScanComplete: (scanResult: any) => void;
  onCancel: () => void;
}

export const ReceiptUpload: React.FC<ReceiptUploadProps> = ({ onScanComplete, onCancel }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const { toast } = useToast();
  const { account } = useAuth();

  const acceptedTypes = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png']
  };

  const maxFileSize = 5 * 1024 * 1024; // 5MB

  const handleFileSelect = useCallback((file: File) => {
    try {
      // Validate file type
      if (!Object.keys(acceptedTypes).includes(file.type)) {
        toast({
          variant: "destructive",
          title: "פורמט קובץ לא נתמך",
          description: "אנא העלה קובץ תמונה (JPG, PNG) בלבד."
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
    } catch (error) {
      console.error('Error in handleFileSelect', error);
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
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.target.files || []);
    if (files.length > 0) handleFileSelect(files[0]);
    e.target.value = '';
  }, [handleFileSelect]);

  const handleCameraCapture = useCallback(async () => {
    try {
      const image = await CapacitorCamera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      });

      if (image.dataUrl) {
        // Convert data URL to File object
        const response = await fetch(image.dataUrl);
        const blob = await response.blob();
        const file = new File([blob], `receipt-${Date.now()}.jpg`, { type: 'image/jpeg' });
        
        handleFileSelect(file);
      }
    } catch (error) {
      console.error('Camera error:', error);
      toast({
        variant: "destructive",
        title: "שגיאה במצלמה",
        description: "לא הצלחנו לצלם תמונה. בדוק הרשאות המצלמה."
      });
    }
  }, [handleFileSelect, toast]);

  const handleGallerySelect = useCallback(async () => {
    try {
      const image = await CapacitorCamera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
      });

      if (image.dataUrl) {
        // Convert data URL to File object
        const response = await fetch(image.dataUrl);
        const blob = await response.blob();
        const file = new File([blob], `receipt-${Date.now()}.jpg`, { type: 'image/jpeg' });
        
        handleFileSelect(file);
      }
    } catch (error) {
      console.error('Gallery error:', error);
      toast({
        variant: "destructive",
        title: "שגיאה בבחירת תמונה",
        description: "לא הצלחנו לבחור תמונה מהגלריה."
      });
    }
  }, [handleFileSelect, toast]);

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
    if (!selectedFile || !account) {
      if (!account) {
        toast({
          variant: "destructive",
          title: "שגיאה",
          description: "לא נמצא חשבון פעיל. אנא בחר חשבון והתחבר מחדש."
        });
      }
      return;
    }

    setIsUploading(true);
    setIsScanning(true);

    try {
      const fileUrl = await uploadFileToStorage(selectedFile);

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
        const errMsg = data?.error || error.message || 'שגיאה בסריקת החשבונית';
        const errDetails = data?.details ? ` (${String(data.details).slice(0, 100)})` : '';
        throw new Error(errMsg + errDetails);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'לא הצלחנו לסרוק את החשבונית');
      }

      const total = data.result?.total;
      toast({
        title: "החשבונית נסרקה בהצלחה!",
        description: total != null ? `סכום: ₪${Number(total).toFixed(2)} | ${data.result?.vendor || ''}` : "בדוק ואשר את הפרטים"
      });

      onScanComplete({ ...data.result, receipt_id: data.scan_id });

    } catch (error) {
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
    <div className="space-y-3 sm:space-y-4">
      {!selectedFile ? (
        <div className="space-y-3 sm:space-y-4">
          <Card
            className={`border-dashed border-2 min-h-[200px] flex items-center justify-center transition-colors cursor-pointer ${
              isDragging ? 'border-primary bg-primary/10' : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
            onDrop={(e) => {
              setIsDragging(false);
              handleDrop(e);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
          >
            <CardContent className="flex flex-col items-center justify-center p-6 sm:p-8 md:p-10 text-center w-full">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-muted flex items-center justify-center mb-3 sm:mb-4">
                <Upload className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold mb-1.5 sm:mb-2">העלה חשבונית לסריקה</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                גרור קובץ לכאן או בחר קובץ למטה
              </p>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                <FileImage className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>JPG, PNG</span>
                <span>•</span>
                <span>עד 5MB</span>
              </div>
              {Capacitor.isNativePlatform() ? (
                <div className="space-y-2 w-full">
                  <Button 
                    type="button"
                    onClick={handleCameraCapture}
                    variant="outline"
                    className="w-full text-xs sm:text-sm"
                  >
                    <Camera className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    צלם חשבונית
                  </Button>
                  <Button 
                    type="button"
                    onClick={handleGallerySelect}
                    variant="outline"
                    className="w-full text-xs sm:text-sm"
                  >
                    <FileImage className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    בחר מהגלריה
                  </Button>
                </div>
              ) : (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                    onChange={handleFileInput}
                    className="sr-only"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full text-xs sm:text-sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    בחר קובץ מהמחשב
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                {selectedFile.type.startsWith('image/') ? (
                  <FileImage className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 shrink-0" />
                ) : (
                  <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-red-500 shrink-0" />
                )}
                <div className="min-w-0">
                  <h3 className="font-medium text-sm sm:text-base truncate">{selectedFile.name}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                disabled={isUploading}
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {previewUrl && (
              <div className="mb-3 sm:mb-4">
                <img
                  src={previewUrl}
                  alt="תצוגה מקדימה"
                  className="max-w-full h-auto max-h-48 sm:max-h-64 rounded-lg border"
                />
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={scanReceipt}
                disabled={isUploading}
                className="flex-1 text-xs sm:text-sm"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                    סורק עם AI...
                  </>
                ) : (
                  <>
                    <Camera className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    סרוק עם AI
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={onCancel} disabled={isUploading} className="w-full sm:w-auto text-xs sm:text-sm">
                ביטול
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};