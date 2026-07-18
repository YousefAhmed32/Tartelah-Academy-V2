import { Suspense } from 'react'
import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore.js'
import ErrorBoundary from '../components/shared/ErrorBoundary.jsx'
import Spinner from '../components/ui/Spinner.jsx'

function ContentFallback() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Spinner color="border-white" />
    </div>
  )
}

export default function AuthLayout() {
  const { isAuthenticated, getDashboardPath } = useAuthStore()
  const location = useLocation()

  if (isAuthenticated) {
    return <Navigate to={getDashboardPath()} replace />
  }

  return (
    <div className="min-h-screen" style={{ background: 'radial-gradient(120% 80% at 12% 18%, #3a1273 0%, #23104f 38%, #160734 72%)' }} dir="rtl">
      <ErrorBoundary resetKey={location.pathname}>
        <Suspense fallback={<ContentFallback />}>
          <Outlet />
        </Suspense>
      </ErrorBoundary>
    </div>
  )
}
