import { useQuery } from '@tanstack/react-query'
import { BookOpen } from 'lucide-react'
import api from '../../utils/api.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Spinner from '../../components/ui/Spinner.jsx'

const STATUS_LABEL = { active: 'نشط', expired: 'منتهي', cancelled: 'ملغى', paused: 'موقوف', pending: 'قيد الانتظار' }

export default function StudentAcademicPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['student', 'academic'],
    queryFn: () => api.get('/students/me/academic').then(r => r.data.data),
    placeholderData: { programs: [], current: null },
  })

  return (
    <div dir="rtl">
      <PageHeader title="مستواي الأكاديمي" subtitle="باقاتي الدراسية وتقدمي فيها" />

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner color="border-brand-purple" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Programs / subscriptions */}
          <div className="lg:col-span-2">
            <div className="card-light p-6">
              <h2 className="font-heading font-bold text-brand-textBody text-lg mb-5">باقاتي الدراسية</h2>
              {!data?.programs?.length ? (
                <div className="text-center py-10">
                  <BookOpen size={44} strokeWidth={1.3} color="#9b7fd6" className="mb-3 mx-auto" />
                  <p className="text-[#9b7fd6]">لا توجد باقات دراسية بعد</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.programs.map((prog) => (
                    <div key={prog._id} className="flex items-start gap-4 p-4 rounded-xl bg-[#f8f5ff]">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-brand-purple/10 flex-none">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="#7c3aed" strokeWidth="1.7" strokeLinecap="round"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" stroke="#7c3aed" strokeWidth="1.7" strokeLinejoin="round"/></svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-heading font-bold text-brand-textBody">{prog.packageNameAr || 'باقة دراسية'}</div>
                        <div className="text-sm text-[#9b7fd6] mt-0.5">
                          {prog.teacher ? `${prog.teacher.firstNameAr} ${prog.teacher.lastNameAr}` : '—'}
                        </div>
                        <div className="w-full bg-[#e8e0f5] rounded-full h-1.5 mt-3">
                          <div className="bg-purple-gradient h-1.5 rounded-full" style={{ width: `${prog.progressPercent || 0}%` }} />
                        </div>
                        <div className="text-xs text-[#9b7fd6] mt-1">
                          {prog.consumedSessions}/{prog.purchasedSessions} حصة ({prog.progressPercent || 0}% مكتمل) — {prog.remainingSessions} متبقية
                        </div>
                      </div>
                      <Badge variant={prog.status === 'active' ? 'purple' : 'gray'}>
                        {STATUS_LABEL[prog.status] || prog.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Current program summary */}
          <div className="card-light p-6">
            <h2 className="font-heading font-bold text-brand-textBody text-lg mb-5">البرنامج الحالي</h2>
            {data?.current ? (
              <div className="text-center">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}>
                  <span className="font-heading font-extrabold text-2xl text-white">{data.current.progressPercent || 0}%</span>
                </div>
                <div className="font-heading font-bold text-brand-textBody">{data.current.packageNameAr || 'باقة دراسية'}</div>
                <div className="text-sm text-[#9b7fd6] mt-1">
                  {data.current.teacher ? `${data.current.teacher.firstNameAr} ${data.current.teacher.lastNameAr}` : '—'}
                </div>
                <div className="text-xs text-[#9b7fd6] mt-1">{data.current.remainingSessions} حصة متبقية</div>
              </div>
            ) : (
              <div className="text-center py-6 text-[#9b7fd6] text-sm">لا يوجد برنامج نشط حالياً</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
