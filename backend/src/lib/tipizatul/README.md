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
| PROCEDURES | `https://tipizatul-eu.vercel.app/procedures.json` | `procedures` table | 2 ✅ |
| PDF BINARIES | Google Drive (driveFileId) | `pdf-forms` storage bucket, lazy on first request | 3 ✅ |

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

## Running the procedures ETL (Phase 2)

Pulls `procedures.json` (a static feed, ~3.5k national rows). No
county filter at write time — the full national table is imported and
filtering happens at query time so non-Cluj users are trivial later.

```sh
cd backend

# Smoke test
npm run sync:tipizatul-procedures -- --limit=50

# Full sync
npm run sync:tipizatul-procedures
```

The feed itself is a public HTTPS endpoint — no Firestore auth needed.
`document[*].downloadUrl` is stored verbatim; Phase 6 will resolve
URLs to fillable templates via `eDirectDocId → pdf_forms.edirect_doc_id`
and lazily cache the binaries through the Drive proxy.

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

## PDF binary cache (Phase 3)

When a tipizatul-sourced `pdf_forms` row is requested, `getPdfBytes`:

1. Looks in `pdf-forms/tipizatul/<driveFileId>.pdf` in Supabase Storage.
2. On miss: mints a JWT for the service account, exchanges it at
   `oauth2.googleapis.com` for an `access_token` (scope
   `drive.readonly`), calls `GET drive/v3/files/<id>?alt=media`, and
   writes the bytes back to the same storage path.
3. Subsequent requests serve from storage.

The Drive proxy is **env-gated**. If `GDRIVE_SA_EMAIL` and
`GDRIVE_SA_PRIVATE_KEY` are missing, fetches throw
`DriveCredentialsMissingError` and the caller falls back to the
existing placeholder PDF — the server does NOT crash on boot.

PEM accepts either real newlines or `\n` escapes. Surrounding quotes
are stripped.

### Live verification (manual)

Once SA credentials are in `backend/.env.local`:

```sh
npx tsx --env-file=backend/.env.local backend/scripts/verify-drive-proxy.ts
# or with a custom file id:
npx tsx --env-file=backend/.env.local backend/scripts/verify-drive-proxy.ts <driveFileId>
```

Expects to see `%PDF?  yes ✔`. The script is committed but is NOT run
by `npm test` or any CI.

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
