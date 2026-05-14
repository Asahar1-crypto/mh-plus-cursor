-- Receipt-level dedup: store the invoice number when the OCR extracts one
-- and prevent the same invoice from being added twice within the same account.
-- We intentionally do NOT dedup on amount/vendor/date because in a shared
-- family account two members legitimately buy the same amount at the same
-- store on the same day.

ALTER TABLE public.expenses          ADD COLUMN invoice_number TEXT;
ALTER TABLE public.scanned_receipts  ADD COLUMN invoice_number TEXT;

-- Partial unique index — only when invoice_number is present.
-- Catches the user re-scanning the same receipt (intentionally or accidentally).
CREATE UNIQUE INDEX idx_expenses_account_invoice_unique
  ON public.expenses(account_id, invoice_number)
  WHERE invoice_number IS NOT NULL;

COMMENT ON COLUMN public.expenses.invoice_number IS 'Receipt invoice number extracted by OCR (or entered manually). Unique per account when present.';
COMMENT ON COLUMN public.scanned_receipts.invoice_number IS 'Invoice number as extracted from the receipt image, before the user confirms the expense.';
