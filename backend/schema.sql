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
  eidkit_sub      text unique,
  identity_verified_at timestamptz,
  identity_verification_method text,
  identity_verification_level text,
  identity_verified_claims jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists profiles_user_id_idx on public.profiles (user_id);
create index if not exists profiles_cnp_idx on public.profiles (cnp);

alter table public.profiles add column if not exists eidkit_sub text unique;
alter table public.profiles add column if not exists identity_verified_at timestamptz;
alter table public.profiles add column if not exists identity_verification_method text;
alter table public.profiles add column if not exists identity_verification_level text;
alter table public.profiles add column if not exists identity_verified_claims jsonb not null default '{}'::jsonb;
create index if not exists profiles_eidkit_sub_idx on public.profiles (eidkit_sub);

-- Local/demo schema uses backend service_role as the access boundary.
-- Keep RLS disabled here; add production policies before enabling it.
alter table public.profiles disable row level security;

-- ─── identity_verification_sessions ─────────────────────────────
-- Short-lived state for OIDC redirects. The callback from EidKit does
-- not carry the user's Supabase bearer token, so we map state → user_id.
create table if not exists public.identity_verification_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         text not null,
  provider        text not null default 'eidkit',
  state           text not null unique,
  nonce           text not null,
  scopes          text not null,
  redirect_uri    text not null,
  status          text not null default 'pending'
                    check (status in ('pending', 'completed', 'failed', 'expired')),
  error           text,
  created_at      timestamptz not null default now(),
  completed_at    timestamptz
);
create index if not exists identity_verification_sessions_state_idx
  on public.identity_verification_sessions (state);
create index if not exists identity_verification_sessions_user_created_idx
  on public.identity_verification_sessions (user_id, created_at desc);
alter table public.identity_verification_sessions disable row level security;

-- ─── identity_verifications ─────────────────────────────────────
-- Historical verification records. Store normalized claims and token
-- metadata; do not store CAN, PINs, raw NFC material, or photos by default.
create table if not exists public.identity_verifications (
  id              uuid primary key default gen_random_uuid(),
  user_id         text not null,
  provider        text not null default 'eidkit',
  provider_sub    text not null,
  verification_level text not null default 'eidkit_sso',
  scopes          text[] not null default '{}',
  claims          jsonb not null default '{}'::jsonb,
  id_token_iss    text,
  id_token_aud    text,
  id_token_exp    timestamptz,
  verified_at     timestamptz not null default now()
);
create index if not exists identity_verifications_user_verified_idx
  on public.identity_verifications (user_id, verified_at desc);
create index if not exists identity_verifications_provider_sub_idx
  on public.identity_verifications (provider, provider_sub);
alter table public.identity_verifications disable row level security;

-- ─── news ───────────────────────────────────────────────────────
create table if not exists public.news (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  summary      text not null,
  body         text,
  published_at timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists news_published_at_idx on public.news (published_at desc nulls last);

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

-- ─── pdf_forms ─────────────────────────────────────────────────
-- Searchable catalog for official PDF forms. Demo forms are seeded
-- here, while future crawlers can insert discovered candidates into
-- the same table after review.
create table if not exists public.pdf_forms (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  title           text not null,
  institution     text not null,
  description     text,
  category        text not null default 'general',
  tags            text[] not null default '{}',
  storage_bucket  text not null default 'pdf-forms',
  storage_path    text not null,
  source_url      text,
  mapping         jsonb not null default '[]'::jsonb,
  required_inputs jsonb not null default '[]'::jsonb,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists pdf_forms_active_idx on public.pdf_forms (is_active);
create index if not exists pdf_forms_category_idx on public.pdf_forms (category);
create index if not exists pdf_forms_tags_idx on public.pdf_forms using gin (tags);

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

-- Private bucket for official PDF source files used by autofill.
insert into storage.buckets (id, name, public)
values ('pdf-forms', 'pdf-forms', false)
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

-- Demo PDF form catalog. Upload PDFs with matching storage_path values
-- into the "pdf-forms" bucket for exact official layouts; the backend
-- can still generate a placeholder PDF if a demo file is missing.
insert into public.pdf_forms
  (slug, title, institution, description, category, tags, storage_path, source_url, mapping, required_inputs)
values
  (
    'cerere-viza-flotant',
    'Cerere pentru stabilirea resedintei',
    'Directia pentru Evidenta Persoanelor',
    'Formular pentru solicitarea vizei de flotant / stabilirea resedintei.',
    'evidenta-persoanelor',
    array['viza flotant', 'resedinta', 'domiciliu', 'buletin'],
    'cerere-viza-flotant.pdf',
    null,
    '[
      {"id":"full_name","label":"Nume si prenume","dataKey":"profile.full_name","page":0,"x":145,"y":156,"width":260,"height":18,"required":true,"confidence":0.92,"source":"saved"},
      {"id":"cnp","label":"CNP","dataKey":"profile.cnp","page":0,"x":145,"y":184,"width":210,"height":18,"required":true,"confidence":0.92,"source":"saved"},
      {"id":"identity_card","label":"CI seria si numarul","dataKey":"profile.identity_card","page":0,"x":145,"y":212,"width":210,"height":18,"required":true,"confidence":0.86,"source":"saved"},
      {"id":"current_address","label":"Domiciliu actual","dataKey":"profile.full_address","page":0,"x":145,"y":240,"width":320,"height":18,"required":true,"confidence":0.88,"source":"saved"},
      {"id":"new_address","label":"Adresa resedintei solicitate","dataKey":"input.new_address","page":0,"x":145,"y":302,"width":330,"height":18,"required":true,"confidence":0.9,"source":"saved"},
      {"id":"period","label":"Perioada solicitata","dataKey":"input.period","page":0,"x":145,"y":330,"width":210,"height":18,"required":false,"confidence":0.78,"source":"saved"},
      {"id":"date","label":"Data","dataKey":"system.today","page":0,"x":145,"y":680,"width":120,"height":18,"required":true,"confidence":0.95,"source":"saved"}
    ]'::jsonb,
    '[
      {"key":"new_address","label":"Adresa resedintei solicitate","placeholder":"Strada, numar, bloc, apartament"},
      {"key":"period","label":"Perioada solicitata","placeholder":"12 luni"}
    ]'::jsonb
  ),
  (
    'cerere-inmatriculare-drpciv',
    'Cerere inmatriculare vehicul',
    'DRPCIV',
    'Cerere pentru inmatricularea sau transcrierea unui vehicul.',
    'auto',
    array['drpciv', 'inmatriculare', 'vehicul', 'auto'],
    'cerere-inmatriculare-drpciv.pdf',
    null,
    '[
      {"id":"full_name","label":"Subsemnatul(a)","dataKey":"profile.full_name","page":0,"x":145,"y":150,"width":260,"height":18,"required":true,"confidence":0.9,"source":"saved"},
      {"id":"cnp","label":"CNP / CUI","dataKey":"profile.cnp","page":0,"x":145,"y":178,"width":210,"height":18,"required":true,"confidence":0.9,"source":"saved"},
      {"id":"address","label":"Domiciliu","dataKey":"profile.full_address","page":0,"x":145,"y":206,"width":320,"height":18,"required":true,"confidence":0.88,"source":"saved"},
      {"id":"email","label":"E-mail","dataKey":"profile.email","page":0,"x":145,"y":234,"width":210,"height":18,"required":false,"confidence":0.88,"source":"saved"},
      {"id":"phone","label":"Telefon","dataKey":"profile.phone","page":0,"x":145,"y":262,"width":160,"height":18,"required":false,"confidence":0.88,"source":"saved"},
      {"id":"vehicle_make","label":"Marca vehicul","dataKey":"input.make","page":0,"x":145,"y":340,"width":160,"height":18,"required":true,"confidence":0.9,"source":"saved"},
      {"id":"vehicle_model","label":"Model / tip","dataKey":"input.model","page":0,"x":330,"y":340,"width":150,"height":18,"required":true,"confidence":0.84,"source":"saved"},
      {"id":"vin","label":"Numar identificare VIN","dataKey":"input.vin","page":0,"x":145,"y":368,"width":260,"height":18,"required":true,"confidence":0.9,"source":"saved"},
      {"id":"current_plate","label":"Numar inmatriculare actual","dataKey":"input.current_plate","page":0,"x":145,"y":396,"width":160,"height":18,"required":false,"confidence":0.8,"source":"saved"},
      {"id":"date","label":"Data","dataKey":"system.today","page":0,"x":145,"y":680,"width":120,"height":18,"required":true,"confidence":0.95,"source":"saved"}
    ]'::jsonb,
    '[
      {"key":"make","label":"Marca vehiculului","placeholder":"Dacia"},
      {"key":"model","label":"Model / tip","placeholder":"Logan"},
      {"key":"vin","label":"Numar identificare VIN","placeholder":"VF1..."},
      {"key":"current_plate","label":"Numar inmatriculare actual","placeholder":"CJ 01 ABC"}
    ]'::jsonb
  ),
  (
    'cerere-certificat-fiscal',
    'Cerere certificat fiscal',
    'Directia Taxe si Impozite Locale',
    'Cerere pentru eliberarea certificatului fiscal local.',
    'taxe',
    array['certificat fiscal', 'taxe', 'impozite', 'primarie'],
    'cerere-certificat-fiscal.pdf',
    null,
    '[
      {"id":"full_name","label":"Nume si prenume contribuabil","dataKey":"profile.full_name","page":0,"x":150,"y":160,"width":260,"height":18,"required":true,"confidence":0.92,"source":"saved"},
      {"id":"cnp","label":"CNP","dataKey":"profile.cnp","page":0,"x":150,"y":188,"width":210,"height":18,"required":true,"confidence":0.92,"source":"saved"},
      {"id":"address","label":"Domiciliu fiscal","dataKey":"profile.full_address","page":0,"x":150,"y":216,"width":320,"height":18,"required":true,"confidence":0.88,"source":"saved"},
      {"id":"email","label":"E-mail","dataKey":"profile.email","page":0,"x":150,"y":244,"width":210,"height":18,"required":false,"confidence":0.86,"source":"saved"},
      {"id":"purpose","label":"Scopul solicitarii","dataKey":"input.purpose","page":0,"x":150,"y":314,"width":320,"height":18,"required":true,"confidence":0.84,"source":"saved"},
      {"id":"date","label":"Data","dataKey":"system.today","page":0,"x":150,"y":680,"width":120,"height":18,"required":true,"confidence":0.95,"source":"saved"}
    ]'::jsonb,
    '[
      {"key":"purpose","label":"Scopul solicitarii","placeholder":"Dosar vanzare-cumparare"}
    ]'::jsonb
  ),
  (
    'anaf_tva_certificate',
    'Cerere certificat TVA ANAF',
    'ANAF',
    'Cerere pentru eliberarea certificatului privind TVA pentru achizitii intracomunitare de vehicule.',
    'taxe',
    array['anaf', 'tva', 'certificat tva', 'vehicul', 'spv'],
    'anaf_tva_certificate.pdf',
    null,
    '[
      {"id":"full_name","label":"Denumire/Nume, Prenume","dataKey":"profile.full_name","page":0,"x":150,"y":150,"width":260,"height":18,"required":true,"confidence":0.75,"source":"saved"},
      {"id":"fiscal_code","label":"Cod de identificare fiscala","dataKey":"input.fiscal_code","page":0,"x":150,"y":178,"width":210,"height":18,"required":false,"confidence":0.65,"source":"saved"},
      {"id":"cnp","label":"Cod numeric personal","dataKey":"profile.cnp","page":0,"x":150,"y":206,"width":210,"height":18,"required":true,"confidence":0.75,"source":"saved"},
      {"id":"city","label":"Localitate","dataKey":"profile.city","page":0,"x":150,"y":234,"width":180,"height":18,"required":true,"confidence":0.7,"source":"saved"},
      {"id":"address","label":"Strada","dataKey":"profile.address","page":0,"x":150,"y":262,"width":300,"height":18,"required":true,"confidence":0.7,"source":"saved"},
      {"id":"email","label":"E-mail","dataKey":"profile.email","page":0,"x":150,"y":290,"width":220,"height":18,"required":false,"confidence":0.7,"source":"saved"},
      {"id":"phone","label":"Telefon","dataKey":"profile.phone","page":0,"x":150,"y":318,"width":160,"height":18,"required":false,"confidence":0.7,"source":"saved"},
      {"id":"vehicle_make","label":"Marca vehicul","dataKey":"input.make","page":0,"x":150,"y":374,"width":160,"height":18,"required":true,"confidence":0.68,"source":"saved"},
      {"id":"vehicle_model","label":"Denumire comerciala","dataKey":"input.model","page":0,"x":330,"y":374,"width":150,"height":18,"required":true,"confidence":0.68,"source":"saved"},
      {"id":"vin","label":"Numar identificare/Sasiu","dataKey":"input.vin","page":0,"x":150,"y":402,"width":260,"height":18,"required":true,"confidence":0.7,"source":"saved"},
      {"id":"date","label":"Data","dataKey":"system.today","page":0,"x":150,"y":690,"width":120,"height":18,"required":true,"confidence":0.7,"source":"saved"}
    ]'::jsonb,
    '[
      {"key":"make","label":"Marca vehiculului","placeholder":"Dacia"},
      {"key":"model","label":"Model / denumire comerciala","placeholder":"Logan"},
      {"key":"vin","label":"Numar identificare / sasiu","placeholder":"VF1..."},
      {"key":"fiscal_code","label":"Cod de identificare fiscala","placeholder":"CNP sau CUI"}
    ]'::jsonb
  )
on conflict (slug) do update set
  title = excluded.title,
  institution = excluded.institution,
  description = excluded.description,
  category = excluded.category,
  tags = excluded.tags,
  storage_path = excluded.storage_path,
  source_url = excluded.source_url,
  mapping = excluded.mapping,
  required_inputs = excluded.required_inputs,
  is_active = true,
  updated_at = now();

-- Sample civic news (optional for local demos).
insert into public.news (id, title, summary, published_at)
values
  ('a1000000-0000-4000-8000-000000000001',
   'Program prelungit la Direcția de Evidență',
   'În perioada 20–31 mai, programul cu publicul este extins până la ora 20:00.',
   now() - interval '2 days'),
  ('a1000000-0000-4000-8000-000000000002',
   'Declarația unică — termen final 27 mai',
   'Persoanele fizice cu venituri independente trebuie să depună Declarația Unică până miercuri.',
   now() - interval '5 days')
on conflict (id) do nothing;

-- ════════════════════════════════════════════════════════════════
--  Tipizatul.eu integration (Phase 1)
--  Additive, idempotent. Extends pdf_forms and adds `procedures`.
--  Source: https://github.com/iamandiradu/tipizatul.eu (MIT)
-- ════════════════════════════════════════════════════════════════

-- ─── pdf_forms extensions ───────────────────────────────────────
alter table public.pdf_forms add column if not exists drive_file_id text;
alter table public.pdf_forms add column if not exists original_drive_file_id text;
alter table public.pdf_forms add column if not exists acroform_origin text
  check (acroform_origin in ('original','generated') or acroform_origin is null);
alter table public.pdf_forms add column if not exists procedure_id text;
alter table public.pdf_forms add column if not exists edirect_doc_id text;
alter table public.pdf_forms add column if not exists county text;
alter table public.pdf_forms add column if not exists organization text;
-- 'manual' for hand-curated demo rows; 'tipizatul' for ETL-imported rows.
alter table public.pdf_forms add column if not exists source text not null default 'manual';
-- tipizatul Template.id (firestore doc id). Unique per source.
alter table public.pdf_forms add column if not exists source_template_id text;
alter table public.pdf_forms add column if not exists source_version int;
-- Raw TemplateField[] as received (incl. detectorConfidence) so we can
-- re-derive `mapping` without re-pulling from Firestore.
alter table public.pdf_forms add column if not exists fields_raw jsonb;
alter table public.pdf_forms add column if not exists vote_count int;
alter table public.pdf_forms add column if not exists synced_at timestamptz;

create index if not exists pdf_forms_procedure_id_idx on public.pdf_forms (procedure_id);
create index if not exists pdf_forms_drive_file_id_idx on public.pdf_forms (drive_file_id);
create index if not exists pdf_forms_county_idx on public.pdf_forms (county);
create unique index if not exists pdf_forms_source_template_uidx
  on public.pdf_forms (source, source_template_id)
  where source_template_id is not null;

-- ─── procedures ─────────────────────────────────────────────────
-- Tipizatul procedures.json feed (~3.5k Romanian administrative procedures).
-- Stored verbatim (informational fields + document list) so ClaudIA can
-- compose action plans on top of it.
create extension if not exists pg_trgm;

create table if not exists public.procedures (
  procedure_id      text primary key,
  title             text not null,
  institution       text,
  county            text,                       -- full RO name e.g. 'Cluj', NULL = national
  city              text,
  informational     boolean not null default false,
  fields            jsonb not null default '{}'::jsonb,
  documents         jsonb not null default '[]'::jsonb,
  output_documents  jsonb not null default '[]'::jsonb,
  laws              jsonb not null default '[]'::jsonb,
  built_at          timestamptz,
  synced_at         timestamptz not null default now()
);
create index if not exists procedures_county_idx on public.procedures (county);
create index if not exists procedures_institution_idx on public.procedures (institution);
create index if not exists procedures_title_trgm_idx
  on public.procedures using gin (title gin_trgm_ops);

alter table public.procedures disable row level security;

-- ─── chat_conversations ───────────────────────────────────────
-- Persisted ClaudIA chat threads per user.
create table if not exists public.chat_conversations (
  id              uuid primary key default gen_random_uuid(),
  user_id         text not null,
  title           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists chat_conversations_user_updated_idx
  on public.chat_conversations (user_id, updated_at desc);
alter table public.chat_conversations disable row level security;

-- ─── chat_messages ──────────────────────────────────────────────
create table if not exists public.chat_messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.chat_conversations(id) on delete cascade,
  role             text not null check (role in ('user', 'assistant', 'system', 'steps')),
  content          text not null default '',
  metadata         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now()
);
create index if not exists chat_messages_conversation_created_idx
  on public.chat_messages (conversation_id, created_at);
alter table public.chat_messages disable row level security;
