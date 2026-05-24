#!/usr/bin/env node
// Pulls the tipizatul.eu procedures.json feed (~3.5k Romanian
// administrative procedures) into the `procedures` table.
//
// Usage:
//   npm run sync:tipizatul-procedures
//   npm run sync:tipizatul-procedures -- --limit=50

import { syncProcedures } from '../src/lib/tipizatul/procedures-etl'

function parseArg(name: string): string | undefined {
  const flag = `--${name}=`
  const hit = process.argv.find((a) => a.startsWith(flag))
  return hit ? hit.slice(flag.length) : undefined
}

async function main(): Promise<void> {
  const limit = parseArg('limit') ? Number(parseArg('limit')) : undefined

  console.log('▶ tipizatul procedures sync starting...')
  if (limit) console.log(`  limit=${limit}`)

  const result = await syncProcedures({
    limit,
    onProgress: (done, total) => {
      if (done % 400 === 0 || done === total) {
        console.log(`  [${done}/${total}]`)
      }
    },
  })

  console.log('\n✔ done')
  console.log(`  feed:       ${result.feedUrl}`)
  console.log(`  built at:   ${result.builtAt ?? 'unknown'}`)
  console.log(`  in feed:    ${result.totalInFeed}`)
  console.log(`  upserted:   ${result.upserted}`)
  console.log(`  skipped:    ${result.skipped} (missing procedureId/title)`)
  console.log(`  errors:     ${result.errors.length}`)
  for (const e of result.errors.slice(0, 5)) console.log(`    - ${e}`)
  if (result.errors.length) process.exitCode = 1
}

main().catch((err) => {
  console.error('sync failed:', err)
  process.exit(1)
})
