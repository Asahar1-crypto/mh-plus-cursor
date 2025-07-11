-- Update the ₪4800 expense to be approved
UPDATE public.expenses 
SET 
  status = 'approved',
  approved_by = 'd1eb3dd1-3069-49d2-8da1-d717a7f7769a',
  approved_at = now()
WHERE id = '3860e447-1058-47c4-80b7-4743bb75c5fd';