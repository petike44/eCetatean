import { Hono } from 'hono'
import { requireAuth } from '../middleware/auth'
import { writeAuditEntry } from '../lib/hash-chain'
import { generatePDF } from '../lib/pdf-templates'
import { supabaseAdmin } from '../lib/supabase'
import type { PDFGenerationRequest } from '../types'

export const pdfRoute = new Hono()

pdfRoute.post('/generate', requireAuth, async (c) => {
  const userId = c.get('userId')

  let body: PDFGenerationRequest
  try {
    body = await c.req.json<PDFGenerationRequest>()
  } catch {
    return c.json({ success: false, error: 'Request body invalid' }, 400)
  }

  const { form_type, profile, additional_data = {} } = body

  if (!form_type) {
    return c.json(
      { success: false, error: 'Tipul formularului este obligatoriu' },
      400
    )
  }

  let profileData = profile
  if (!profileData?.full_name) {
    const { data: dbProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    if (dbProfile) profileData = { ...dbProfile, ...profile }
  }

  try {
    const pdfBuffer = await generatePDF(
      form_type,
      profileData ?? {},
      additional_data
    )

    writeAuditEntry({
      userId,
      action: `Formular generat: ${form_type}`,
      actionType: 'pdf_generated',
      data: { form_type },
    })

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${form_type}_${Date.now()}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (err) {
    console.error('PDF generation error:', err)
    return c.json(
      { success: false, error: 'Eroare la generarea PDF-ului' },
      500
    )
  }
})
