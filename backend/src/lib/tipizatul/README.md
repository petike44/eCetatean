# Tipizatul.eu integration

Imports the open-source Romanian government form + procedure dataset from
[tipizatul.eu](https://github.com/iamandiradu/tipizatul.eu) (MIT) into our
`pdf_forms` / `procedures` tables so ClaudIA can build life-event action
plans and auto-fill PDFs.

**Attribution:** the upstream catalog is MIT-licensed. Our caching of PDFs
and metadata IS the rate-limit / courtesy strategy — keep attribution in
the UI.

## Three-layer architecture

| Layer | Source | Where it lands | Phase |
|---|---|---|---|
| CATALOG (metadata) | Firestore `catalog/index` (gzipped) + `templates/{id}` | `pdf_forms` (source='tipizatul') | 1 ✅ |
| PROCEDURES | `https://tipizatul-eu.vercel.app/procedures.json` | `procedures` table | 2 (pending) |
| PDF BINARIES | Google Drive (driveFileId) | `pdf-forms` storage bucket, lazy on first request | 3 (pending) |

## Running the catalog ETL (Phase 1)

Apply the schema migration first (idempotent — safe to re-run):

```sh
# Open Supabase → SQL Editor → run backend/schema.sql
```

Then sync:

```sh
cd backend

# Smoke-test against 20 templates
npm run sync:tipizatul -- --limit=20

# Full sync (~3500 templates, skips unchanged versions)
npm run sync:tipizatul

# Force re-upsert even for unchanged versions
npm run sync:tipizatul -- --force
```

Requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in
`backend/.env.local`. Firestore reads are anonymous (verified against the
live `tipizatul` project — `catalog/index` and `templates/*` are
publicly readable).

## What gets stored

Each row in `pdf_forms` gets:

- `source='tipizatul'`, `source_template_id`, `source_version` — for
  idempotent re-syncs and conflict resolution.
- `drive_file_id`, `original_drive_file_id` — for the Phase-3 Drive
  proxy + storage cache (`storage_path` is pre-set to
  `tipizatul/<driveFileId>.pdf`).
- `acroform_origin` — `'original'` means the upstream PDF already had
  named AcroForm fields (high trust, can auto-fill silently);
  `'generated'` means tipizatul auto-detected fields and labels are
  often noisy (`detectorConfidence` lives in `fields_raw`). Phase 4 will
  route `'generated'` rows through a `needs_review` UX rather than
  silently filling them.
- `fields_raw` — the verbatim `TemplateField[]` from upstream
  (including the undocumented `detectorConfidence` float), so the
  AI-mapping endpoint (Phase 5) can re-derive `mapping` without
  re-pulling from Firestore.
- `mapping` — `PdfAutofillField[]` with `acroFieldName` set, but
  `dataKey` defaulted to `input.<safeId>` (NOT `profile.X`). Auto-fill
  by label is the exception, not the rule — phases 5/6 will assign
  profile keys via AI proposal + human review.

## Drive proxy credentials (Phase 3 — placeholders only for now)

`backend/.env.example` includes a `GDRIVE_SA_EMAIL` / `GDRIVE_SA_PRIVATE_KEY`
block. Required only once Phase 3 lands — Phase 1 (catalog sync) does
NOT need them.

## Verified live-data facts (as of integration)

- `catalog/index` and `templates/*` are anonymously readable via
  Firestore REST. No auth header.
- `catalog/index.encoding === 'gzip+json'`, `compressed` is bytes.
- `county` is the full Romanian name (`'Cluj'`, `'Giurgiu'`), NOT a
  county code.
- Many templates are `acroFormOrigin='generated'` with noisy
  auto-detected labels + a `detectorConfidence: number` field that is
  not in the upstream TS type but IS in the wire data.

## Pipeline B (the legacy `generatePDF` switch in `pdf-templates.ts`)
stays alive indefinitely as a fallback. Tipizatul-backed forms only
replace it scenario-by-scenario once they reach parity.
