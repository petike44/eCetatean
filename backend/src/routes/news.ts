import { Hono } from 'hono'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { requireAuth } from '../middleware/auth'
import { requireAdmin } from '../middleware/admin'
import { supabaseAdmin, isSupabaseConfigured } from '../lib/supabase'
import { isGeminiConfigured } from '../lib/gemini-claudia'

export const newsRoute = new Hono()

newsRoute.get('/', async (c) => {
  if (!isSupabaseConfigured) {
    return c.json({ success: true, data: [] })
  }

  const { data, error } = await supabaseAdmin
    .from('news')
    .select('id, title, summary, body, published_at, created_at')
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('news fetch error:', error.message)
    return c.json({ success: false, error: 'Eroare la preluarea știrilor' }, 500)
  }

  return c.json({ success: true, data: data ?? [] })
})

newsRoute.post('/', requireAuth, requireAdmin, async (c) => {
  let body: {
    title?: string
    summary?: string
    body?: string | null
    publish?: boolean
  }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ success: false, error: 'Request body invalid' }, 400)
  }

  const title = body.title?.trim()
  const summary = body.summary?.trim()
  if (!title || !summary) {
    return c.json({ success: false, error: 'Titlul și rezumatul sunt obligatorii' }, 400)
  }

  if (!isSupabaseConfigured) {
    return c.json({
      success: true,
      data: {
        id: crypto.randomUUID(),
        title,
        summary,
        body: body.body?.trim() || null,
        published_at: body.publish !== false ? new Date().toISOString() : null,
        created_at: new Date().toISOString(),
      },
    })
  }

  const row = {
    title,
    summary,
    body: body.body?.trim() || null,
    published_at: body.publish !== false ? new Date().toISOString() : null,
  }

  const { data, error } = await supabaseAdmin
    .from('news')
    .insert(row)
    .select('id, title, summary, body, published_at, created_at')
    .single()

  if (error) {
    console.error('news insert error:', error.message)
    return c.json({ success: false, error: 'Eroare la publicarea știrii' }, 500)
  }

  return c.json({ success: true, data })
})

newsRoute.post('/generate', requireAuth, requireAdmin, async (c) => {
  let body: { topic?: string; publish?: boolean }
  try {
    body = await c.req.json()
  } catch {
    body = {}
  }

  const topic =
    body.topic?.trim() ||
    'Anunț civic pentru cetățenii din Cluj-Napoca: termene, servicii publice sau schimbări utile'

  if (!isGeminiConfigured()) {
    const fallback = {
      title: 'Actualizare servicii civice — Cluj-Napoca',
      summary:
        'Primăria și instituțiile partenere reamintesc cetățenilor să verifice termenele pentru acte și taxe locale. Detaliile complete sunt disponibile pe site-urile oficiale.',
      body: `Subiect solicitat: ${topic}. (Generat local — configurează GEMINI_API_KEY pentru text AI.)`,
    }
    if (!isSupabaseConfigured) {
      return c.json({
        success: true,
        data: {
          ...fallback,
          id: crypto.randomUUID(),
          published_at: body.publish ? new Date().toISOString() : null,
          created_at: new Date().toISOString(),
          generated: true,
        },
      })
    }
    const { data, error } = await supabaseAdmin
      .from('news')
      .insert({
        ...fallback,
        published_at: body.publish ? new Date().toISOString() : null,
      })
      .select('id, title, summary, body, published_at, created_at')
      .single()
    if (error) {
      return c.json({ success: false, error: 'Eroare la salvarea știrii' }, 500)
    }
    return c.json({ success: true, data: { ...data, generated: true } })
  }

  const apiKey = process.env.GEMINI_API_KEY!
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-lite',
    generationConfig: { responseMimeType: 'application/json' },
  })

  const prompt = `Generează o știre civică scurtă în română pentru cetățenii din Cluj-Napoca.
Subiect: ${topic}
Răspunde DOAR cu JSON valid (fără markdown): {"title":"...","summary":"...","body":"..."}
- title: max 100 caractere
- summary: 1-2 propoziții, factual
- body: 2-4 propoziții cu detalii utile
Nu inventa date exacte dacă nu ești sigur; folosește formulări generale ("în perioada următoare", "verificați site-ul oficial").`

  try {
    const result = await model.generateContent(prompt)
    const raw = result.response.text()
    const parsed = JSON.parse(raw) as { title?: string; summary?: string; body?: string }
    const title = parsed.title?.trim() || 'Noutate civică'
    const summary = parsed.summary?.trim() || 'Informații utile pentru cetățeni.'
    const articleBody = parsed.body?.trim() || null

    if (!isSupabaseConfigured) {
      return c.json({
        success: true,
        data: {
          id: crypto.randomUUID(),
          title,
          summary,
          body: articleBody,
          published_at: body.publish ? new Date().toISOString() : null,
          created_at: new Date().toISOString(),
          generated: true,
        },
      })
    }

    const { data, error } = await supabaseAdmin
      .from('news')
      .insert({
        title,
        summary,
        body: articleBody,
        published_at: body.publish ? new Date().toISOString() : null,
      })
      .select('id, title, summary, body, published_at, created_at')
      .single()

    if (error) {
      return c.json({ success: false, error: 'Eroare la salvarea știrii generate' }, 500)
    }

    return c.json({ success: true, data: { ...data, generated: true } })
  } catch (err) {
    console.error('news generate error:', err)
    return c.json(
      { success: false, error: 'Nu am putut genera știrea cu AI. Încearcă din nou sau adaugă manual.' },
      500
    )
  }
})

newsRoute.delete('/:id', requireAuth, requireAdmin, async (c) => {
  const id = c.req.param('id')
  if (!isSupabaseConfigured) {
    return c.json({ success: true, data: true })
  }

  const { error } = await supabaseAdmin.from('news').delete().eq('id', id)
  if (error) {
    return c.json({ success: false, error: 'Eroare la ștergere' }, 500)
  }
  return c.json({ success: true, data: true })
})
