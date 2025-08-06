-- First, fix the existing pending expense by updating it to approved status
UPDATE public.expenses 
SET status = 'approved', approved_by = created_by_id, approved_at = now()
WHERE id = 'c0b50136-4d0e-4b1a-acd7-fe466cdbc0d2' 
AND paid_by_id = created_by_id;