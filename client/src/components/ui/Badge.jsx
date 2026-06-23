const variants = {
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  purple: 'bg-purple-100 text-purple-700',
  gold: 'text-[#7a5600]',
  gray: 'bg-slate-100 text-slate-600',
  blue: 'bg-blue-100 text-blue-700',
}

export default function Badge({ children, variant = 'purple', className = '', dot = false }) {
  const color = variants[variant] || variants.purple
  const isGold = variant === 'gold'

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap
        ${isGold ? 'bg-[rgba(232,199,106,0.2)]' : color}
        ${className}
      `}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full flex-none ${isGold ? 'bg-[#E8C76A]' : 'bg-current'}`} />
      )}
      {children}
    </span>
  )
}
