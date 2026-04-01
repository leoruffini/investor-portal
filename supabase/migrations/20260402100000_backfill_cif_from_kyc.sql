-- Backfill PENDING-* CIFs from confirmed KYC data (datos_societarios.nif).
-- Only updates when the extracted NIF is non-empty and not already taken by another investor.
UPDATE investors i
SET cif = UPPER(REGEXP_REPLACE(k.extracted_json->'datos_societarios'->>'nif', '[\s\-.]', '', 'g'))
FROM kyc_data k
WHERE k.investor_id = i.id
  AND k.confirmed = true
  AND i.cif LIKE 'PENDING-%'
  AND k.extracted_json->'datos_societarios'->>'nif' IS NOT NULL
  AND TRIM(k.extracted_json->'datos_societarios'->>'nif') <> ''
  AND NOT EXISTS (
    SELECT 1 FROM investors other
    WHERE other.id <> i.id
      AND other.cif = UPPER(REGEXP_REPLACE(k.extracted_json->'datos_societarios'->>'nif', '[\s\-.]', '', 'g'))
  );
