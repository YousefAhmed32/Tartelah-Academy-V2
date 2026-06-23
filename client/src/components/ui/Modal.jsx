import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Button from './Button.jsx'

const sizes = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[95vw]',
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
  footer,
  closable = true,
}) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closable ? onClose : undefined}
            className="absolute inset-0 bg-[rgba(8,3,20,0.7)] backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`relative w-full ${sizes[size]} bg-white rounded-card shadow-card-dark z-10 overflow-hidden`}
            dir="rtl"
          >
            {/* Header */}
            {(title || closable) && (
              <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-[#f0ecf8]">
                {title && (
                  <h3 className="font-heading font-bold text-xl text-brand-textBody">{title}</h3>
                )}
                {closable && (
                  <button
                    onClick={onClose}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-[#8a7bb0] hover:bg-[#f3eefc] transition-colors ms-auto"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/>
                    </svg>
                  </button>
                )}
              </div>
            )}

            {/* Body */}
            <div className="px-6 py-5 max-h-[65vh] overflow-y-auto custom-scroll">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="px-6 py-4 border-t border-[#f0ecf8] flex items-center justify-end gap-3">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
