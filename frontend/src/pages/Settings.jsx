import { useEffect, useState } from 'react'
import { Check, UserCog } from 'lucide-react'
import SectionHeader from '../components/common/SectionHeader'
import LoadingState from '../components/common/LoadingState'
import Tag from '../components/common/Tag'
import StatusBadge from '../components/common/StatusBadge'
import { useFetch } from '../hooks/useFetch'
import api from '../services/api'
import { useRole } from '../context/RoleContext'
import { dataSourceStatusTone } from '../utils/status'
import { formatRelativeFreshness } from '../utils/formatters'

const STORAGE_KEY = 'bpc.settings'

const DEFAULT_SETTINGS = {
  notifications: {
    criticalAlerts: true,
    blockConflicts: true,
    planReady: true,
    dailyDigest: false,
  },
  optimization: {
    delayVsBlocks: 50, // 0 = minimize train delay, 100 = minimize block count
    autoBundle: true,
  },
}

function readStoredSettings() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw)
    return {
      notifications: { ...DEFAULT_SETTINGS.notifications, ...parsed.notifications },
      optimization: { ...DEFAULT_SETTINGS.optimization, ...parsed.optimization },
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
        checked ? 'bg-rail' : 'bg-surface-3'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-4.5' : 'translate-x-1'
        }`}
        style={{ transform: checked ? 'translateX(18px)' : 'translateX(2px)' }}
      />
    </button>
  )
}

export default function Settings() {
  const { role } = useRole()
  const [settings, setSettings] = useState(readStoredSettings)
  const [savedAt, setSavedAt] = useState(null)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
      setSavedAt(new Date())
    } catch {
      // localStorage unavailable — preferences just won't persist across reloads.
    }
  }, [settings])

  const { data: sources, loading: sourcesLoading } = useFetch(() => api.getDataSources(), [])

  function updateNotification(key, value) {
    setSettings((s) => ({ ...s, notifications: { ...s.notifications, [key]: value } }))
  }

  function updateOptimization(key, value) {
    setSettings((s) => ({ ...s, optimization: { ...s.optimization, [key]: value } }))
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Settings"
        subtitle="Planning preferences, notifications, and data-source configuration for this browser."
        actions={
          savedAt ? (
            <span className="flex items-center gap-1 text-xs text-ink-faint">
              <Check size={12} className="text-healthy" /> Saved
            </span>
          ) : null
        }
      />

      {/* Profile / role */}
      <section className="bg-surface-1 border border-surface-3 rounded p-4">
        <p className="text-sm font-medium text-ink-primary mb-3">Profile & role</p>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-rail-muted flex items-center justify-center shrink-0">
            <UserCog size={16} className="text-rail" />
          </div>
          <div>
            <p className="text-sm text-ink-primary">{role.label}</p>
            <p className="text-xs text-ink-secondary mt-0.5">
              {role.department ? `Scoped to ${role.department}` : 'Cross-department access'}
            </p>
          </div>
        </div>
        <p className="text-xs text-ink-faint mt-3">
          To switch roles, click "Change Role" in the header to return to the login page and re-authenticate.
        </p>
      </section>

      {/* Notifications */}
      <section className="bg-surface-1 border border-surface-3 rounded p-4">
        <p className="text-sm font-medium text-ink-primary mb-1">Notifications</p>
        <p className="text-xs text-ink-secondary mb-4">Saved locally for this browser.</p>
        <div className="flex flex-col divide-y divide-surface-3">
          {[
            { key: 'criticalAlerts', label: 'Critical defect alerts', hint: 'Overdue and Critical-severity maintenance tasks' },
            { key: 'blockConflicts', label: 'Block conflicts', hint: 'Overlapping block requests on the same corridor' },
            { key: 'planReady', label: 'Plan ready for review', hint: 'When the AI Block Planner finishes generating a plan' },
            { key: 'dailyDigest', label: 'Daily digest email', hint: 'Summary of the day\u2019s activity (mock only, no email sent)' },
          ].map((row) => (
            <div key={row.key} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm text-ink-primary">{row.label}</p>
                <p className="text-xs text-ink-faint mt-0.5">{row.hint}</p>
              </div>
              <Toggle checked={settings.notifications[row.key]} onChange={(v) => updateNotification(row.key, v)} />
            </div>
          ))}
        </div>
      </section>

      {/* Optimization preferences */}
      <section className="bg-surface-1 border border-surface-3 rounded p-4">
        <p className="text-sm font-medium text-ink-primary mb-1">Optimization preferences</p>
        <p className="text-xs text-ink-secondary mb-4">
          Saved locally for this browser. Not yet wired into the backend optimizer — use the objective selector on the
          AI Block Planner page for the setting that actually affects a generated plan.
        </p>

        <div className="mb-5">
          <div className="flex items-center justify-between text-xs text-ink-secondary mb-2">
            <span>Minimize train delay</span>
            <span>Minimize block count</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={settings.optimization.delayVsBlocks}
            onChange={(e) => updateOptimization('delayVsBlocks', Number(e.target.value))}
            className="w-full accent-rail"
          />
          <p className="text-xs text-ink-faint mt-1.5">
            Currently favoring{' '}
            {settings.optimization.delayVsBlocks < 40
              ? 'train delay minimization'
              : settings.optimization.delayVsBlocks > 60
                ? 'block count minimization'
                : 'a balanced approach'}
            .
          </p>
        </div>

        <div className="flex items-center justify-between gap-4 pt-3 border-t border-surface-3">
          <div>
            <p className="text-sm text-ink-primary">Auto-suggest bundling</p>
            <p className="text-xs text-ink-faint mt-0.5">Flag cross-department bundling opportunities automatically</p>
          </div>
          <Toggle
            checked={settings.optimization.autoBundle}
            onChange={(v) => updateOptimization('autoBundle', v)}
          />
        </div>
      </section>

      {/* Data sources (read-only) */}
      <section className="bg-surface-1 border border-surface-3 rounded p-4">
        <p className="text-sm font-medium text-ink-primary mb-1">Data-source configuration</p>
        <p className="text-xs text-ink-secondary mb-4">
          Read-only. Managed by IT/systems administration, not by individual users.
        </p>
        {sourcesLoading || !sources ? (
          <LoadingState compact />
        ) : (
          <div className="flex flex-col divide-y divide-surface-3">
            {sources.map((s) => (
              <div key={s.key} className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Tag>{s.label}</Tag>
                  <span className="text-xs text-ink-secondary truncate">{s.fullName}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-ink-faint">{formatRelativeFreshness(s.lastSyncMinutesAgo)}</span>
                  <StatusBadge tone={dataSourceStatusTone(s.status)} label={s.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
