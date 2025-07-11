-- Remove the problematic expense of 121 NIS that cannot be approved/rejected
-- This expense was created by the same user trying to approve it
DELETE FROM public.expenses 
WHERE id = '090b0738-69fb-4cc7-9e23-edc34871c04b' 
AND amount = 121.00 
AND description = '21321';