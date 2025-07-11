-- Create budgets table for monthly food budget tracking
CREATE TABLE public.budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL,
  category TEXT NOT NULL,
  monthly_amount DECIMAL(10,2) NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(account_id, category, month, year)
);

-- Enable Row Level Security
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- Create policies for budgets access
CREATE POLICY "Account members can view budgets" 
ON public.budgets 
FOR SELECT 
USING (account_id = ANY (get_user_account_ids(auth.uid())));

CREATE POLICY "Account admins can manage budgets" 
ON public.budgets 
FOR ALL 
USING (is_account_admin(auth.uid(), account_id));

-- Add foreign key constraint
ALTER TABLE public.budgets 
ADD CONSTRAINT fk_budgets_account 
FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;