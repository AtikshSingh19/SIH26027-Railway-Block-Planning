import { UserCog, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useRole } from '../../context/RoleContext'

export default function RoleSelector() {
  const { role, logout } = useRole()
  const navigate = useNavigate()

  function handleSwitchRole() {
    logout()
    navigate('/login')
  }

  return (
    <div className="relative flex items-center gap-2.5 pl-3 border-l border-surface-3">
      <UserCog size={15} className="text-ink-faint shrink-0" strokeWidth={1.75} />
      <div className="flex items-center gap-1.5 truncate max-w-[12rem] sm:max-w-none">
        <span className="text-xs font-medium text-ink-primary truncate">
          {role?.shortLabel || role?.label || 'Active Role'}
        </span>
        <span className="hidden lg:inline text-xs text-ink-faint truncate">
          {role?.department ? `(${role.department})` : '(All Depts)'}
        </span>
      </div>
      <button
        type="button"
        onClick={handleSwitchRole}
        className="flex items-center gap-1 text-xs text-rail hover:underline font-medium ml-1 cursor-pointer bg-rail/10 hover:bg-rail/20 px-2 py-1 rounded transition-colors"
        title="Change role (requires login)"
      >
        <LogOut size={12} />
        <span>Change Role</span>
      </button>
    </div>
  )
}

