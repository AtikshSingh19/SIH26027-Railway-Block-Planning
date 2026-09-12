import EmptyState from './EmptyState'

/**
 * Generic, presentation-only table.
 *
 * columns: [{ key, header, render?(row), align?('left'|'right'), width? }]
 * rows: array of data objects
 * onRowClick: optional (row) => void — makes rows interactive
 * rowClassName: optional (row) => string — extra classes for a specific row
 *   (e.g. highlighting critical/overdue records). Purely additive; existing
 *   callers that omit it get identical behavior to before.
 */
export default function DataTable({
  columns,
  rows,
  onRowClick,
  rowClassName,
  emptyMessage = 'No records match your filters.',
}) {
  if (!rows || rows.length === 0) {
    return <EmptyState message={emptyMessage} />
  }

  return (
    <div className="overflow-x-auto border border-surface-3 rounded">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-surface-3 bg-surface-1">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-3 py-2.5 font-medium text-ink-secondary text-xs uppercase tracking-wide whitespace-nowrap ${
                  col.align === 'right' ? 'text-right' : 'text-left'
                }`}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={row.id || idx}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`border-b border-surface-3 last:border-0 ${
                onRowClick ? 'cursor-pointer hover:bg-surface-2' : ''
              } ${idx % 2 === 1 ? 'bg-surface-1/40' : ''} ${rowClassName ? rowClassName(row) : ''}`}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-3 py-2.5 text-ink-primary align-middle ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                >
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
