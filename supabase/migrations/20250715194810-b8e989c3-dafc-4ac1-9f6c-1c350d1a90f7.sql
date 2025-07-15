-- Make the receipts bucket public so OpenAI can access the files
UPDATE storage.buckets 
SET public = true 
WHERE id = 'receipts';