-- Add receipt_id column to expenses table to link scanned receipts
ALTER TABLE expenses 
ADD COLUMN receipt_id UUID REFERENCES scanned_receipts(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_expenses_receipt_id ON expenses(receipt_id);

-- Add comment for documentation
COMMENT ON COLUMN expenses.receipt_id IS 'Links to the scanned receipt file in scanned_receipts table';