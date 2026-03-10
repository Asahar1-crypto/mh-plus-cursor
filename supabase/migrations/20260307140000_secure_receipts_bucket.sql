-- Security fix: receipts bucket was made public in migration 20250715194810
-- so that OpenAI could access files via URL.
--
-- Problem: any receipt URL is accessible by anyone without authentication.
--
-- Fix:
--   1. Make the bucket private again.
--   2. Add a file_path column to scanned_receipts so the frontend can generate
--      short-lived signed URLs on demand instead of relying on permanent public URLs.
--   3. Tighten the storage SELECT policy to explicitly require account membership
--      (the policy already existed but was irrelevant on a public bucket).

-- 1. Make bucket private
UPDATE storage.buckets
SET public = false
WHERE id = 'receipts';

-- 2. Add file_path for path-based signed URL generation
ALTER TABLE public.scanned_receipts
ADD COLUMN IF NOT EXISTS file_path TEXT;

-- 3. Ensure the SELECT policy checks account membership
--    (drop & recreate in case it was removed while the bucket was public)
DROP POLICY IF EXISTS "Users can view receipts from their accounts" ON storage.objects;

CREATE POLICY "Users can view receipts from their accounts"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'receipts'
  AND (storage.foldername(name))[1] = ANY(
    SELECT id::text FROM public.accounts
    WHERE public.is_account_member(auth.uid(), id)
  )
);
