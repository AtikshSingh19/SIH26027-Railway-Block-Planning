const VARIANT_CLASSES = {
  primary: 'bg-rail text-white hover:bg-rail/90 border-transparent',
  ai: 'bg-ai text-white hover:bg-ai/90 border-transparent',
  secondary: 'bg-transparent text-ink-primary border-surface-3 hover:bg-surface-2',
  ghost: 'bg-transparent text-ink-secondary border-transparent hover:bg-surface-2 hover:text-ink-primary',
  danger: 'bg-transparent text-critical border-critical/40 hover:bg-critical-muted',
  success: 'bg-transparent text-healthy border-healthy/40 hover:bg-healthy-muted',
}

const SIZE_CLASSES = {
  sm: 'text-xs px-2.5 py-1.5 gap-1.5',
  md: 'text-sm px-3.5 py-2 gap-2',
}

export default function Button({
  children,
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  className = '',
  disabled = false,
  ...rest
}) {
  return (
    <button
      className={`inline-flex items-center justify-center font-medium border rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      disabled={disabled}
      {...rest}
    >
      {Icon ? <Icon size={size === 'sm' ? 14 : 16} strokeWidth={2} /> : null}
      {children}
    </button>
  )
}
