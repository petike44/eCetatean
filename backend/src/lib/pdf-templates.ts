// ────────────────────────────────────────────────────────────
// PDF TEMPLATE GENERATION
// ────────────────────────────────────────────────────────────
// cerere_drpciv uses pdf-lib to overlay text on the real PDF.
// All other forms use @pdfme/generator on a blank canvas.
// ────────────────────────────────────────────────────────────

import { generate } from '@pdfme/generator'
import { BLANK_PDF } from '@pdfme/common'
import type { Template } from '@pdfme/common'
import type { FormType } from '../types'
import { supabaseAdmin } from './supabase'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import * as fs from 'fs'
import * as path from 'path'

const FONT_SIZE = 11
const LINE_HEIGHT = 8

function buildSimpleTextTemplate(fields: string[], basePdf: string | Uint8Array | ArrayBuffer = BLANK_PDF): Template {
  return {
    basePdf,
    schemas: [
      fields.map((field, index) => ({
        name: field,
        type: 'text',
        position: { x: 20, y: 30 + index * LINE_HEIGHT },
        width: 170,
        height: 6,
        fontSize: FONT_SIZE,
        fontColor: '#000000',
      })),
    ],
  } as Template
}

interface ProfileData {
  full_name?: string | null
  cnp?: string | null
  address?: string | null
  city?: string | null
  email?: string | null
  phone?: string | null
  buletin_series?: string | null
  buletin_number?: string | null
}

export async function generatePDF(
  formType: FormType,
  profile: ProfileData,
  additionalData: Record<string, string> = {}
): Promise<Buffer> {
  const resolvedType: FormType =
    formType === 'anaf_tva_certificate'
      ? 'anaf_tva_certificate_request'
      : formType

  const today = new Date().toLocaleDateString('ro-RO')

  let inputs: Record<string, string>[] = []

  switch (resolvedType) {
    case 'sale_contract':
      inputs = [
        {
          'Vânzător — Nume': additionalData.seller_name ?? 'Completați manual',
          'Vânzător — CNP': additionalData.seller_cnp ?? '_______________',
          'Cumpărător — Nume': profile.full_name ?? '_______________',
          'Cumpărător — CNP': profile.cnp ?? '_______________',
          'Cumpărător — Adresă': `${profile.address ?? ''}, ${profile.city ?? 'Cluj-Napoca'}`,
          'Vehicul — Marcă și Model': additionalData.vehicle ?? '_______________',
          'Vehicul — Nr. Înmatriculare': additionalData.plate_number ?? '_______________',
          'Preț vânzare (RON)': additionalData.price ?? '_______________',
          Data: today,
          'Locul încheierii': 'Cluj-Napoca',
          'Semnătură vânzător': '_______________',
          'Semnătură cumpărător': '_______________',
        },
      ]
      break

    case 'viza_flotant':
      inputs = [
        {
          'Subsemnatul/a': profile.full_name ?? '_______________',
          CNP: profile.cnp ?? '_______________',
          'Identificat cu BI/CI seria': `${profile.buletin_series ?? '___'} nr. ${profile.buletin_number ?? '___________'}`,
          'Solicit înscrierea reședinței la adresa':
            additionalData.new_address ?? '_______________',
          'Județul/Sectorul': 'Cluj',
          'Perioada solicitată': 'Permanentă',
          Data: today,
          Semnătură: '_______________',
        },
      ]
      break

    case 'transcription':
      inputs = [
        {
          'Solicitant — Nume': profile.full_name ?? '_______________',
          'Solicitant — CNP': profile.cnp ?? '_______________',
          'Solicitant — Adresă': `${profile.address ?? ''}, ${profile.city ?? 'Cluj-Napoca'}`,
          'Vehicul — Marcă': additionalData.make ?? '_______________',
          'Vehicul — Model': additionalData.model ?? '_______________',
          'Vehicul — An fabricație': additionalData.year ?? '_______________',
          'Nr. Înmatriculare curent': additionalData.plate_number ?? '_______________',
          'Număr de identificare (VIN)': additionalData.vin ?? '_______________',
          Data: today,
          Semnătură: '_______________',
        },
      ]
      break

    case 'impozit_auto':
      inputs = [
        {
          'Contribuabil — Nume': profile.full_name ?? '_______________',
          'Contribuabil — CNP': profile.cnp ?? '_______________',
          'Contribuabil — Adresă': `${profile.address ?? ''}, ${profile.city ?? 'Cluj-Napoca'}`,
          'Vehicul — Marcă și Model':
            `${additionalData.make ?? ''} ${additionalData.model ?? ''}`.trim() ||
            '_______________',
          'Nr. Înmatriculare': additionalData.plate_number ?? '_______________',
          'Cilindree (cc)': additionalData.engine_cc ?? '_______________',
          Combustibil: additionalData.fuel_type ?? '_______________',
          'An fabricație': additionalData.year ?? '_______________',
          'Data dobândirii': additionalData.purchase_date ?? '_______________',
          'Data depunerii': today,
          Semnătură: '_______________',
        },
      ]
      break

    case 'doctor_transfer':
      inputs = [
        {
          'Pacient — Nume': profile.full_name ?? '_______________',
          'Pacient — CNP': profile.cnp ?? '_______________',
          'Nr. Card CNAS': additionalData.cnas_number ?? '_______________',
          'Medic nou — Nume': additionalData.new_doctor ?? '_______________',
          'Cabinet — Adresă': additionalData.clinic_address ?? '_______________',
          'Data transferului': today,
          'Semnătură pacient': '_______________',
        },
      ]
      break

    case 'scholarship_certificate':
      inputs = [
        {
          'Subsemnatul/a': profile.full_name ?? '_______________',
          CNP: profile.cnp ?? '_______________',
          'Domiciliat(ă) în': `${profile.address ?? ''}, ${profile.city ?? 'Cluj-Napoca'}`,
          'Solicit certificat pentru': 'Dosarul de bursă universitară',
          Universitatea: additionalData.university ?? '_______________',
          Facultatea: additionalData.faculty ?? '_______________',
          'An de studiu': additionalData.year ?? '_______________',
          Data: today,
          Semnătură: '_______________',
        },
      ]
      break

    case 'anaf_tva_certificate_request':
      // ANAF form for TVA certificate on intra-EU transport purchases
      inputs = [
        {
          'Denumire/Nume, Prenume': profile.full_name ?? '_______________',
          'Cod de identificare fiscală': additionalData.fiscal_code ?? '_______________',
          'Cod numeric personal': profile.cnp ?? '_______________',
          'Cod de înregistrare în scopuri TVA': additionalData.tva_code ?? '_____',
          // Address fields
          Județ: additionalData.county ?? 'Cluj',
          Localitate: profile.city ?? 'Cluj-Napoca',
          Strada: profile.address ?? '_______________',
          'E-mail': additionalData.email ?? profile.email ?? '_______________',
          Telefon: additionalData.phone ?? '_______________',
          // Vehicle fields
          'Categorie vehicul': 'Vehicul terestru',
          Marcă: additionalData.make ?? '_______________',
          'Denumire comercială': `${additionalData.make ?? ''} ${additionalData.model ?? ''}`.trim(),
          'Număr identificare/Șasiu': additionalData.vin ?? '_______________',
          'Număr omologare': additionalData.homologation_number ?? '_______________',
          // Declaration
          'Declar sub sancțiuni că datele sunt corecte': 'DA',
          Data: today,
          Semnătură: '_______________',
        },
      ]
      break

    case 'cerere_drpciv':
      // Handled below with pdf-lib — skip the pdfme path
      return generateCerereDrpciv(profile, additionalData)

    default:
      throw new Error(`Tip de formular necunoscut: ${formType}`)
  }

  const fieldNames = Object.keys(inputs[0])

  let basePdfData: string | Uint8Array | ArrayBuffer = BLANK_PDF

  try {
    const { data, error } = await supabaseAdmin.storage
      .from('pdf-templates')
      .download(`${resolvedType}.pdf`)

    if (data && !error) {
      const arrayBuffer = await data.arrayBuffer()
      basePdfData = new Uint8Array(arrayBuffer)
    }
  } catch (err) {
    console.error('Error fetching base PDF from Supabase:', err)
  }

  const template = buildSimpleTextTemplate(fieldNames, basePdfData)

  const pdf = await generate({ template, inputs })
  return Buffer.from(pdf)
}

// ────────────────────────────────────────────────────────────
// cerere_drpciv — overlays filled text onto the official form
// ────────────────────────────────────────────────────────────
// Coordinates assume A4 (595 x 842 pt), origin bottom-left.
// Copy cerere_drpciv.pdf into backend/src/assets/ to enable.
// Without the template the function throws a clear error.
// ────────────────────────────────────────────────────────────
async function generateCerereDrpciv(
  profile: ProfileData,
  additionalData: Record<string, string>
): Promise<Buffer> {
  const templateBytes = await loadCerereDrpcivTemplate()

  const pdfDoc = await PDFDocument.load(templateBytes)
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const page = pdfDoc.getPages()[0]
  const { height } = page.getSize()
  const today = new Date().toLocaleDateString('ro-RO')

  const black = rgb(0, 0, 0)
  const fontSize = 9

  // Try AcroForm filling first (works if the PDF has named fields)
  const form = pdfDoc.getForm()
  const fields = form.getFields()

  if (fields.length > 0) {
    // PDF has fillable AcroForm fields — fill by common Romanian gov field names
    const trySet = (candidates: string[], value: string) => {
      for (const name of candidates) {
        try {
          const f = form.getTextField(name)
          f.setText(value)
          return
        } catch { /* try next */ }
      }
    }
    const tryCheck = (candidates: string[]) => {
      for (const name of candidates) {
        try {
          form.getCheckBox(name).check()
          return
        } catch { /* try next */ }
      }
    }

    trySet(['Subsemnatul', 'subsemnatul', 'Nume', 'nume_prenume'], profile.full_name ?? '')
    trySet(['CNP', 'cnp', 'C.N.P.'], profile.cnp ?? '')
    trySet(['Localitate', 'localitate', 'Localitatea'], profile.city ?? 'Cluj-Napoca')
    trySet(['Strada', 'strada', 'Adresa'], profile.address ?? '')
    trySet(['Email', 'email', 'E-mail'], additionalData.email ?? profile.email ?? '')
    trySet(['Telefon', 'telefon', 'Tel'], additionalData.phone ?? profile.phone ?? '')
    trySet(['Marca', 'marca', 'Vehicul_Marca'], additionalData.make ?? '')
    trySet(['Tip', 'tip', 'Vehicul_Tip'], additionalData.model ?? '')
    trySet(['NrIdentificare', 'vin', 'Numar_Identificare'], additionalData.vin ?? '')
    trySet(['NrInmatriculare', 'nr_inmatriculare'], additionalData.current_plate ?? '')
    trySet(['Data', 'data'], today)
    tryCheck(['Transcriere', 'transcrierea', 'op_transcriere'])

    form.flatten()
  } else {
    // No AcroForm fields — overlay text at fixed coordinates
    const draw = (text: string, x: number, yFromTop: number) => {
      page.drawText(text, {
        x,
        y: height - yFromTop,
        size: fontSize,
        font,
        color: black,
      })
    }

    // ── Personal data ───────────────────────────────────────
    draw(profile.full_name ?? '', 178, 148)
    draw(profile.cnp ?? '', 98, 162)
    draw(profile.city ?? 'Cluj-Napoca', 330, 162)

    // Address split into street and number for the form lines
    const addr = profile.address ?? ''
    const streetMatch = addr.match(/^(.*?)\s+nr\.?\s*(\S+)/i)
    if (streetMatch) {
      draw(streetMatch[1], 98, 176)
      draw(streetMatch[2], 213, 176)
    } else {
      draw(addr, 98, 176)
    }

    draw(additionalData.bloc ?? '', 241, 176)
    draw(additionalData.scara ?? '', 263, 176)
    draw(additionalData.etaj ?? '', 285, 176)
    draw(additionalData.ap ?? '', 72, 190)
    draw(additionalData.county ?? 'Cluj', 173, 190)
    draw(additionalData.email ?? profile.email ?? '', 340, 190)
    draw(additionalData.phone ?? profile.phone ?? '', 98, 204)

    // ── Operation type checkbox (transcrierea = 3rd option) ─
    // Draw an X in the checkbox for "transcrierea transmiterii dreptului de proprietate"
    draw('X', 36, 246)

    // ── Vehicle data ────────────────────────────────────────
    draw(additionalData.make ?? '', 170, 363)
    draw(additionalData.model ?? '', 315, 363)
    draw(additionalData.vin ?? '', 98, 377)
    draw(additionalData.current_plate ?? '', 325, 377)

    // ── Date ────────────────────────────────────────────────
    draw(today, 55, 516)
  }

  const bytes = await pdfDoc.save()
  return Buffer.from(bytes)
}

async function loadCerereDrpcivTemplate(): Promise<Uint8Array> {
  // 1. Local assets folder (preferred — copy cerere_drpciv.pdf here)
  const localPath = path.join(process.cwd(), 'src', 'assets', 'cerere_drpciv.pdf')
  if (fs.existsSync(localPath)) {
    return new Uint8Array(fs.readFileSync(localPath))
  }

  // 2. Supabase storage fallback
  try {
    const { data, error } = await supabaseAdmin.storage
      .from('pdf-templates')
      .download('cerere_drpciv.pdf')
    if (data && !error) {
      return new Uint8Array(await data.arrayBuffer())
    }
  } catch { /* fall through */ }

  throw new Error(
    'Template cerere_drpciv.pdf not found. ' +
    'Copy the file to backend/src/assets/cerere_drpciv.pdf'
  )
}
