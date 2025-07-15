-- Remove old policies and create new ones that match account access
DROP POLICY IF EXISTS "Users can upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own receipts" ON storage.objects;

-- Create new policies for receipts bucket that work with account access
CREATE POLICY "Users can upload receipts to their accounts" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'receipts' AND 
  (storage.foldername(name))[1] = ANY(get_user_account_ids(auth.uid())::text[])
);

CREATE POLICY "Users can view receipts from their accounts" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'receipts' AND 
  (storage.foldername(name))[1] = ANY(get_user_account_ids(auth.uid())::text[])
);

CREATE POLICY "Users can update receipts from their accounts" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'receipts' AND 
  (storage.foldername(name))[1] = ANY(get_user_account_ids(auth.uid())::text[])
);

CREATE POLICY "Users can delete receipts from their accounts" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'receipts' AND 
  (storage.foldername(name))[1] = ANY(get_user_account_ids(auth.uid())::text[])
);