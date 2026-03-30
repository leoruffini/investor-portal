-- Decouple investors from promotions
-- Destructive migration: wipe all data and rebuild schema.
-- Investors become identity-only; per-promotion data moves to promotion_investors.

DROP TABLE IF EXISTS kyc_data CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS investors CASCADE;
DROP TABLE IF EXISTS promotions CASCADE;

CREATE TABLE promotions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  settings    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE investors (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  email       text NOT NULL UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE promotion_investors (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id      uuid NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  investor_id       uuid NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
  investment_amount numeric,
  ownership_pct     numeric,
  status            text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','processing','processing_failed',
                                      'docs_uploaded','data_confirmed','complete')),
  token             text UNIQUE DEFAULT gen_random_uuid()::text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (promotion_id, investor_id)
);

CREATE TABLE documents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id   uuid NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
  filename      text NOT NULL,
  storage_path  text NOT NULL,
  doc_type      text NOT NULL DEFAULT 'otro'
                CHECK (doc_type IN ('escritura_constitucion','nombramiento','poderes','otro')),
  uploaded_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE kyc_data (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id     uuid NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
  extracted_json  jsonb NOT NULL DEFAULT '{}'::jsonb,
  confirmed       boolean NOT NULL DEFAULT false,
  confirmed_at    timestamptz
);
