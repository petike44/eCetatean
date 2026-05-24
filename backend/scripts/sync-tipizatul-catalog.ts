#!/usr/bin/env node
// Re-runnable ETL: pulls the tipizatul.eu Firestore catalog into pdf_forms.
//
// Usage:
//   npm run sync:tipizatul                  # full sync
//   npm run sync:tipizatul -- --limit=20    # smoke test
//   npm run sync:tipizatul -- --force       # ignore version-skip cache
//
// Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env (loaded by
// `tsx --env-file=.env.local` via the npm script).

import { syncCatalog } from '../src/lib/tipizatul/catalog-etl'

function parseArg(name: string): string | undefined {
  const flag = `--${name}=`
  const hit = process.argv.find((a) => a.startsWith(flag))
  return hit ? hit.slice(flag.length) : undefined
}

async function main(): Promise<void> {
  const limit = parseArg('limit') ? Number(parseArg('limit')) : undefined
  const force = process.argv.includes('--force')

  console.log('▶ tipizatul catalog sync starting...')
  if (limit) console.log(`  limit=${limit}`)
  if (force) console.log('  force=true (re-upsert all)')

  const result = await syncCatalog({
    limit,
    skipUnchanged: !force,
    onProgress: (done, total, slug) => {
      if (done % 25 === 0 || done === total) {
        console.log(`  [${done}/${total}] ${slug}`)
      }
    },
  })

  console.log('\n✔ done')
  console.log(`  index size:  ${result.totalInIndex}`)
  console.log(`  fetched:     ${result.fetched}`)
  console.log(`  upserted:    ${result.upserted}`)
  console.log(`  skipped:     ${result.skipped} (already at latest version)`)
  console.log(`  errors:      ${result.errors.length}`)
  if (result.errors.length) {
    for (const e of result.errors.slice(0, 10)) {
      console.log(`    - ${e.id}: ${e.error}`)
    }
    if (result.errors.length > 10) {
      console.log(`    ... and ${result.errors.length - 10} more`)
    }
    process.exitCode = 1
  }
}

main().catch((err) => {
  console.error('sync failed:', err)
  process.exit(1)
})
