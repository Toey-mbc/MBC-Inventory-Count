export async function exportXlsx(
  rows: Record<string, unknown>[],
  filename: string,
  sheetName = 'Report',
) {
  const XLSX = await import('xlsx')
  const sheet = XLSX.utils.json_to_sheet(rows)
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, sheetName.slice(0, 31))
  XLSX.writeFile(book, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`)
}

export async function parseSpreadsheet(file: File) {
  const XLSX = await import('xlsx')
  const buffer = await file.arrayBuffer()
  const book = XLSX.read(buffer, { type: 'array' })
  const firstSheet = book.SheetNames[0]
  if (!firstSheet) return []
  const sheet = book.Sheets[firstSheet]
  return XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Record<string, unknown>[]
}
