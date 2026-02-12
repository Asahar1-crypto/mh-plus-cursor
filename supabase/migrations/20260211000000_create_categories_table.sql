-- Create categories table for per-account custom categories
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id, name)
);

CREATE INDEX idx_categories_account_id ON public.categories(account_id);

-- RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Account members can view categories"
ON public.categories FOR SELECT
USING (account_id = ANY(public.get_user_account_ids(auth.uid())));

CREATE POLICY "Account admins can insert categories"
ON public.categories FOR INSERT
WITH CHECK (public.is_account_admin(auth.uid(), account_id));

CREATE POLICY "Account admins can update categories"
ON public.categories FOR UPDATE
USING (public.is_account_admin(auth.uid(), account_id))
WITH CHECK (public.is_account_admin(auth.uid(), account_id));

CREATE POLICY "Account admins can delete categories"
ON public.categories FOR DELETE
USING (public.is_account_admin(auth.uid(), account_id));

-- Super admins
CREATE POLICY "Super admins can view all categories"
ON public.categories FOR SELECT
USING (public.is_super_admin(auth.uid()));

-- Seed default categories for existing accounts
INSERT INTO public.categories (account_id, name, color, sort_order)
SELECT a.id, cat.name, cat.color, cat.sort_order
FROM public.accounts a
CROSS JOIN (VALUES
  ('חינוך', '#3b82f6', 1),
  ('רפואה', '#ef4444', 2),
  ('פנאי', '#10b981', 3),
  ('ביגוד', '#f59e0b', 4),
  ('מזון', '#8b5cf6', 5),
  ('מזונות', '#ec4899', 6),
  ('קייטנות', '#06b6d4', 7),
  ('אחר', '#6b7280', 8)
) AS cat(name, color, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories c WHERE c.account_id = a.id AND c.name = cat.name
);

-- Trigger: Seed default categories for new accounts
CREATE OR REPLACE FUNCTION public.seed_default_categories()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.categories (account_id, name, color, sort_order) VALUES
    (NEW.id, 'חינוך', '#3b82f6', 1),
    (NEW.id, 'רפואה', '#ef4444', 2),
    (NEW.id, 'פנאי', '#10b981', 3),
    (NEW.id, 'ביגוד', '#f59e0b', 4),
    (NEW.id, 'מזון', '#8b5cf6', 5),
    (NEW.id, 'מזונות', '#ec4899', 6),
    (NEW.id, 'קייטנות', '#06b6d4', 7),
    (NEW.id, 'אחר', '#6b7280', 8);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_account_created_seed_categories ON public.accounts;
CREATE TRIGGER on_account_created_seed_categories
  AFTER INSERT ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.seed_default_categories();
