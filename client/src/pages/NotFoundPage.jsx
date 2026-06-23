import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../store/authStore.js'

export default function NotFoundPage() {
  const { isAuthenticated, getDashboardPath } = useAuthStore()

  return (
    <div className="min-h-screen flex items-center justify-center px-6" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center"
      >
        <div className="font-heading font-extrabold text-[120px] leading-none" style={{ color: '#9b7fd6', opacity: 0.3 }}>٤٠٤</div>
        <h1 className="font-heading font-extrabold text-3xl text-white -mt-4 mb-3">الصفحة غير موجودة</h1>
        <p className="text-sm mb-8" style={{ color: '#b3a4d0' }}>عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها.</p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link to="/" className="btn-outline text-sm">الصفحة الرئيسية</Link>
          {isAuthenticated && (
            <Link to={getDashboardPath()} className="btn-gold text-sm">لوحة التحكم</Link>
          )}
        </div>
      </motion.div>
    </div>
  )
}
