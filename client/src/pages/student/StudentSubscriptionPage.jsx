import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../../utils/api.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import { formatDateAr } from '../../utils/date.js'
import { ROUTES } from '../../config/constants.js'

export default function StudentSubscriptionPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['subscription', 'me'],
    queryFn: () => api.get('/subscriptions/me').then(r => r.data.data),
    placeholderData: null,
  })

  return (
    <div dir="rtl">
      <PageHeader title="اشتراكي" subtitle="تفاصيل الباقة والاشتراك" />

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner color="border-brand-purple" /></div>
      ) : !data ? (
        <div className="card-light p-12 text-center max-w-md mx-auto">
          <div className="w-20 h-20 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-4">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" stroke="#7c3aed" strokeWidth="1.8" strokeLinejoin="round"/><path d="M14 2v6h6M9 13l2 2 4-4" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <h2 className="font-heading font-bold text-xl text-brand-textBody mb-2">لا يوجد اشتراك فعال</h2>
          <p className="text-[#9b7fd6] mb-6">سجّل في برنامج ترتيلة وابدأ رحلتك مع القرآن الكريم</p>
          <Link to={ROUTES.STUDENT_ENROLLMENT} className="btn-gold inline-block px-8 py-3 rounded-full font-bold text-sm">
            التسجيل في برنامج
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main card */}
          <div className="lg:col-span-2 card-light p-6">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="font-heading font-bold text-xl text-brand-textBody">{data.packageId?.nameAr}</h2>
                <div className="text-sm text-[#9b7fd6] mt-1">{data.packageId?.descriptionAr}</div>
              </div>
              <Badge variant={data.status === 'active' ? 'success' : data.status === 'paused' ? 'warning' : 'danger'}>
                {data.status === 'active' ? 'فعال' : data.status === 'paused' ? 'موقوف' : 'منتهي'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'تاريخ البدء', value: formatDateAr(data.startDate) },
                { label: 'تاريخ الانتهاء', value: formatDateAr(data.endDate) },
                { label: 'الحصص في الشهر', value: `${data.packageId?.sessionsPerMonth || 0} حصة` },
                { label: 'الحصص المتبقية', value: `${data.sessionsRemaining || 0} حصة` },
              ].map((item, i) => (
                <div key={i} className="p-4 rounded-xl bg-[#f8f5ff]">
                  <div className="text-xs text-[#9b7fd6]">{item.label}</div>
                  <div className="font-heading font-bold text-brand-textBody mt-1">{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Days remaining */}
          <div className="card-light p-6 flex flex-col items-center justify-center text-center">
            <div className="font-heading font-extrabold text-5xl text-brand-purple">
              {Math.max(0, Math.ceil((new Date(data.endDate) - new Date()) / (1000 * 60 * 60 * 24)))}
            </div>
            <div className="text-[#9b7fd6] mt-2 text-sm">يوم متبقي</div>
            <div className="w-full bg-[#f0ecf8] rounded-full h-2 mt-4">
              <div
                className="bg-purple-gradient h-2 rounded-full transition-all"
                style={{
                  width: `${Math.min(100, Math.max(0, ((new Date(data.endDate) - new Date()) / (new Date(data.endDate) - new Date(data.startDate))) * 100))}%`
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
