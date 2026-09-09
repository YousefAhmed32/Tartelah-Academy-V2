import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight, CheckCircle2, XCircle, Wallet, CalendarClock, StickyNote, BookOpen,
} from 'lucide-react'
import api from '../../utils/api.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import ErrorState from '../../components/shared/ErrorState.jsx'
import { formatDateAr, formatDateTimeAr } from '../../utils/date.js'
import { getFileUrl, ROUTES } from '../../config/constants.js'

const SESSION_STATUS_AR = {
  scheduled: 'قادمة', ongoing: 'جارية', completed: 'مكتملة',
  cancelled: 'ملغاة', rescheduled: 'أُجّلت', missed: 'فائتة', no_show: 'غياب',
}
const QUALITY_AR = { excellent: 'ممتاز', good: 'جيد', fair: 'مقبول', weak: 'ضعيف' }
const REPORT_STATUS_AR = {
  draft: 'مسودة', submitted: 'بانتظار المراجعة', correction_requested: 'يحتاج تعديل', approved: 'معتمد',
}

const TAB_KEYS = ['sessions', 'evaluations', 'memorization', 'revision', 'reports']
const TAB_LABELS = {
  sessions: 'الحصص', evaluations: 'التقييمات', memorization: 'الحفظ', revision: 'المراجعة', reports: 'تقارير الحلقات',
}

/**
 * Teacher-facing single-student detail (Phase 2 §8). Scoped entirely to
 * /teachers/me/students/:studentId on the backend — only students currently
 * assigned to this teacher (active Subscription or ScheduleRule) resolve,
 * and every list here (sessions/evaluations/memorization/revision/reports)
 * is filtered to this teacher only. No pricing, guardian data, or other
 * teachers' history is fetched or shown — read-only academic overview.
 */
export default function TeacherStudentDetailPage() {
  const { studentId } = useParams()
  const [tab, setTab] = useState('sessions')

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['teacher', 'student', studentId],
    queryFn: () => api.get(`/teachers/me/students/${studentId}`).then(r => r.data?.data),
  })

  if (isLoading) return <div className="flex justify-center py-16"><Spinner color="border-brand-purple" /></div>
  if (isError || !data) return <ErrorState onRetry={refetch} isRetrying={isFetching} />

  const st = data.student
  const attendanceColor = data.attendanceRate >= 80 ? '#22c55e' : data.attendanceRate >= 60 ? '#f59e0b' : '#ef4444'

  return (
    <div dir="rtl" className="space-y-6">
      <Link to={ROUTES.TEACHER_STUDENTS} className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-600 hover:underline">
        <ArrowRight size={15} /> رجوع لطلابي
      </Link>

      <PageHeader title={`${st.firstNameAr} ${st.lastNameAr}`} subtitle={data.packageName || (data.scheduleStatus === 'schedule_only' ? 'جدول بلا اشتراك' : '')} />

      <div className="card-light p-5">
        <div className="flex items-start gap-4 flex-wrap">
          <Avatar src={getFileUrl(st.avatar)} firstName={st.firstNameAr} lastName={st.lastNameAr} size="lg" />
          <div className="flex-1 min-w-[200px]">
            <div className="font-heading font-bold text-lg text-gray-900">{st.firstNameAr} {st.lastNameAr}</div>
            <div className="flex items-center gap-2 flex-wrap mt-2">
              <Badge variant="purple">{st.courseLevel || 'مبتدئ'}</Badge>
              {data.scheduleStatus === 'schedule_only' && <Badge variant="warning">جدول بلا اشتراك</Badge>}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-lg font-extrabold" style={{ color: attendanceColor }}>{data.attendanceRate}%</div>
              <div className="text-[11px] text-gray-400">نسبة الحضور</div>
            </div>
            <div>
              <div className="text-lg font-extrabold text-emerald-600">{data.lessonsCompleted}</div>
              <div className="text-[11px] text-gray-400">حصص مكتملة</div>
            </div>
            {data.walletRemaining !== null && (
              <div>
                <div className="text-lg font-extrabold text-gray-800 flex items-center justify-center gap-1"><Wallet size={14} className="text-gray-400" />{data.walletRemaining}</div>
                <div className="text-[11px] text-gray-400">حصة متبقية</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-gray-100 overflow-x-auto">
        {TAB_KEYS.map(k => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ${tab === k ? 'border-brand-purple text-brand-purple' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
          >
            {TAB_LABELS[k]}
          </button>
        ))}
      </div>

      {tab === 'sessions' && (
        <div className="space-y-4">
          {data.upcomingSessions?.length > 0 && (
            <div>
              <div className="text-xs font-bold text-gray-400 mb-2">القادمة</div>
              <div className="space-y-2">
                {data.upcomingSessions.map(s => (
                  <div key={s._id} className="card-light p-3 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-gray-700"><CalendarClock size={14} className="text-violet-400" />{formatDateTimeAr(s.scheduledAt)}</span>
                    <Badge variant="purple">{SESSION_STATUS_AR[s.status] || s.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <div className="text-xs font-bold text-gray-400 mb-2">السابقة</div>
            {!data.recentSessions?.length ? (
              <p className="text-sm text-gray-400 py-6 text-center">لا توجد حصص سابقة</p>
            ) : (
              <div className="space-y-2">
                {data.recentSessions.map(s => (
                  <div key={s._id} className="card-light p-3 flex items-center justify-between text-sm">
                    <span className="text-gray-700">{formatDateTimeAr(s.scheduledAt)}</span>
                    <Badge variant={s.status === 'completed' ? 'success' : s.status === 'missed' || s.status === 'no_show' ? 'danger' : 'gray'}>
                      {SESSION_STATUS_AR[s.status] || s.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'evaluations' && (
        !data.evaluations?.length ? <p className="text-sm text-gray-400 py-10 text-center">لا توجد تقييمات بعد</p> : (
          <div className="space-y-2">
            {data.evaluations.map(ev => (
              <div key={ev._id} className="card-light p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-gray-800 flex items-center gap-1.5"><StickyNote size={13} className="text-amber-500" />{ev.score ?? '—'}/10</span>
                  <span className="text-xs text-gray-400">{formatDateAr(ev.createdAt)}</span>
                </div>
                {ev.notesAr && <p className="text-sm text-gray-600">{ev.notesAr}</p>}
              </div>
            ))}
          </div>
        )
      )}

      {(tab === 'memorization' || tab === 'revision') && (
        (() => {
          const items = tab === 'memorization' ? data.memorizations : data.revisions
          return !items?.length ? <p className="text-sm text-gray-400 py-10 text-center">لا توجد سجلات بعد</p> : (
            <div className="space-y-2">
              {items.map(it => (
                <div key={it._id} className="card-light p-3 flex items-center justify-between text-sm flex-wrap gap-1">
                  <span className="text-gray-700">سورة رقم {it.surahNumber} — آية {it.fromAyah} إلى {it.toAyah}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={it.quality === 'excellent' || it.quality === 'good' ? 'success' : it.quality === 'fair' ? 'warning' : 'danger'}>{QUALITY_AR[it.quality] || it.quality}</Badge>
                    <span className="text-xs text-gray-400">{formatDateAr(it.recordedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )
        })()
      )}

      {tab === 'reports' && (
        !data.reports?.length ? (
          <div className="text-center py-10">
            <BookOpen size={32} strokeWidth={1.4} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">لا توجد تقارير حلقات بعد</p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.reports.map(r => (
              <div key={r._id} className="card-light p-3 flex items-center justify-between text-sm">
                <span className="text-gray-700">{formatDateAr(r.createdAt)}</span>
                <Badge variant={r.status === 'approved' ? 'success' : r.status === 'correction_requested' ? 'danger' : 'warning'}>
                  {REPORT_STATUS_AR[r.status] || r.status}
                </Badge>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
