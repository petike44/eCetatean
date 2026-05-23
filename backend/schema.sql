-- ════════════════════════════════════════════════════════════════
--  eCetățean — Supabase schema
-- ════════════════════════════════════════════════════════════════
--  How to use:
--    1. Open your Supabase project → SQL Editor → "New query"
--    2. Paste this whole file and click "Run"
--  Safe to re-run: every statement is idempotent.
--
--  Note on security: the backend talks to Supabase with the
--  service_role key, which bypasses Row Level Security. These
--  tables intentionally leave RLS OFF for local testing. Before
--  going to production, enable RLS and add policies.
-- ════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ─── profiles ───────────────────────────────────────────────────
-- One row per citizen. user_id is the auth subject id (the stub
-- user id while AUTH_STUB=true, or the Clerk `sub` once Clerk is on).
create table if not exists public.profiles (
  id              uuid primary key default gen_random_uuid(),
  user_id         text not null unique,
  full_name       text,
  cnp             text,
  date_of_birth   date,
  buletin_series  text,
  buletin_number  text,
  buletin_expiry  date,
  address         text,
  city            text not null default 'Cluj-Napoca',
  phone           text,
  email           text,
  language        text not null default 'ro' check (language in ('ro', 'hu')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists profiles_user_id_idx on public.profiles (user_id);
create index if not exists profiles_cnp_idx on public.profiles (cnp);

-- ─── vehicles ───────────────────────────────────────────────────
-- Defined in the type layer; no API endpoint hits it yet. Included
-- so the schema is complete when vehicle features get wired up.
create table if not exists public.vehicles (
  id                 uuid primary key default gen_random_uuid(),
  user_id            text not null,
  plate_number       text not null,
  make               text,
  model              text,
  year               int,
  engine_cc          int,
  fuel_type          text,
  color              text,
  vin                text,
  itp_expiry         date,
  rca_expiry         date,
  rca_insurer        text,
  rca_policy_number  text,
  impozit_amount     numeric,
  impozit_paid_until date,
  created_at         timestamptz not null default now()
);
create index if not exists vehicles_user_id_idx on public.vehicles (user_id);

-- ─── civic_reports ──────────────────────────────────────────────
create table if not exists public.civic_reports (
  id               uuid primary key default gen_random_uuid(),
  user_id          text not null,
  category         text not null check (category in (
                     'groapa_asfalt', 'iluminat_defect', 'gunoi_ilegal',
                     'masina_abandonata', 'trotuar_deteriorat', 'alt_problema'
                   )),
  description      text,
  latitude         double precision,
  longitude        double precision,
  address          text,
  photo_url        text,
  reference_number text not null unique,
  status           text not null default 'inregistrata'
                     check (status in ('inregistrata', 'in_lucru', 'rezolvata')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists civic_reports_user_id_idx on public.civic_reports (user_id);

-- ─── life_event_progress ────────────────────────────────────────
create table if not exists public.life_event_progress (
  id              uuid primary key default gen_random_uuid(),
  user_id         text not null,
  event_type      text not null,
  event_title     text not null,
  event_data      jsonb default '{}'::jsonb,
  steps_status    jsonb default '{}'::jsonb,
  current_step    integer default 1,
  total_steps     integer not null,
  is_completed    boolean default false,
  started_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  completed_at    timestamptz
);
create index if not exists life_event_progress_user_id_idx
  on public.life_event_progress (user_id);

-- ─── audit_log (hash-chained, append-only) ──────────────────────
create table if not exists public.audit_log (
  id            uuid primary key default gen_random_uuid(),
  user_id       text not null,
  action        text not null,
  action_type   text not null,
  data          jsonb default '{}'::jsonb,
  data_hash     text not null,
  previous_hash text not null,
  record_hash   text not null,
  created_at    timestamptz not null default now()
);
create index if not exists audit_log_user_id_created_idx
  on public.audit_log (user_id, created_at);

-- ─── civil_servant_access_log ───────────────────────────────────
create table if not exists public.civil_servant_access_log (
  id                  uuid primary key default gen_random_uuid(),
  servant_user_id     text not null,
  accessed_citizen_id text not null,
  action              text not null,
  created_at          timestamptz not null default now()
);

-- ─── Storage bucket for report photos ───────────────────────────
-- The reports endpoint uploads photos to a public bucket named
-- "civic-reports" and stores the public URL on the report row.
insert into storage.buckets (id, name, public)
values ('civic-reports', 'civic-reports', true)
on conflict (id) do nothing;

-- ════════════════════════════════════════════════════════════════
--  Seed data for local testing
--  Matches AUTH_STUB_USER_ID in backend/.env.local so the app has
--  a profile to show as soon as you sign in.
-- ════════════════════════════════════════════════════════════════
insert into public.profiles
  (user_id, full_name, cnp, city, language, phone, email, address)
values
  ('stub-user-citizen', 'Cetățean Demo', '1900101123456', 'Cluj-Napoca',
   'ro', '+40700000000', 'demo@ecetatean.ro',
   'Str. Memorandumului 1, Cluj-Napoca')
on conflict (user_id) do nothing;

-- A couple of sample reports so the "Sesizări" list isn't empty.
insert into public.civic_reports
  (user_id, category, description, address, reference_number, status)
values
  ('stub-user-citizen', 'groapa_asfalt',
   'Groapă mare pe carosabil, lângă trecerea de pietoni.',
   'Str. Horea 12, Cluj-Napoca', 'CLJ-2026-1001-DEMO', 'inregistrata'),
  ('stub-user-citizen', 'iluminat_defect',
   'Stâlp de iluminat stins de câteva zile.',
   'Piața Unirii, Cluj-Napoca', 'CLJ-2026-1002-DEMO', 'in_lucru')
on conflict (reference_number) do nothing;
