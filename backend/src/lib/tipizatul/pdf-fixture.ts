// Test-only fixture: builds a tiny PDF with named AcroForm fields of
// every flavour the fill core handles. Lives in src/ (not test/) because
// it's used by both pdf-fill.test.ts and pdf-introspect.test.ts.

import { PDFDocument, rgb, StandardFonts } from '@pdfme/pdf-lib'

export interface FixtureSpec {
  textFields?: string[]                  // names
  checkboxes?: string[]
  dropdowns?: { name: string; options: string[] }[]
  radios?: { name: string; options: string[] }[]
}

export async function buildAcroFormFixture(spec: FixtureSpec): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const page = pdf.addPage([400, 600])
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const form = pdf.getForm()

  let y = 560
  const step = 30

  for (const name of spec.textFields ?? []) {
    page.drawText(name, { x: 20, y, size: 9, font, color: rgb(0, 0, 0) })
    const tf = form.createTextField(name)
    tf.addToPage(page, { x: 150, y: y - 4, width: 200, height: 18 })
    y -= step
  }
  for (const name of spec.checkboxes ?? []) {
    page.drawText(name, { x: 20, y, size: 9, font, color: rgb(0, 0, 0) })
    const cb = form.createCheckBox(name)
    cb.addToPage(page, { x: 150, y: y - 4, width: 14, height: 14 })
    y -= step
  }
  for (const { name, options } of spec.dropdowns ?? []) {
    page.drawText(name, { x: 20, y, size: 9, font, color: rgb(0, 0, 0) })
    const dd = form.createDropdown(name)
    dd.setOptions(options)
    dd.addToPage(page, { x: 150, y: y - 4, width: 200, height: 20 })
    y -= step
  }
  for (const { name, options } of spec.radios ?? []) {
    page.drawText(name, { x: 20, y, size: 9, font, color: rgb(0, 0, 0) })
    const rg = form.createRadioGroup(name)
    let rx = 150
    for (const opt of options) {
      rg.addOptionToPage(opt, page, { x: rx, y: y - 4, width: 14, height: 14 })
      rx += 24
    }
    y -= step
  }

  return new Uint8Array(await pdf.save())
}
