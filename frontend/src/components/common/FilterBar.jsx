import { Search } from 'lucide-react'

/**
 * filters: [{ key, label, options: [{value, label}], value, onChange }]
 * searchValue / onSearchChange: optional free-text search
 * toggles: optional [{ key, label, checked, onChange }] — checkbox-style
 *   filters for boolean conditions (e.g. "Overdue only") that don't fit a
 *   dropdown. Purely additive; omitting it changes nothing for existing callers.
 */
export default function FilterBar({
  filters = [],
  toggles = [],
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search…',
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      {onSearchChange ? (
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="bg-surface-1 border border-surface-3 rounded pl-8 pr-3 py-1.5 text-sm text-ink-primary placeholder:text-ink-faint focus:border-rail outline-none w-56"
          />
        </div>
      ) : null}
      {filters.map((f) => (
        <select
          key={f.key}
          value={f.value}
          onChange={(e) => f.onChange(e.target.value)}
          className="bg-surface-1 border border-surface-3 rounded px-2.5 py-1.5 text-sm text-ink-primary focus:border-rail outline-none"
        >
          <option value="">{f.label}: All</option>
          {f.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ))}
      {toggles.map((t) => (
        <label
          key={t.key}
          className="flex items-center gap-1.5 bg-surface-1 border border-surface-3 rounded px-2.5 py-1.5 text-sm text-ink-secondary cursor-pointer select-none hover:text-ink-primary"
        >
          <input
            type="checkbox"
            checked={t.checked}
            onChange={(e) => t.onChange(e.target.checked)}
            className="accent-rail"
          />
          {t.label}
        </label>
      ))}
    </div>
  )
}
