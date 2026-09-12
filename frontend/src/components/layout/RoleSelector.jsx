import { ChevronDown, UserCog } from 'lucide-react'
import { useRole } from '../../context/RoleContext'

/**
 * Native <select> styled to sit in the Header — deliberately simple so it's
 * accessible and keyboard-friendly. Changing it updates RoleContext, which
 * every role-aware page (Dashboard today, more later) reads from.
 */
export default function RoleSelector() {
  const { roleId, role, roles, setRoleId } = useRole()

  return (
    <div className="relative flex items-center gap-2 pl-3 border-l border-surface-3">
      <UserCog size={15} className="text-ink-faint shrink-0" strokeWidth={1.75} />
      <div className="relative">
        <select
          value={roleId}
          onChange={(e) => setRoleId(e.target.value)}
          aria-label="Active role"
          className="appearance-none bg-transparent text-xs font-medium text-ink-primary pr-5 py-1 cursor-pointer outline-none hover:text-rail focus:text-rail max-w-[9.5rem] sm:max-w-none truncate"
        >
          {roles.map((r) => (
            <option key={r.id} value={r.id} className="bg-surface-1 text-ink-primary">
              {r.label}
            </option>
          ))}
        </select>
        <ChevronDown size={12} className="absolute right-0 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
      </div>
      <span className="hidden lg:inline text-xs text-ink-faint truncate max-w-[10rem]">
        {role.department ? `· ${role.department}` : '· All departments'}
      </span>
    </div>
  )
}
