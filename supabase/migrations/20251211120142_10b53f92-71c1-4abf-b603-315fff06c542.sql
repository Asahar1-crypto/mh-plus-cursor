-- Add SMS notifications enabled column to accounts
ALTER TABLE public.accounts 
ADD COLUMN IF NOT EXISTS sms_notifications_enabled boolean DEFAULT false;

-- Create expense_notifications table to track sent notifications
CREATE TABLE IF NOT EXISTS public.expense_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  notification_type text NOT NULL DEFAULT 'sms',
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  recipient_phone text,
  recipient_user_id uuid REFERENCES public.profiles(id),
  status text NOT NULL DEFAULT 'sent',
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_expense_notifications_expense_id ON public.expense_notifications(expense_id);

-- Enable RLS
ALTER TABLE public.expense_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for expense_notifications
CREATE POLICY "Account members can view their expense notifications"
ON public.expense_notifications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.expenses e
    WHERE e.id = expense_notifications.expense_id
    AND e.account_id = ANY(get_user_account_ids(auth.uid()))
  )
);

CREATE POLICY "Super admins can view all notifications"
ON public.expense_notifications
FOR SELECT
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage all notifications"
ON public.expense_notifications
FOR ALL
USING (is_super_admin(auth.uid()));