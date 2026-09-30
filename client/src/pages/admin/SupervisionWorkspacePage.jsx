import { Navigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore.js'
import { ROUTES } from '../../config/constants.js'
import AdminSupervisionPage from './AdminSupervisionPage.jsx'
import SupervisionDashboard from '../../components/supervision/SupervisionDashboard.jsx'

export default function SupervisionWorkspacePage({ team, position }) {
  const { user } = useAuthStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const admin = user?.isPrimaryAdmin || user?.role === 'admin'
  if (!admin && (user?.supervisionTeam !== team || user?.supervisionPosition !== position)) return <Navigate to={ROUTES.ADMIN_SUPERVISION} replace />
  const view = searchParams.get('view') || 'home'
  const navigateSection = (section, session = null) => {
    const next = { view: section }
    if (session?._id) { next.session = session._id; next.day = session.scheduledAt }
    setSearchParams(next)
  }
  const target = searchParams.get('session') ? { sessionId: searchParams.get('session'), day: searchParams.get('day') || new Date().toISOString() } : null
  if (view === 'home') return <SupervisionDashboard team={team} position={position} user={user} onSection={navigateSection} onReport={(row) => navigateSection('academic-reports', row)} />
  return <div className="mx-auto max-w-[1480px] space-y-5" dir="rtl">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
      <div><p className="text-xs font-bold text-violet-700">{team === 'academic' ? 'الإشراف الأكاديمي' : 'الإشراف الإداري'}</p><h1 className="mt-1 font-heading text-xl font-extrabold text-gray-950">{({ daily: 'حلقات اليوم', 'academic-reports': 'تقارير المتابعة', 'academic-learning': 'الطلاب والمناهج', 'academic-directives': 'التوجيهات', exceptions: 'الحالات والتعويضات', handoff: 'تسليم الشيفت', assignments: 'التكليفات', cohorts: 'مجموعات الطلاب', shifts: 'الشيفتات', people: 'الفريق', coverage: 'تغطية الحلقات', 'periodic-metrics': 'الإحصاءات', 'periodic-reports': 'التقارير الدورية', 'academic-search': 'البحث الأكاديمي', 'new-students': 'الطلاب الجدد', settings: 'السياسات', activity: 'سجل التغييرات' })[view] || 'مساحة الإشراف'}</h1></div>
      <button type="button" onClick={() => navigateSection('home')} className="min-h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-800 transition-colors hover:bg-gray-50">العودة للرئيسية</button>
    </div>
    <AdminSupervisionPage lockedTeam={team} workspacePosition={position} selectedTab={view} onSectionChange={navigateSection} embedded initialReportTarget={view === 'academic-reports' ? target : null} initialDailyTarget={view === 'daily' ? target : null} initialExceptionSessionId={view === 'exceptions' ? target?.sessionId : null} />
  </div>
}
