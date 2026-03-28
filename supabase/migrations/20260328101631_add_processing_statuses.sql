-- Add 'processing' and 'processing_failed' to investor status CHECK constraint
ALTER TABLE investors DROP CONSTRAINT investors_status_check;
ALTER TABLE investors ADD CONSTRAINT investors_status_check
  CHECK (status IN ('pending', 'processing', 'processing_failed', 'docs_uploaded', 'data_confirmed', 'complete'));
