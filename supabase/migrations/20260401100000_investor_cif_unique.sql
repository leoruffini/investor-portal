-- Add CIF as the unique identifier for investors (replaces email uniqueness)
-- CIF = Spanish corporate tax ID; the real unique key per legal entity.
-- Email stays NOT NULL but is no longer unique (same person can manage multiple companies).

ALTER TABLE investors ADD COLUMN cif TEXT NOT NULL DEFAULT '';

-- Backfill existing rows with a unique placeholder CIF derived from their id
UPDATE investors SET cif = 'PENDING-' || LEFT(id::text, 8) WHERE cif = '';

ALTER TABLE investors DROP CONSTRAINT investors_email_key;
ALTER TABLE investors ADD CONSTRAINT investors_cif_key UNIQUE (cif);
