// Minimal client-side CSV export. There is no backend report-generation
// endpoint, so this builds and downloads a real CSV from whatever mock (or
// eventually real) data the API layer returns — the button genuinely
// produces a file rather than simulating one.

function csvEscape(value) {
  const str = value == null ? '' : String(value)
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * rows: array of plain objects. Columns are taken from the keys of the
 * first row, in that order.
 */
export function rowsToCsv(rows) {
  if (!rows || rows.length === 0) return ''
  const columns = Object.keys(rows[0])
  const lines = [columns.join(',')]
  rows.forEach((row) => {
    lines.push(columns.map((col) => csvEscape(row[col])).join(','))
  })
  return lines.join('\n')
}

export function downloadCsv(filename, rows) {
  const csv = rowsToCsv(rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
