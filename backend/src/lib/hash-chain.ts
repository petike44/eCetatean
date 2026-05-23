import { createHash } from 'crypto'
import { supabaseAdmin } from './supabase'
import type { AuditActionType } from '../types'

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex')
}

interface WriteAuditEntryParams {
  userId: string
  action: string
  actionType: AuditActionType
  data?: Record<string, unknown>
}

export async function writeAuditEntry({
  userId,
  action,
  actionType,
  data = {},
}: WriteAuditEntryParams): Promise<void> {
  const { data: lastEntry } = await supabaseAdmin
    .from('audit_log')
    .select('record_hash')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const previousHash = lastEntry?.record_hash ?? 'GENESIS'
  const timestamp = new Date().toISOString()

  const dataHash = sha256(
    JSON.stringify({ action, actionType, timestamp, data })
  )

  const recordHash = sha256(previousHash + dataHash)

  const { error } = await supabaseAdmin.from('audit_log').insert({
    user_id: userId,
    action,
    action_type: actionType,
    data,
    data_hash: dataHash,
    previous_hash: previousHash,
    record_hash: recordHash,
  })

  if (error) {
    // Non-blocking — log and continue
    console.error('Audit log write error:', error.message)
  }
}

export function verifyHashChain(
  entries: Array<{
    data_hash: string
    previous_hash: string
    record_hash: string
  }>
): boolean {
  for (let i = 1; i < entries.length; i++) {
    const expectedRecordHash = sha256(
      entries[i - 1].record_hash + entries[i].data_hash
    )
    if (expectedRecordHash !== entries[i].record_hash) {
      return false
    }
    if (entries[i].previous_hash !== entries[i - 1].record_hash) {
      return false
    }
  }
  return true
}
