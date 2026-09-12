import { X } from 'lucide-react'
import { useEffect } from 'react'

export default function SidePanel({ open, onClose, title, subtitle, children, footer }) {
  useEffect(() => {
    if (!open) return
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  return (
    <div
      className={`fixed inset-0 z-40 ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
      aria-hidden={!open}
    >
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <aside
        className={`absolute top-0 right-0 h-full w-full max-w-md bg-surface-1 border-l border-surface-3 flex flex-col transition-transform duration-150 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-start justify-between border-b border-surface-3 px-5 py-4 shrink-0">
          <div>
            <h3 className="text-base font-semibold text-ink-primary">{title}</h3>
            {subtitle ? <p className="text-xs text-ink-secondary mt-0.5">{subtitle}</p> : null}
          </div>
          <button
            onClick={onClose}
            aria-label="Close panel"
            className="text-ink-secondary hover:text-ink-primary p-1 rounded hover:bg-surface-2"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? <div className="border-t border-surface-3 px-5 py-3.5 flex justify-end gap-2 shrink-0">{footer}</div> : null}
      </aside>
    </div>
  )
}
