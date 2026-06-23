import { getInitials } from '../../utils/format.js'

const sizes = {
  xs: 'w-7 h-7 text-xs',
  sm: 'w-9 h-9 text-sm',
  md: 'w-11 h-11 text-base',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-20 h-20 text-2xl',
}

export default function Avatar({
  src,
  firstName = '',
  lastName = '',
  size = 'md',
  className = '',
  border = false,
}) {
  const sz = sizes[size]
  const initials = getInitials(firstName, lastName)
  const borderClass = border ? 'ring-2 ring-brand-gold ring-offset-1 ring-offset-transparent' : ''

  if (src) {
    return (
      <img
        src={src}
        alt={`${firstName} ${lastName}`}
        className={`${sz} rounded-full object-cover object-top flex-none ${borderClass} ${className}`}
      />
    )
  }

  return (
    <div
      className={`
        ${sz} rounded-full flex-none flex items-center justify-center
        bg-purple-gradient text-white font-heading font-bold
        ${borderClass} ${className}
      `}
    >
      {initials || '؟'}
    </div>
  )
}
