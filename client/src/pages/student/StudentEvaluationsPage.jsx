import { useQuery } from '@tanstack/react-query'
import api from '../../utils/api.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import EmptyState from '../../components/shared/EmptyState.jsx'
import { formatDateAr } from '../../utils/date.js'
import { scoreToGrade } from '../../utils/format.js'

export default function StudentEvaluationsPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['evaluations', 'me'],
    queryFn: () => api.get('/evaluations/student/me').then(r => r.data.data),
  })

  const typeLabels = {
    tajweed: 'التجويد',
    hifz: 'الحفظ',
    nazra: 'القراءة',
    behavior: 'السلوك',
    general: 'عام',
  }

  return (
    <div dir="rtl">
      <PageHeader title="التقييمات" subtitle="تقييمات المعلم لتقدمك الدراسي" />

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner color="border-brand-purple" /></div>
      ) : !data.length ? (
        <EmptyState
          icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M5 4h14v16l-7-3-7 3V4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg>}
          title="لا توجد تقييمات"
          description="لم يتم إضافة أي تقييمات بعد"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.map((ev) => {
            const grade = scoreToGrade(ev.score)
            return (
              <div key={ev._id} className="card-light p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="font-heading font-bold text-brand-textBody">{typeLabels[ev.type] || ev.type}</div>
                    <div className="text-xs text-[#9b7fd6] mt-0.5">{formatDateAr(ev.createdAt)}</div>
                  </div>
                  <div className="text-center">
                    <div className="font-heading font-extrabold text-2xl" style={{ color: grade.color }}>{ev.score}</div>
                    <div className="text-xs text-[#9b7fd6]">من ١٠</div>
                  </div>
                </div>
                <div className="w-full bg-[#f0ecf8] rounded-full h-1.5 mb-3">
                  <div className="h-1.5 rounded-full transition-all" style={{ width: `${ev.score * 10}%`, background: grade.color }} />
                </div>
                {ev.notesAr && <p className="text-sm text-[#9b7fd6] leading-relaxed">{ev.notesAr}</p>}
                {ev.strengths?.length > 0 && (
                  <div className="mt-3">
                    <span className="text-xs font-semibold text-emerald-600">نقاط القوة: </span>
                    <span className="text-xs text-[#9b7fd6]">{ev.strengths.join(' • ')}</span>
                  </div>
                )}
                {ev.improvements?.length > 0 && (
                  <div className="mt-1.5">
                    <span className="text-xs font-semibold text-amber-600">للتحسين: </span>
                    <span className="text-xs text-[#9b7fd6]">{ev.improvements.join(' • ')}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
