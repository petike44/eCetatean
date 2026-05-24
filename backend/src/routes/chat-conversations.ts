import { Hono } from 'hono'
import { requireAuth } from '../middleware/auth'
import { supabaseAdmin, isSupabaseConfigured } from '../lib/supabase'
import type {
  ChatConversation,
  ChatConversationWithMessages,
  ChatMessageRow,
} from '../types'

export const chatConversationsRoute = new Hono()

const mockConversations = new Map<string, ChatConversation>()
const mockMessages = new Map<string, ChatMessageRow[]>()

function isMockId(id: string): boolean {
  return id.startsWith('mock-')
}

function makeMockConversation(userId: string, title: string | null): ChatConversation {
  const now = new Date().toISOString()
  return {
    id: `mock-${Date.now()}`,
    user_id: userId,
    title,
    created_at: now,
    updated_at: now,
  }
}

// Returns null when not found; falls back to mock store on Supabase error.
async function getConversationForUser(
  id: string,
  userId: string
): Promise<ChatConversation | null> {
  const mock = mockConversations.get(id)
  if (mock) return mock.user_id === userId ? mock : null

  if (isMockId(id)) return null

  try {
    const { data, error } = await supabaseAdmin
      .from('chat_conversations')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw error
    return data as ChatConversation | null
  } catch {
    return null
  }
}

// POST /api/chat/conversations
chatConversationsRoute.post('/', requireAuth, async (c) => {
  const userId = c.get('userId')

  let body: { title?: string }
  try {
    body = await c.req.json()
  } catch {
    body = {}
  }

  const title = body.title?.trim() || null

  if (!isSupabaseConfigured) {
    const conv = makeMockConversation(userId, title)
    mockConversations.set(conv.id, conv)
    mockMessages.set(conv.id, [])
    return c.json({ success: true, data: conv })
  }

  const { data, error } = await supabaseAdmin
    .from('chat_conversations')
    .insert({ user_id: userId, title })
    .select()
    .single()

  if (error) {
    console.error('chat_conversations insert:', error.message, '— using mock fallback')
    const conv = makeMockConversation(userId, title)
    mockConversations.set(conv.id, conv)
    mockMessages.set(conv.id, [])
    return c.json({ success: true, data: conv })
  }

  return c.json({ success: true, data: data as ChatConversation })
})

// GET /api/chat/conversations
chatConversationsRoute.get('/', requireAuth, async (c) => {
  const userId = c.get('userId')

  const mockList = [...mockConversations.values()]
    .filter((conv) => conv.user_id === userId)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))

  if (!isSupabaseConfigured) {
    return c.json({ success: true, data: mockList })
  }

  const { data, error } = await supabaseAdmin
    .from('chat_conversations')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('chat_conversations list:', error.message, '— using mock fallback')
    return c.json({ success: true, data: mockList })
  }

  const dbIds = new Set((data as ChatConversation[]).map((c) => c.id))
  const merged = [
    ...mockList.filter((m) => !dbIds.has(m.id)),
    ...(data as ChatConversation[]),
  ].sort((a, b) => b.updated_at.localeCompare(a.updated_at))

  return c.json({ success: true, data: merged })
})

// GET /api/chat/conversations/:id
chatConversationsRoute.get('/:id', requireAuth, async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')

  const conv = await getConversationForUser(id, userId)
  if (!conv) {
    return c.json({ success: false, error: 'Conversație negăsită' }, 404)
  }

  if (isMockId(id) || mockConversations.has(id)) {
    const messages = mockMessages.get(id) ?? []
    const result: ChatConversationWithMessages = { ...conv, messages }
    return c.json({ success: true, data: result })
  }

  try {
    const { data: messages, error } = await supabaseAdmin
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })

    if (error) throw error

    const result: ChatConversationWithMessages = {
      ...conv,
      messages: (messages ?? []) as ChatMessageRow[],
    }
    return c.json({ success: true, data: result })
  } catch (err) {
    console.error('chat_messages list:', err, '— returning empty messages')
    return c.json({ success: true, data: { ...conv, messages: [] } })
  }
})

// PATCH /api/chat/conversations/:id
chatConversationsRoute.patch('/:id', requireAuth, async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')

  let body: { title?: string }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ success: false, error: 'Request body invalid' }, 400)
  }

  const title = body.title?.trim()
  if (!title) {
    return c.json({ success: false, error: 'Titlul este obligatoriu' }, 400)
  }

  const conv = await getConversationForUser(id, userId)
  if (!conv) {
    return c.json({ success: false, error: 'Conversație negăsită' }, 404)
  }

  const updated_at = new Date().toISOString()

  if (isMockId(id) || mockConversations.has(id)) {
    const next = { ...conv, title, updated_at }
    mockConversations.set(id, next)
    return c.json({ success: true, data: next })
  }

  const { data, error } = await supabaseAdmin
    .from('chat_conversations')
    .update({ title, updated_at })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    console.error('chat_conversations patch:', error.message, '— using mock fallback')
    const next = { ...conv, title, updated_at }
    mockConversations.set(id, next)
    return c.json({ success: true, data: next })
  }

  return c.json({ success: true, data: data as ChatConversation })
})

// DELETE /api/chat/conversations/:id
chatConversationsRoute.delete('/:id', requireAuth, async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')

  const conv = await getConversationForUser(id, userId)
  if (!conv) {
    return c.json({ success: false, error: 'Conversație negăsită' }, 404)
  }

  if (isMockId(id) || mockConversations.has(id)) {
    mockConversations.delete(id)
    mockMessages.delete(id)
    return c.json({ success: true, data: true })
  }

  const { error } = await supabaseAdmin
    .from('chat_conversations')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) {
    console.error('chat_conversations delete:', error.message)
    return c.json({ success: false, error: 'Nu am putut șterge conversația' }, 500)
  }

  return c.json({ success: true, data: true })
})

// POST /api/chat/conversations/:id/messages
chatConversationsRoute.post('/:id/messages', requireAuth, async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')

  let body: {
    messages?: Array<{
      role: ChatMessageRow['role']
      content: string
      metadata?: Record<string, unknown>
    }>
  }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ success: false, error: 'Request body invalid' }, 400)
  }

  const incoming = body.messages
  if (!incoming?.length) {
    return c.json({ success: false, error: 'Mesajele lipsesc' }, 400)
  }

  const conv = await getConversationForUser(id, userId)
  if (!conv) {
    return c.json({ success: false, error: 'Conversație negăsită' }, 404)
  }

  const updated_at = new Date().toISOString()

  if (isMockId(id) || mockConversations.has(id)) {
    const existing = mockMessages.get(id) ?? []
    const rows: ChatMessageRow[] = incoming.map((m, i) => ({
      id: `mock-msg-${Date.now()}-${i}`,
      conversation_id: id,
      role: m.role,
      content: m.content,
      metadata: m.metadata ?? {},
      created_at: new Date().toISOString(),
    }))
    mockMessages.set(id, [...existing, ...rows])
    mockConversations.set(id, { ...conv, updated_at })
    return c.json({ success: true, data: rows })
  }

  const rows = incoming.map((m) => ({
    conversation_id: id,
    role: m.role,
    content: m.content,
    metadata: m.metadata ?? {},
  }))

  const { data, error } = await supabaseAdmin
    .from('chat_messages')
    .insert(rows)
    .select()

  if (error) {
    console.error('chat_messages insert:', error.message, '— using mock fallback')
    const mockRows: ChatMessageRow[] = incoming.map((m, i) => ({
      id: `mock-msg-${Date.now()}-${i}`,
      conversation_id: id,
      role: m.role,
      content: m.content,
      metadata: m.metadata ?? {},
      created_at: new Date().toISOString(),
    }))
    const existing = mockMessages.get(id) ?? []
    mockMessages.set(id, [...existing, ...mockRows])
    mockConversations.set(id, { ...conv, updated_at })
    return c.json({ success: true, data: mockRows })
  }

  await supabaseAdmin
    .from('chat_conversations')
    .update({ updated_at })
    .eq('id', id)
    .eq('user_id', userId)

  return c.json({ success: true, data: data as ChatMessageRow[] })
})
