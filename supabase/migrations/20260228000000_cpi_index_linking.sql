-- ================================================================
-- CPI Index Linking Module
-- (2026-02-28)
--
-- Adds support for automatic CPI-linked recurring expenses (e.g. alimony).
-- - cpi_history: stores CPI index values from CBS API
-- - expenses: new columns for index-linked templates
-- - accounts: index_linking_enabled (user must explicitly enable)
-- ================================================================

-- ── Step 1: Create cpi_history table ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.cpi_history (
  period TEXT PRIMARY KEY,           -- 'YYYY-MM' (e.g. '2024-01')
  index_value DECIMAL(10,5) NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.cpi_history IS 'CPI index values from CBS API (id=120010). Full history stored as-is.';

-- ── Step 2: Extend expenses for index-linked templates ───────────
ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS base_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS base_index_period TEXT,
ADD COLUMN IF NOT EXISTS is_index_linked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS index_update_frequency TEXT,
ADD COLUMN IF NOT EXISTS floor_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS last_calculated_amount DECIMAL(10,2);

COMMENT ON COLUMN public.expenses.base_amount IS 'Base amount for CPI-linked recurring (when is_index_linked=true)';
COMMENT ON COLUMN public.expenses.base_index_period IS 'Base index period YYYY-MM for CPI calculation';
COMMENT ON COLUMN public.expenses.is_index_linked IS 'When true, amount is recalculated using CPI formula';
COMMENT ON COLUMN public.expenses.index_update_frequency IS 'monthly | quarterly | yearly - how often to recalc';
COMMENT ON COLUMN public.expenses.floor_enabled IS 'When true, amount never goes below base_amount';
COMMENT ON COLUMN public.expenses.last_calculated_amount IS 'Last calculated amount (for display)';

-- ── Step 3: Extend accounts ─────────────────────────────────────
ALTER TABLE public.accounts
ADD COLUMN IF NOT EXISTS index_linking_enabled BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.accounts.index_linking_enabled IS 'When true, user can add CPI-linked recurring expenses. Must be explicitly enabled.';
