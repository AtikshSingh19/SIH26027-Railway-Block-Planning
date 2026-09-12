import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

const PALETTE = ['#4E8FE0', '#8B7FD6', '#4CAF7D', '#D6A947', '#D6604D', '#5C6785']

function ChartTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null
  const entry = payload[0]
  return (
    <div className="bg-surface-2 border border-surface-3 rounded px-2.5 py-1.5 text-xs">
      <p className="text-ink-primary font-medium">
        {entry.name}: {entry.value}
      </p>
    </div>
  )
}

/**
 * data: [{ name: string, value: number }]
 */
export default function DistributionPieChart({ data, height = 220 }) {
  if (!data || data.length === 0) {
    return <div className="text-sm text-ink-faint py-10 text-center">No data available.</div>
  }

  const total = data.reduce((sum, d) => sum + d.value, 0)

  return (
    <div className="flex items-center gap-4">
      <div style={{ width: '55%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2} stroke="none">
              {data.map((entry, idx) => (
                <Cell key={entry.name} fill={PALETTE[idx % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex-1 flex flex-col gap-1.5 min-w-0">
        {data.map((entry, idx) => (
          <li key={entry.name} className="flex items-center gap-2 text-xs min-w-0">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PALETTE[idx % PALETTE.length] }} />
            <span className="text-ink-secondary truncate flex-1">{entry.name}</span>
            <span className="text-ink-primary font-medium tabular-nums">
              {entry.value} <span className="text-ink-faint">({total ? Math.round((entry.value / total) * 100) : 0}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
