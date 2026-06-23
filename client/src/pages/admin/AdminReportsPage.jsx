import { useQuery } from '@tanstack/react-query'
import api from '../../utils/api.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import StatCard from '../../components/shared/StatCard.jsx'
import { formatCurrency, formatNumber } from '../../utils/format.js'
import { formatDateAr } from '../../utils/date.js'

export default function AdminReportsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'reports'],
    queryFn: () => api.get('/admin/reports').then(r => r.data.data),
    placeholderData: {
      revenue: { total: 0, thisMonth: 0, lastMonth: 0, growth: 0 },
      sessions: { total: 0, thisMonth: 0, completionRate: 0 },
      students: { total: 0, active: 0, new: 0 },
      attendance: { rate: 0 },
      topTeachers: [],
    },
  })

  return (
    <div dir="rtl">
      <PageHeader title="التقارير والإحصاءات" subtitle="نظرة شاملة على أداء المنصة" />

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner color="border-brand-purple" /></div>
      ) : (
        <div className="space-y-6">
          {/* Revenue */}
          <div>
            <h2 className="font-heading font-bold text-brand-textBody text-lg mb-4">الإيرادات</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="الإجمالي" value={formatCurrency(data?.revenue?.total)} color="#7c3aed" />
              <StatCard label="هذا الشهر" value={formatCurrency(data?.revenue?.thisMonth)} color="#22c55e" />
              <StatCard label="الشهر الماضي" value={formatCurrency(data?.revenue?.lastMonth)} color="#E8C76A" />
              <StatCard label="نسبة النمو" value={`${data?.revenue?.growth || 0}%`} color="#3b82f6" trend={data?.revenue?.growth} />
            </div>
          </div>

          {/* Sessions */}
          <div>
            <h2 className="font-heading font-bold text-brand-textBody text-lg mb-4">الحصص</h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard label="إجمالي الحصص" value={formatNumber(data?.sessions?.total)} color="#7c3aed" />
              <StatCard label="حصص هذا الشهر" value={formatNumber(data?.sessions?.thisMonth)} color="#E8C76A" />
              <StatCard label="نسبة الإكمال" value={`${data?.sessions?.completionRate || 0}%`} color="#22c55e" />
            </div>
          </div>

          {/* Students */}
          <div>
            <h2 className="font-heading font-bold text-brand-textBody text-lg mb-4">الطلاب</h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard label="إجمالي الطلاب" value={formatNumber(data?.students?.total)} color="#7c3aed" />
              <StatCard label="الطلاب النشطون" value={formatNumber(data?.students?.active)} color="#22c55e" />
              <StatCard label="طلاب جدد (الشهر)" value={formatNumber(data?.students?.new)} color="#3b82f6" trend={data?.students?.new} />
            </div>
          </div>

          {/* Top teachers */}
          {data?.topTeachers?.length > 0 && (
            <div className="card-light p-6">
              <h2 className="font-heading font-bold text-brand-textBody text-lg mb-4">أفضل المعلمين</h2>
              <div className="space-y-3">
                {data.topTeachers.map((t, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center font-heading font-bold text-sm flex-none" style={{ background: i === 0 ? '#E8C76A' : i === 1 ? '#9b9b9b' : '#cd7f32', color: '#000' }}>{i + 1}</div>
                    <div className="flex-1">
                      <div className="font-semibold text-brand-textBody text-sm">{t.firstNameAr} {t.lastNameAr}</div>
                    </div>
                    <div className="flex items-center gap-6 text-xs text-[#9b7fd6]">
                      <span>{t.studentCount} طالب</span>
                      <span>{t.sessionCount} حصة</span>
                      <span>متوسط تقييم: {t.avgEvaluation?.toFixed(1) || '—'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
