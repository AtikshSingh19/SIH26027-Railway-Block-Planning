import { X } from 'lucide-react'
import { useEffect } from 'react'

export default function Modal({ open, onClose, title, children, footer, width = 'max-w-lg' }) {
  useEffect(() => {
    if (!open) return
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className={`relative w-full ${width} bg-surface-1 border border-surface-3 rounded shadow-none`}>
        <div className="flex items-center justify-between border-b border-surface-3 px-5 py-3.5">
          <h3 className="text-base font-semibold text-ink-primary">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-ink-secondary hover:text-ink-primary p-1 rounded hover:bg-surface-2"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-4 max-h-[70vh] overflow-y-auto">{children}</div>
        {footer ? <div className="border-t border-surface-3 px-5 py-3.5 flex justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  )
}
