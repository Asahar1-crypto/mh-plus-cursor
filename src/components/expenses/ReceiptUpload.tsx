import React, { useState, useCallback } from 'react';
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
  const [isUploading, setIsUploading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const { toast } = useToast();
  const { account } = useAuth();

  console.log('🔍 ReceiptUpload: Render', { selectedFile: selectedFile?.name, isUploading, isScanning, account: account?.id });

  const acceptedTypes = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'application/pdf': ['.pdf']
  };

  const maxFileSize = 5 * 1024 * 1024; // 5MB

  const handleFileSelect = useCallback((file: File) => {
    try {
      console.log('🔍 ReceiptUpload: handleFileSelect called', { fileName: file.name, fileSize: file.size, fileType: file.type });
      
      // Validate file type
      if (!Object.keys(acceptedTypes).includes(file.type)) {
        console.log('🔍 ReceiptUpload: File type not accepted', file.type);
        toast({
          variant: "destructive",
          title: "פורמט קובץ לא נתמך",
          description: "אנא העלה קובץ תמונה (JPG, PNG) או PDF בלבד."
        });
        return;
      }

      // Validate file size
      if (file.size > maxFileSize) {
        console.log('🔍 ReceiptUpload: File too large', file.size);
        toast({
          variant: "destructive",
          title: "קובץ גדול מדי",
          description: "גודל הקובץ לא יכול לעלות על 5MB."
        });
        return;
      }

      console.log('🔍 ReceiptUpload: File validation passed, setting selected file');
      setSelectedFile(file);

      // Create preview for images
      if (file.type.startsWith('image/')) {
        console.log('🔍 ReceiptUpload: Creating preview for image');
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreviewUrl(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setPreviewUrl(null);
      }
    } catch (error) {
      console.error('🔍 ReceiptUpload: Error in handleFileSelect', error);
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
    e.stopPropagation();
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
    // Clear the input value to allow selecting the same file again
    e.target.value = '';
  }, [handleFileSelect]);

  const handleCameraCapture = useCallback(async () => {
    try {
      console.log('🔍 ReceiptUpload: Taking photo with camera');
      
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
      console.error('🔍 ReceiptUpload: Camera error', error);
      toast({
        variant: "destructive",
        title: "שגיאה במצלמה",
        description: "לא הצלחנו לצלם תמונה. בדוק הרשאות המצלמה."
      });
    }
  }, [handleFileSelect, toast]);

  const handleGallerySelect = useCallback(async () => {
    try {
      console.log('🔍 ReceiptUpload: Selecting from gallery');
      
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
      console.error('🔍 ReceiptUpload: Gallery error', error);
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
    console.log('🔍 ReceiptUpload: scanReceipt called', { selectedFile: selectedFile?.name, account: account?.id });
    
    if (!selectedFile || !account) {
      console.log('🔍 ReceiptUpload: Missing file or account', { selectedFile: !!selectedFile, account: !!account });
      return;
    }

    console.log('🔍 ReceiptUpload: Starting scan process');
    setIsUploading(true);
    setIsScanning(true);

    try {
      console.log('🔍 ReceiptUpload: Uploading file to storage');
      const fileUrl = await uploadFileToStorage(selectedFile);
      console.log('🔍 ReceiptUpload: File uploaded successfully', fileUrl);

      console.log('🔍 ReceiptUpload: Calling scan function');
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
        console.log('🔍 ReceiptUpload: Scan function error', error);
        throw new Error(error.message || 'שגיאה בסריקת החשבונית');
      }

      if (!data.success) {
        console.log('🔍 ReceiptUpload: Scan function returned error', data);
        throw new Error(data.error || 'לא הצלחנו לסרוק את החשבונית');
      }

      console.log('🔍 ReceiptUpload: Scan successful, calling onScanComplete', data.result);
      toast({
        title: "החשבונית נסרקה בהצלחה!",
        description: `זוהו ${data.result.items.length} פריטים`
      });

      onScanComplete({ ...data.result, receipt_id: data.scan_id });

    } catch (error) {
      console.log('🔍 ReceiptUpload: Scan error', error);
      toast({
        variant: "destructive",
        title: "שגיאה בסריקה",
        description: error instanceof Error ? error.message : "אירעה שגיאה לא צפויה"
      });
    } finally {
      console.log('🔍 ReceiptUpload: Scan process finished');
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
        <div className="space-y-4">
          <Card
            className="border-dashed border-2 border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <CardContent className="flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Upload className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">העלה חשבונית לסריקה</h3>
              <p className="text-muted-foreground mb-4">
                גרור קובץ לכאן או בחר קובץ למטה
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <FileImage className="h-4 w-4" />
                <span>JPG, PNG</span>
                <span>•</span>
                <span>עד 5MB</span>
              </div>
              {Capacitor.isNativePlatform() ? (
                <div className="space-y-2 w-full">
                  <Button 
                    onClick={handleCameraCapture}
                    variant="outline"
                    className="w-full"
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    צלם חשבונית
                  </Button>
                  <Button 
                    onClick={handleGallerySelect}
                    variant="outline"
                    className="w-full"
                  >
                    <FileImage className="mr-2 h-4 w-4" />
                    בחר מהגלריה
                  </Button>
                </div>
              ) : (
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  onChange={handleFileInput}
                  className="w-full p-3 border border-dashed border-muted-foreground/50 rounded-lg cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
              )}
            </CardContent>
          </Card>
        </div>
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