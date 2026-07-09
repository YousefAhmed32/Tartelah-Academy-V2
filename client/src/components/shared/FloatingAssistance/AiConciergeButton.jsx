import { motion } from 'framer-motion'
import { Sparkles, X } from 'lucide-react'

export default function AiConciergeButton({ open, onToggle }) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      data-ai-cluster-trigger
      aria-label={open ? 'إغلاق مساعد ترتيلة الذكي' : 'اسأل مساعد ترتيلة'}
      title={open ? 'إغلاق المساعد' : 'اسأل مساعد ترتيلة'}
      aria-expanded={open}
      initial={{ opacity: 0, scale: 0.85, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.96 }}
      className="relative flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-full text-white shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      style={{
        background: 'linear-gradient(135deg, #7c3aed, #5b21b6)',
        boxShadow: '0 10px 30px rgba(124,58,237,0.45)',
        '--tw-ring-color': '#E8C76A',
        '--tw-ring-offset-color': '#0f0226',
      }}
    >
      {open ? <X size={22} strokeWidth={2} /> : <Sparkles size={22} strokeWidth={1.8} />}
    </motion.button>
  )
}
