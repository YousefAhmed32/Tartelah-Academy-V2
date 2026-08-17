import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { useAuthStore } from '../../store/authStore.js'

// Shown when direct navigation reaches a page the current user lacks
// permission for. Purely informational — the actual protection already
// happened on the backend (every data call from this page would already
// return 403); this just explains why the page is empty instead of
// silently rendering a broken/blank screen.
export default function AccessDeniedPage({ message = 'ليس لديك صلاحية للوصول إلى هذه الصفحة' }) {
  const { getDashboardPath } = useAuthStore()
  return (
    <div dir="rtl" className="flex flex-col items-center justify-center py-24 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
        <ShieldAlert size={28} className="text-red-500" />
      </div>
      <h1 className="font-heading font-bold text-xl text-gray-900 mb-2">غير مصرح بالوصول</h1>
      <p className="text-sm text-gray-500 max-w-sm mb-6">{message}</p>
      <Link to={getDashboardPath()} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 transition-colors">
        العودة إلى لوحة التحكم
      </Link>
    </div>
  )
}
