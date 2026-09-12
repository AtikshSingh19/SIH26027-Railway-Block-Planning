import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="bg-surface-2 border border-surface-3 rounded px-2.5 py-1.5 text-xs">
      <p className="text-ink-secondary mb-0.5">{label}</p>
      <p className="text-ink-primary font-medium">{payload[0].value}</p>
    </div>
  )
}

/**
 * data: [{ [nameKey]: string, [valueKey]: number }]
 */
export default function GroupedBarChart({ data, nameKey, valueKey, color = '#4E8FE0', height = 220 }) {
  if (!data || data.length === 0) {
    return <div className="text-sm text-ink-faint py-10 text-center">No data available.</div>
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1D2740" vertical={false} />
        <XAxis
          dataKey={nameKey}
          tick={{ fill: '#9AA4BD', fontSize: 11 }}
          axisLine={{ stroke: '#1D2740' }}
          tickLine={false}
          interval={0}
          angle={data.length > 4 ? -20 : 0}
          textAnchor={data.length > 4 ? 'end' : 'middle'}
          height={data.length > 4 ? 40 : 24}
        />
        <YAxis tick={{ fill: '#9AA4BD', fontSize: 11 }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: '#161D2E' }} />
        <Bar dataKey={valueKey} fill={color} radius={[3, 3, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  )
}
