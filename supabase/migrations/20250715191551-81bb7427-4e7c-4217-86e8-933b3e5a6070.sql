-- Enable RLS on scanned_receipts table
ALTER TABLE public.scanned_receipts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for scanned_receipts table
CREATE POLICY "Users can insert their own scanned receipts" 
ON public.scanned_receipts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own scanned receipts" 
ON public.scanned_receipts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own scanned receipts" 
ON public.scanned_receipts 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create storage policies for receipts bucket
CREATE POLICY "Users can upload receipts" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own receipts" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own receipts" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own receipts" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);