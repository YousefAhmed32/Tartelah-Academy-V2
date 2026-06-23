import { motion } from 'framer-motion'

export default function StatCard({ label, value, icon, color = '#7c3aed', bg, trend, variant = 'light' }) {
  const isDark = variant === 'dark'

  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`
        ${isDark ? 'card-dark' : 'card-light'}
        p-5 flex items-center gap-4 cursor-default
      `}
    >
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center flex-none"
        style={{ background: bg || `${color}20` }}
      >
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className={`font-heading font-bold text-2xl ${isDark ? 'text-white' : 'text-brand-textBody'}`}>
          {value}
        </div>
        <div className={`text-sm mt-0.5 ${isDark ? 'text-brand-textMuted' : 'text-[#9b7fd6]'}`}>
          {label}
        </div>
        {trend !== undefined && (
          <div className={`text-xs mt-1 font-semibold ${trend >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
            {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
          </div>
        )}
      </div>
    </motion.div>
  )
}
