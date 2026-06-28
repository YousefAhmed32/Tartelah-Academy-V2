import { useQuery } from '@tanstack/react-query'
import { Calendar } from 'lucide-react'
import api from '../../utils/api.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import { formatDateAr, formatTimeAr, getDayNameAr, isToday } from '../../utils/date.js'

export default function StudentSchedulePage() {
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['sessions', 'upcoming'],
    queryFn: () => api.get('/sessions/upcoming').then(r => r.data.data),
  })

  const groupedByDay = sessions.reduce((acc, s) => {
    const date = new Date(s.scheduledAt).toDateString()
    if (!acc[date]) acc[date] = []
    acc[date].push(s)
    return acc
  }, {})

  return (
    <div dir="rtl">
      <PageHeader title="جدولي الدراسي" subtitle="جدول الحصص القادمة" />

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner color="border-brand-purple" /></div>
      ) : !sessions.length ? (
        <div className="card-light p-10 text-center">
          <Calendar size={44} strokeWidth={1.3} color="#9b7fd6" className="mb-3 mx-auto" />
          <p className="text-[#9b7fd6]">لا توجد حصص مجدولة قادمة</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByDay).map(([dateStr, daySessions]) => {
            const date = new Date(dateStr)
            const today = isToday(date)
            return (
              <div key={dateStr}>
                <div className={`flex items-center gap-3 mb-3 ${today ? 'text-brand-purple' : 'text-[#9b7fd6]'}`}>
                  <span className="font-heading font-bold">{getDayNameAr(date)}</span>
                  <span className="text-sm">{formatDateAr(date)}</span>
                  {today && <Badge variant="purple" dot>اليوم</Badge>}
                </div>
                <div className="space-y-2.5">
                  {daySessions.map((s) => (
                    <div key={s._id} className={`card-light p-4 flex items-center gap-4 ${today ? 'border-brand-purple/20' : ''}`}>
                      <div className="w-16 text-center flex-none">
                        <div className="font-heading font-bold text-brand-textBody text-base">{formatTimeAr(s.scheduledAt)}</div>
                        <div className="text-xs text-[#9b7fd6]">{s.durationMinutes} د</div>
                      </div>
                      <div className="w-px h-10 bg-[#e8e0f5] flex-none" />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-brand-textBody">{s.titleAr || s.title}</div>
                        <div className="text-xs text-[#9b7fd6] mt-0.5">{s.courseId?.nameAr}</div>
                      </div>
                      {s.meetingLink && (
                        <a href={s.meetingLink} target="_blank" rel="noopener noreferrer" className="btn-gold text-xs py-2 px-4">انضم</a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
