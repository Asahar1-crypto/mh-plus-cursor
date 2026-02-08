-- Add gender column to children table
-- Values: 'son', 'daughter'
ALTER TABLE public.children 
ADD COLUMN IF NOT EXISTS gender text DEFAULT 'son';

-- Add a check constraint to ensure valid values
ALTER TABLE public.children 
ADD CONSTRAINT children_gender_check 
CHECK (gender IN ('son', 'daughter'));

COMMENT ON COLUMN public.children.gender IS 'Gender of the child: son or daughter';
