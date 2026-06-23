import { motion } from 'framer-motion'

export default function Card({
  children,
  variant = 'light',
  lift = false,
  className = '',
  padding = 'p-6',
  onClick,
}) {
  const base = variant === 'dark' ? 'card-dark' : 'card-light'
  const liftClass = lift ? (variant === 'dark' ? 'card-lift card-lift-dark cursor-pointer' : 'card-lift cursor-pointer') : ''

  if (lift) {
    return (
      <motion.div
        onClick={onClick}
        whileHover={{ y: -6 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className={`${base} ${liftClass} ${padding} ${className}`}
      >
        {children}
      </motion.div>
    )
  }

  return (
    <div
      onClick={onClick}
      className={`${base} ${liftClass} ${padding} ${className}`}
    >
      {children}
    </div>
  )
}
