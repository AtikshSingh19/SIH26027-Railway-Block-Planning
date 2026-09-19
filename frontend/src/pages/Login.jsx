import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { TrainFront, ShieldCheck, AlertCircle } from 'lucide-react'
import Button from '../components/common/Button'
import { useRole } from '../context/RoleContext'
import { DEMO_ACCOUNTS } from '../config/dashboardConfig'

export default function Login() {
  const { login, isAuthenticated } = useRole()
  const navigate = useNavigate()
  const location = useLocation()
  
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [roleId, setRoleId] = useState('')
  const [error, setError] = useState('')

  if (isAuthenticated) return <Navigate to={location.state?.from?.pathname || '/'} replace />

  function submit(e) {
    e.preventDefault()
    setError('')

    const trimmedId = loginId.trim()

    if (!trimmedId || !password || !roleId) {
      setError('Please enter Login ID, Password, and select a Role.')
      return
    }

    const matched = DEMO_ACCOUNTS.find(
      (acc) => acc.loginId === trimmedId && acc.password === password && acc.roleId === roleId
    )

    if (!matched) {
      setError('Invalid Login ID, Password, or Role combination.')
      return
    }

    login({ loginId: matched.loginId, roleId: matched.roleId })
    navigate(location.state?.from?.pathname || '/')
  }

  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-surface-1 border border-surface-3 rounded p-7">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 border border-rail/40 bg-rail-muted flex items-center justify-center rounded">
            <TrainFront className="text-rail" size={22} />
          </div>
          <div>
            <p className="text-lg font-semibold text-ink-primary">Indian Railways</p>
            <p className="text-xs text-ink-faint">Block Planning Operational Console</p>
          </div>
        </div>
        
        <h1 className="text-xl font-semibold text-ink-primary">Sign in</h1>
        <p className="text-sm text-ink-secondary mt-1 mb-6">Enter your credentials and select your authorized role.</p>

        {error && (
          <div className="mb-4 p-3 bg-critical/10 border border-critical/30 rounded flex items-center gap-2 text-xs text-critical font-medium">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={submit} className="flex flex-col gap-4">
          <label className="text-sm text-ink-secondary">
            Login ID
            <input
              type="text"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              className="mt-1.5 w-full bg-surface-2 border border-surface-3 rounded px-3 py-2 text-ink-primary outline-none focus:border-rail"
              placeholder="e.g. 001"
              required
            />
          </label>

          <label className="text-sm text-ink-secondary">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full bg-surface-2 border border-surface-3 rounded px-3 py-2 text-ink-primary outline-none focus:border-rail"
              placeholder="Enter password"
              required
            />
          </label>

          <label className="text-sm text-ink-secondary">
            Role
            <select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              className="mt-1.5 w-full bg-surface-2 border border-surface-3 rounded px-3 py-2 text-ink-primary outline-none focus:border-rail"
              required
            >
              <option value="">Select a Role...</option>
              {DEMO_ACCOUNTS.map((acc) => (
                <option key={acc.roleId} value={acc.roleId}>
                  {acc.label}
                </option>
              ))}
            </select>
          </label>

          <Button type="submit" variant="ai" size="lg" className="mt-2">
            Login
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t border-surface-3 text-xs text-ink-faint">
          <p className="font-semibold text-ink-secondary mb-1">Demo Credentials:</p>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 font-mono text-[11px]">
            {DEMO_ACCOUNTS.map((acc) => (
              <div key={acc.loginId}>
                <span className="text-rail font-bold">{acc.loginId}</span> / <span className="text-ink-secondary">{acc.password}</span>: {acc.roleId}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

