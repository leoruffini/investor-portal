-- Add JSONB settings column to promotions for promotion-level variables
-- (total_investment, total_shares, disbursement percentages, etc.)
ALTER TABLE promotions ADD COLUMN settings jsonb;
