import { Outlet } from 'react-router-dom'
import PublicHeader from '../components/layout/public-header/PublicHeader.jsx'
import Footer from '../components/shared/Footer.jsx'
import FloatingActionStack from '../components/shared/FloatingAssistance/FloatingActionStack.jsx'

export default function PublicLayout() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-brand-dark" dir="rtl">
      <PublicHeader />
      <Outlet />
      <Footer />
      <FloatingActionStack />
    </div>
  )
}
