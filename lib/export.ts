export async function exportXlsx(
  rows: Record<string, unknown>[],
  filename: string,
  sheetName = 'Report',
) {
  return exportWorkbook([{ name: sheetName, rows }], filename)
}

export async function exportWorkbook(
  sheets: { name: string; rows: Record<string, unknown>[] }[],
  filename: string,
) {
  const XLSX = await import('xlsx')
  const book = XLSX.utils.book_new()

  for (const item of sheets) {
    const rows = item.rows.length > 0 ? item.rows : [{ ข้อมูล: 'ไม่พบข้อมูล' }]
    const sheet = XLSX.utils.json_to_sheet(rows)
    const headers = Object.keys(rows[0] || {})
    sheet['!cols'] = headers.map((header) => {
      const maxLength = rows.reduce((max, row) => {
        const value = row[header]
        return Math.max(max, String(value ?? '').length)
      }, header.length)
      return { wch: Math.min(Math.max(maxLength + 2, 10), 45) }
    })
    XLSX.utils.book_append_sheet(book, sheet, item.name.slice(0, 31))
  }

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
