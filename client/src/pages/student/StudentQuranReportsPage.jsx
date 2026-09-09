import { useQuery } from '@tanstack/react-query'
import { BookOpen } from 'lucide-react'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import { formatDateAr } from '../../utils/date.js'
import { quranReportService } from '../../services/quranReport.service.js'

export default function StudentQuranReportsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['student', 'quran-reports'],
    queryFn: () => quranReportService.getMyStudentReports({ limit: 30 }).then(r => r.data.data),
  })
  const reports = data?.reports || []

  if (isLoading) return <div className="flex justify-center pt-20"><Spinner color="border-brand-purple" /></div>

  return (
    <div dir="rtl">
      <PageHeader title="تقارير حلقاتي" subtitle="تقارير المعلم عن حلقاتك القرآنية" />
      {!reports.length ? (
        <div className="card-light p-12 text-center">
          <BookOpen size={48} strokeWidth={1.3} color="#7c6aaa" className="mb-4 mx-auto" />
          <p className="text-[#7c6aaa] text-sm">لا توجد تقارير بعد</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(r => (
            <div key={r._id} className="card-light p-5">
              <div className="flex items-center gap-3 mb-3">
                <Avatar firstName={r.teacherId?.firstNameAr} lastName={r.teacherId?.lastNameAr} size="sm" />
                <div>
                  <div className="font-semibold text-sm text-brand-textBody">{r.teacherId?.firstNameAr} {r.teacherId?.lastNameAr}</div>
                  <div className="text-xs text-[#7c6aaa]">{formatDateAr(r.sessionId?.scheduledAt || r.createdAt)}</div>
                </div>
              </div>
              <div className="text-sm space-y-1.5">
                {r.tajweedNotes && <div><b className="text-[#7c6aaa]">التجويد:</b> {r.tajweedNotes}</div>}
                {r.interactiveActivity && <div><b className="text-[#7c6aaa]">النشاط:</b> {r.interactiveActivity}</div>}
                {r.nextSessionHomework && <div><b className="text-[#7c6aaa]">واجب الحصة القادمة:</b> {r.nextSessionHomework}</div>}
                {r.teacherNotes && <div><b className="text-[#7c6aaa]">ملاحظات المعلم:</b> {r.teacherNotes}</div>}
                {r.referenceLink && <div><a href={r.referenceLink} target="_blank" rel="noreferrer" className="text-brand-purple underline">رابط مرجعي</a></div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
