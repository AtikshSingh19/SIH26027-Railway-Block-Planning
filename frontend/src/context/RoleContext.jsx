import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { ROLES, DEFAULT_ROLE_ID, getRoleById } from '../config/dashboardConfig'

// NOTE: session state intentionally lives in sessionStorage, not localStorage.
// sessionStorage is scoped to a single tab/browser session — it survives a
// page refresh (so mid-testing reloads don't kick you back to /login) but is
// gone the moment the tab/browser closes. That gives a real "fresh open"
// (new tab, reopened browser) a guaranteed clean slate, while an in-tab
// refresh preserves whatever session is actually active. Using localStorage
// here was the bug: a login from a previous, uncleanly-closed session could
// silently resurrect itself (and whatever role was last active) on a later
// visit with no way to tell it had happened.
const ROLE_KEY = 'bpc.activeRoleId'
const USER_KEY = 'bpc.loggedInUser'
// Legacy keys from the previous (localStorage-based) implementation. Cleared
// on load so any stale session left over from before this fix can't leak in.
const LEGACY_KEYS = ['bpc.activeRoleId', 'bpc.loggedInUser']
const RoleContext = createContext(undefined)

function read(key, fallback = null) {
  if (typeof window === 'undefined') return fallback
  try { return window.sessionStorage.getItem(key) || fallback } catch { return fallback }
}

function clearLegacyLocalStorage() {
  if (typeof window === 'undefined') return
  try { LEGACY_KEYS.forEach((key) => window.localStorage.removeItem(key)) } catch {}
}

export function RoleProvider({ children }) {
  const [user, setUser] = useState(() => {
    clearLegacyLocalStorage()
    const raw = read(USER_KEY)
    try { return raw ? JSON.parse(raw) : null } catch { return null }
  })
  // roleId only matters once someone is logged in (it drives the sidebar/
  // dashboard). It always tracks the logged-in user's role; when logged out
  // it falls back to DEFAULT_ROLE_ID, which is harmless because the route
  // guard sends unauthenticated visitors to /login regardless of roleId.
  const [roleId, setRoleIdState] = useState(() => user?.roleId || read(ROLE_KEY, DEFAULT_ROLE_ID))

  useEffect(() => {
    try { window.sessionStorage.setItem(ROLE_KEY, roleId) } catch {}
  }, [roleId])
  useEffect(() => {
    try {
      if (user) window.sessionStorage.setItem(USER_KEY, JSON.stringify(user))
      else window.sessionStorage.removeItem(USER_KEY)
    } catch {}
  }, [user])

  const role = useMemo(() => getRoleById(roleId), [roleId])
  const value = useMemo(() => ({
    roleId, role, roles: ROLES, user,
    isAuthenticated: Boolean(user),
    // Lets the header's role switcher change the active role for demo
    // purposes without a full logout — keeps the logged-in user record in
    // sync so the two never drift apart.
    setRoleId: (nextRoleId) => {
      setRoleIdState(nextRoleId)
      setUser((prev) => (prev ? { ...prev, roleId: nextRoleId } : prev))
    },
    login: ({ name, roleId: nextRoleId }) => {
      setRoleIdState(nextRoleId)
      setUser({ name: name.trim(), roleId: nextRoleId, loggedInAt: new Date().toISOString() })
    },
    logout: () => {
      setUser(null)
      try { window.sessionStorage.removeItem(USER_KEY) } catch {}
    },
  }), [roleId, role, user])
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>
}

export function useRole() {
  const ctx = useContext(RoleContext)
  if (!ctx) throw new Error('useRole() must be called within a <RoleProvider>')
  return ctx
}
