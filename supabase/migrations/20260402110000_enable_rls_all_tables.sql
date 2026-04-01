-- Enable Row-Level Security on all public tables.
-- No policies needed: deny-by-default blocks anon/authenticated access.
-- The service_role key (FastAPI backend) bypasses RLS entirely.

ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_data ENABLE ROW LEVEL SECURITY;
