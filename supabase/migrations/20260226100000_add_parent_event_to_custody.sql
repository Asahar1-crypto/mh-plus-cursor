-- Add parent_event column to group sub-events under a composite holiday
ALTER TABLE public.custody_assignments
ADD COLUMN IF NOT EXISTS parent_event text;

CREATE INDEX IF NOT EXISTS idx_custody_assignments_parent ON public.custody_assignments(parent_event);
