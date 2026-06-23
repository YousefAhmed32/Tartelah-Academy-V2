import { motion } from 'framer-motion'
import Spinner from './Spinner.jsx'

const variants = {
  gold: 'btn-gold',
  outline: 'btn-outline',
  purple: 'btn-purple',
  ghost: 'btn-ghost',
  danger: 'cursor-pointer font-body font-bold text-white bg-red-600 border-none rounded-btn px-6 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:bg-red-700',
}

const sizes = {
  sm: 'text-sm px-4 py-2',
  md: 'text-base px-6 py-3',
  lg: 'text-lg px-8 py-4',
  icon: 'w-10 h-10 p-0 flex items-center justify-center',
}

export default function Button({
  children,
  variant = 'gold',
  size = 'md',
  loading = false,
  disabled = false,
  type = 'button',
  className = '',
  onClick,
  fullWidth = false,
  icon,
  iconPosition = 'start',
}) {
  const base = variants[variant] || variants.gold
  const sz = sizes[size]

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={!disabled && !loading ? { y: -2 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.97 } : {}}
      className={`
        ${base} ${sz}
        ${fullWidth ? 'w-full justify-center' : ''}
        ${disabled || loading ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''}
        inline-flex items-center gap-2.5 transition-all duration-200
        ${className}
      `}
    >
      {loading && <Spinner size="sm" />}
      {!loading && icon && iconPosition === 'start' && icon}
      {children}
      {!loading && icon && iconPosition === 'end' && icon}
    </motion.button>
  )
}
