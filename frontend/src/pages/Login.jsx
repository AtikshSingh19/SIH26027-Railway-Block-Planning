import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { TrainFront, ShieldCheck } from 'lucide-react'
import Button from '../components/common/Button'
import { useRole } from '../context/RoleContext'

export default function Login() {
  const { roles, login, isAuthenticated } = useRole()
  const navigate = useNavigate()
  const location = useLocation()
  const [name, setName] = useState('')
  const [roleId, setRoleId] = useState('employee')
  if (isAuthenticated) return <Navigate to={location.state?.from?.pathname || '/'} replace />

  function submit(e) {
    e.preventDefault()
    if (!name.trim()) return
    login({ name, roleId })
    navigate('/')
  }

  const loginRoles = roles.filter((r) => ['employee', 'planner', 'admin'].includes(r.category))
  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-surface-1 border border-surface-3 rounded p-7">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 border border-rail/40 bg-rail-muted flex items-center justify-center rounded">
            <TrainFront className="text-rail" size={22} />
          </div>
          <div><p className="text-lg font-semibold text-ink-primary">Indian Railways</p><p className="text-xs text-ink-faint">Block Planning Operational Console</p></div>
        </div>
        <h1 className="text-xl font-semibold text-ink-primary">Sign in</h1>
        <p className="text-sm text-ink-secondary mt-1 mb-6">Prototype employee, planner and administrator access.</p>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <label className="text-sm text-ink-secondary">Name<input value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5 w-full bg-surface-2 border border-surface-3 rounded px-3 py-2 text-ink-primary outline-none focus:border-rail" placeholder="Enter your name" required /></label>
          <label className="text-sm text-ink-secondary">Role<select value={roleId} onChange={(e) => setRoleId(e.target.value)} className="mt-1.5 w-full bg-surface-2 border border-surface-3 rounded px-3 py-2 text-ink-primary outline-none focus:border-rail">{loginRoles.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select></label>
          <Button type="submit" variant="ai" size="lg">Enter Console</Button>
        </form>
        <div className="mt-6 pt-4 border-t border-surface-3 flex gap-2 text-xs text-ink-faint"><ShieldCheck size={14} className="text-healthy" /> Mock authentication only — replaceable with real SSO/JWT later.</div>
      </div>
    </div>
  )
}
