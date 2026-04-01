-- Investor Portal — schema (v2: investors decoupled from promotions)
-- Run this in the Supabase SQL Editor

create table promotions (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  settings    jsonb,
  created_at  timestamptz not null default now()
);
alter table promotions enable row level security;

create table investors (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  cif         text not null unique,
  created_at  timestamptz not null default now()
);
alter table investors enable row level security;

create table promotion_investors (
  id                uuid primary key default gen_random_uuid(),
  promotion_id      uuid not null references promotions(id) on delete cascade,
  investor_id       uuid not null references investors(id) on delete cascade,
  investment_amount numeric,
  ownership_pct     numeric,
  status            text not null default 'pending'
                    check (status in ('pending','processing','processing_failed',
                                      'docs_uploaded','data_confirmed','complete')),
  token             text unique default gen_random_uuid()::text,
  created_at        timestamptz not null default now(),
  unique (promotion_id, investor_id)
);
alter table promotion_investors enable row level security;

create table documents (
  id            uuid primary key default gen_random_uuid(),
  investor_id   uuid not null references investors(id) on delete cascade,
  filename      text not null,
  storage_path  text not null,
  doc_type      text not null default 'otro'
                check (doc_type in ('escritura_constitucion', 'nombramiento', 'poderes', 'otro')),
  uploaded_at   timestamptz not null default now()
);
alter table documents enable row level security;

create table kyc_data (
  id              uuid primary key default gen_random_uuid(),
  investor_id     uuid not null references investors(id) on delete cascade,
  extracted_json  jsonb not null default '{}'::jsonb,
  confirmed       boolean not null default false,
  confirmed_at    timestamptz
);
alter table kyc_data enable row level security;
