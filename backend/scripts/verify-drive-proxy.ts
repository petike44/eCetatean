#!/usr/bin/env node
// One-off live verification of the Drive proxy. NOT run by CI.
//
// Usage (after pasting GDRIVE_SA_EMAIL + GDRIVE_SA_PRIVATE_KEY into
// backend/.env.local):
//
//   npx tsx --env-file=.env.local scripts/verify-drive-proxy.ts
//   npx tsx --env-file=.env.local scripts/verify-drive-proxy.ts <driveFileId>
//
// Defaults to the Phase-0 sample file id provided by you.

import { fetchDrivePdf } from '../src/lib/tipizatul/drive-proxy'

const DEFAULT_ID = '17RMMNCijCSxdDzL7JANKIH6RQCnu1HVY'

async function main(): Promise<void> {
  const id = process.argv[2] ?? DEFAULT_ID
  console.log(`▶ verifying SA→Drive read of ${id}...`)
  const bytes = await fetchDrivePdf(id)
  const header = Array.from(bytes.slice(0, 8))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(' ')
  const looksLikePdf = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46
  console.log(`  size:        ${bytes.byteLength} bytes`)
  console.log(`  first 8 hex: ${header}`)
  console.log(`  %PDF?        ${looksLikePdf ? 'yes ✔' : 'NO — content is not a PDF'}`)
  if (!looksLikePdf) process.exitCode = 1
}

main().catch((err) => {
  console.error('verification failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
