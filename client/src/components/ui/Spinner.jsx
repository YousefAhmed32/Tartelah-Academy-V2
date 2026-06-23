const sizes = {
  sm: 'w-4 h-4 border-[2px]',
  md: 'w-6 h-6 border-[2.5px]',
  lg: 'w-10 h-10 border-[3px]',
  xl: 'w-16 h-16 border-[4px]',
}

export default function Spinner({ size = 'md', color = 'border-brand-gold', className = '' }) {
  return (
    <span
      className={`
        ${sizes[size]}
        ${color}
        border-t-transparent rounded-full animate-spin inline-block
        ${className}
      `}
    />
  )
}
