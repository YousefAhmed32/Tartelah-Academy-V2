import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ClipboardCheck, Phone } from 'lucide-react'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import { formatDateAr } from '../../utils/date.js'
import { surveyService } from '../../services/survey.service.js'

const RENEWAL_LABELS = { yes: { label: 'ينوي التجديد', variant: 'success' }, no: { label: 'لا ينوي التجديد', variant: 'danger' }, undecided: { label: 'لم يقرر', variant: 'warning' } }

export default function AdminSurveysPage() {
  const [needsFollowUp, setNeedsFollowUp] = useState(true)
  const qc = useQueryClient()

  const { data: aggregate } = useQuery({ queryKey: ['admin', 'surveys', 'aggregate'], queryFn: () => surveyService.getAggregate({}).then(r => r.data.data) })
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'surveys', needsFollowUp],
    queryFn: () => surveyService.getAll({ status: 'completed', requestAdminContact: needsFollowUp ? true : undefined, limit: 30 }).then(r => r.data.data),
  })

  const followUpMut = useMutation({
    mutationFn: (id) => surveyService.markFollowedUp(id),
    onSuccess: () => { toast.success('تم تسجيل المتابعة'); qc.invalidateQueries({ queryKey: ['admin', 'surveys'] }) },
    onError: (err) => toast.error(err.response?.data?.message || 'حدث خطأ'),
  })

  const surveys = data?.surveys || []
  const avg = (n) => (n ? n.toFixed(1) : '—')

  return (
    <div dir="rtl" className="space-y-6">
      <PageHeader title="استبيانات التقييم والتجديد" subtitle="نتائج استبيانات الطلاب قبل التجديد" />

      {aggregate?.count > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            ['التزام المعلم', aggregate.avgTeacherCommitment], ['متابعة الأكاديمية', aggregate.avgAcademyFollowUp],
            ['جودة التقارير', aggregate.avgReportQuality], ['تقدّم الطالب', aggregate.avgStudentProgress],
            ['التوصية بنا', aggregate.avgRecommendLikelihood],
          ].map(([label, value], i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="text-xs text-gray-400 font-semibold mb-1">{label}</div>
              <div className="text-lg font-bold text-gray-900">{avg(value)} / 5</div>
            </div>
          ))}
        </div>
      )}
      {aggregate?.count > 0 && (
        <div className="text-xs text-gray-500">{aggregate.count} استبيان مكتمل — {aggregate.renewYes} ينوون التجديد، {aggregate.renewNo} لا ينوون</div>
      )}

      <div className="flex gap-2">
        <button onClick={() => setNeedsFollowUp(true)} className={`px-4 py-2 rounded-xl text-sm font-semibold ${needsFollowUp ? 'bg-brand-purple text-white' : 'bg-white text-[#7c6aaa] border border-[#e8e0f5]'}`}>يحتاج متابعة</button>
        <button onClick={() => setNeedsFollowUp(false)} className={`px-4 py-2 rounded-xl text-sm font-semibold ${!needsFollowUp ? 'bg-brand-purple text-white' : 'bg-white text-[#7c6aaa] border border-[#e8e0f5]'}`}>الكل</button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner color="border-brand-purple" /></div>
      ) : !surveys.length ? (
        <div className="card-light p-12 text-center">
          <ClipboardCheck size={48} strokeWidth={1.3} color="#7c6aaa" className="mb-4 mx-auto" />
          <p className="text-[#7c6aaa] text-sm">لا توجد استبيانات</p>
        </div>
      ) : (
        <div className="space-y-2">
          {surveys.map(s => (
            <div key={s._id} className="card-light p-4 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <Avatar firstName={s.studentId?.firstNameAr} lastName={s.studentId?.lastNameAr} size="sm" />
                  <div>
                    <div className="font-semibold text-sm text-brand-textBody">{s.studentId?.firstNameAr} {s.studentId?.lastNameAr}</div>
                    <div className="text-xs text-[#7c6aaa]">معلم: {s.teacherId?.firstNameAr} — {formatDateAr(s.completedAt)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {s.renewalIntention && <Badge variant={RENEWAL_LABELS[s.renewalIntention]?.variant}>{RENEWAL_LABELS[s.renewalIntention]?.label}</Badge>}
                  {s.requestTeacherChange && <Badge variant="warning">طلب تغيير معلم</Badge>}
                  {s.requestAdminContact && <Badge variant="danger">طلب تواصل</Badge>}
                </div>
              </div>
              {s.notes && <p className="text-sm text-gray-600">{s.notes}</p>}
              {!s.followedUpAt && (s.requestAdminContact || s.requestTeacherChange) && (
                <Button size="sm" variant="outline" icon={<Phone size={13} />} loading={followUpMut.isPending} onClick={() => followUpMut.mutate(s._id)}>تم التواصل/المتابعة</Button>
              )}
              {s.followedUpAt && <span className="text-xs text-emerald-600 font-semibold">تمت المتابعة</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
