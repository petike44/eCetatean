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
import { supabaseAdmin } from './supabase'

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
      // DRPCIV request form for vehicle registration from EU
      inputs = [
        {
          'Subsemnatul(a)': profile.full_name ?? '_______________',
          'C.N.P. (C.U.I.)': profile.cnp ?? '_______________',
          Localitate: profile.city ?? 'Cluj-Napoca',
          Strada: profile.address ?? '_______________',
          Județ: additionalData.county ?? 'Cluj',
          'E-mail': additionalData.email ?? profile.email ?? '_______________',
          Telefon: additionalData.phone ?? '_______________',
          'Solicit: Înmatricularea': 'X',
          'Vehicul — Marcă': additionalData.make ?? '_______________',
          'Vehicul — Tip': additionalData.model ?? '_______________',
          'Vehicul — Număr identificare': additionalData.vin ?? '_______________',
          'Vehicul — Număr înmatriculare curent': additionalData.current_plate ?? '_____',
          // Optional: other person using vehicle
          'Altă persoană — Nume': additionalData.other_person_name ?? '',
          'Altă persoană — C.N.P.': additionalData.other_person_cnp ?? '',
          // Agreements
          'Acord cont internet': 'DA',
          'Acord notificări e-mail': 'DA',
          'Declar că am citit Nota de Informare': 'DA',
          Data: today,
          Semnătură: '_______________',
        },
      ]
      break

    default:
      throw new Error(`Tip de formular necunoscut: ${formType}`)
  }

  const fieldNames = Object.keys(inputs[0])
  
  let basePdfData: string | Uint8Array | ArrayBuffer = BLANK_PDF

  try {
    const { data, error } = await supabaseAdmin.storage
      .from('pdf-templates')
      .download(`${formType}.pdf`)
    
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
