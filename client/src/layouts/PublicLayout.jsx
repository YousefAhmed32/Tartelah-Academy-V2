import { Outlet } from 'react-router-dom'
import PublicHeader from '../components/layout/public-header/PublicHeader.jsx'
import Footer from '../components/shared/Footer.jsx'
import FloatingAssistanceCluster from '../components/shared/FloatingAssistance/FloatingAssistanceCluster.jsx'

export default function PublicLayout() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-brand-dark" dir="rtl">
      <PublicHeader />
      <Outlet />
      <Footer />
      <FloatingAssistanceCluster />
    </div>
  )
}
