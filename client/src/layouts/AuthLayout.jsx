import { Outlet, Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore.js'

export default function AuthLayout() {
  const { isAuthenticated, getDashboardPath } = useAuthStore()

  if (isAuthenticated) {
    return <Navigate to={getDashboardPath()} replace />
  }

  return (
    <div className="min-h-screen" style={{ background: 'radial-gradient(120% 80% at 12% 18%, #3a1273 0%, #23104f 38%, #160734 72%)' }} dir="rtl">
      <Outlet />
    </div>
  )
}
