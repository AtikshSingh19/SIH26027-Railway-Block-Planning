import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const TONE_HEX = {
  rail: '#4E8FE0',
  ai: '#8B7FD6',
  healthy: '#4CAF7D',
  warning: '#D6A947',
  critical: '#D6604D',
}

function ChartTooltip({ active, payload, label, unit }) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="bg-surface-2 border border-surface-3 rounded px-2.5 py-1.5 text-xs">
      <p className="text-ink-secondary mb-0.5">{label}</p>
      <p className="text-ink-primary font-medium">
        {payload[0].value}
        {unit || ''}
      </p>
    </div>
  )
}

/**
 * data: [{ date, value }], e.g. analyticsTrends.assetAvailability
 */
export default function TrendLineChart({ data, tone = 'rail', unit = '', height = 220 }) {
  const color = TONE_HEX[tone] || TONE_HEX.rail

  if (!data || data.length === 0) {
    return <div className="text-sm text-ink-faint py-10 text-center">No trend data available.</div>
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1D2740" vertical={false} />
        <XAxis dataKey="date" tick={{ fill: '#9AA4BD', fontSize: 11 }} axisLine={{ stroke: '#1D2740' }} tickLine={false} />
        <YAxis tick={{ fill: '#9AA4BD', fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
        <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ stroke: '#1D2740' }} />
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 3, fill: color }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
