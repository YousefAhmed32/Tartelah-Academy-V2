import { Suspense } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import PublicHeader from '../components/layout/public-header/PublicHeader.jsx'
import Footer from '../components/shared/Footer.jsx'
import FloatingActionStack from '../components/shared/FloatingAssistance/FloatingActionStack.jsx'
import ErrorBoundary from '../components/shared/ErrorBoundary.jsx'
import Spinner from '../components/ui/Spinner.jsx'

function ContentFallback() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Spinner color="border-brand-purple" />
    </div>
  )
}

export default function PublicLayout() {
  const location = useLocation()

  return (
    <div className="min-h-screen overflow-x-hidden bg-brand-dark" dir="rtl">
      <PublicHeader />
      <ErrorBoundary resetKey={location.pathname}>
        <Suspense fallback={<ContentFallback />}>
          <Outlet />
        </Suspense>
      </ErrorBoundary>
      <Footer />
      <FloatingActionStack />
    </div>
  )
}
