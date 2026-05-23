export function generateReportReference(): string {
  const year = new Date().getFullYear()
  const sequence = Math.floor(1000 + Math.random() * 9000)
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `CLJ-${year}-${sequence}-${suffix}`
}
