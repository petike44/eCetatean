// ────────────────────────────────────────────────────────────
// PDF TEMPLATE STUBS
// ────────────────────────────────────────────────────────────
// Each template function returns a Buffer containing the PDF.
// These are simplified implementations using basic text layout.
// For production: recreate the exact official Romanian form layout.
// ────────────────────────────────────────────────────────────

import { generate } from '@pdfme/generator'
import { BLANK_PDF } from '@pdfme/common'
import type { Template } from '@pdfme/common'
import type { FormType } from '../types'

const FONT_SIZE = 11
const LINE_HEIGHT = 8

function buildSimpleTextTemplate(fields: string[]): Template {
  return {
    basePdf: BLANK_PDF,
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
  buletin_series?: string | null
  buletin_number?: string | null
}

export async function generatePDF(
  formType: FormType,
  profile: ProfileData,
  additionalData: Record<string, string> = {}
): Promise<Buffer> {
  const today = new Date().toLocaleDateString('ro-RO')

  let inputs: Record<string, string>[] = []

  switch (formType) {
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

    default:
      throw new Error(`Tip de formular necunoscut: ${formType}`)
  }

  const fieldNames = Object.keys(inputs[0])
  const template = buildSimpleTextTemplate(fieldNames)

  const pdf = await generate({ template, inputs })
  return Buffer.from(pdf)
}
