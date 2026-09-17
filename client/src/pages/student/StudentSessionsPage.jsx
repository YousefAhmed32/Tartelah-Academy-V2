import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Calendar, Clock, Timer, Link2, X, CheckCircle2, Wallet, Gift, BookOpen } from 'lucide-react'
import api from '../../utils/api.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import EmptyState from '../../components/shared/EmptyState.jsx'
import SessionLifecycleGuide from '../../components/shared/SessionLifecycleGuide.jsx'
import { formatDateAr, formatTimeAr, isFuture } from '../../utils/date.js'
import { SESSION_STATUS, SESSION_OUTCOME, MEETING_PROVIDERS } from '../../config/constants.js'

// A student can cancel their own upcoming session. Cancelling at least 12h
// before the scheduled time returns the lesson credit in full; cancelling
// later than that still deducts it (the slot was held for you) — see
// server/src/config/lessonPolicy.js for the exact rule.
const CANCELLABLE_SESSION_STATUSES = ['scheduled', 'missed', 'no_show']

function CancelSessionModal({ session, onClose }) {
  const qc = useQueryClient()
  const [reason, setReason] = useState('')
  const hoursUntil = (new Date(session.scheduledAt) - new Date()) / (60 * 60 * 1000)
  const withinFreeWindow = hoursUntil >= 12

  const mutation = useMutation({
    mutationFn: () => api.patch(`/sessions/${session._id}/cancel`, { reason, cancelledByRole: 'student' }),
    onSuccess: () => {
      toast.success('تم إلغاء الحصة')
      qc.invalidateQueries({ queryKey: ['sessions'] })
      qc.invalidateQueries({ queryKey: ['wallet'] })
      onClose()
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'حدث خطأ'),
  })

  return (
    <Modal open onClose={onClose} title="إلغاء الحصة" size="sm"
      footer={<>
        <Button variant="ghost" onClick={onClose} className="!bg-gray-100 !text-gray-600 hover:!bg-gray-200 !border-transparent">تراجع</Button>
        <Button variant="danger" onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!reason.trim()}>تأكيد الإلغاء</Button>
      </>}>
      <div className="space-y-3" dir="rtl">
        <div className={`p-3 rounded-xl text-sm ${withinFreeWindow ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
          {withinFreeWindow
            ? 'سيتم إرجاع الحصة إلى رصيدك لأنك تلغي قبل 12 ساعة من الموعد.'
            : 'سيتم خصم الحصة من رصيدك لأن الإلغاء بعد المهلة المسموحة (12 ساعة قبل الموعد).'}
        </div>
        <div>
          <label className="block text-xs font-bold text-brand-textBody mb-1.5">سبب الإلغاء *</label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} className="field-light resize-none w-full" placeholder="اكتب سبب الإلغاء..." />
        </div>
      </div>
    </Modal>
  )
}

const tabs = [
  { key: 'upcoming', label: 'القادمة' },
  { key: 'history', label: 'السابقة' },
]

export default function StudentSessionsPage() {
  const [tab, setTab] = useState('upcoming')
  const [showGuide, setShowGuide] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['sessions', tab],
    queryFn: () => api.get(`/sessions/${tab}`).then(r => r.data.data),
    placeholderData: [],
  })

  return (
    <div dir="rtl">
      <PageHeader title="حصصي" subtitle="جميع الحصص الدراسية"
        actions={
          <button
            onClick={() => setShowGuide(true)}
            className="flex items-center gap-2 h-10 px-4 text-xs font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200/80 rounded-xl transition-all shadow-sm cursor-pointer"
          >
            <BookOpen size={15} /> كيف تعمل الحصة؟
          </button>
        }
      />
      {showGuide && <SessionLifecycleGuide role="student" onClose={() => setShowGuide(false)} />}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#f0ecf8] p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-2 rounded-[10px] text-sm font-semibold transition-all ${tab === t.key ? 'bg-white text-brand-textBody shadow-sm' : 'text-[#7c6aaa] hover:text-brand-textBody'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner color="border-brand-purple" /></div>
      ) : !data?.length ? (
        <EmptyState
          icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.7"/><path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>}
          title="لا توجد حصص"
          description={tab === 'upcoming' ? 'لا توجد حصص قادمة في الوقت الحالي' : 'لا توجد حصص سابقة'}
        />
      ) : (
        <div className="space-y-3">
          {data.map((session) => (
            <SessionRow key={session._id} session={session} />
          ))}
        </div>
      )}
    </div>
  )
}

function SessionRow({ session }) {
  const [showCancel, setShowCancel] = useState(false)
  const status = SESSION_STATUS[session.status] || SESSION_STATUS.scheduled
  const provider = MEETING_PROVIDERS[session.meetingProvider]
  const canCancel = CANCELLABLE_SESSION_STATUSES.includes(session.status) && isFuture(session.scheduledAt)
  const outcome = session.outcome && session.outcome !== 'pending_review' ? SESSION_OUTCOME[session.outcome] : null
  // The teacher checking in (session.controller.js#startSession) is
  // operational evidence only — never claimed here as proof the lesson
  // actually happened, just that the teacher declared readiness/joined
  // through the platform. See docs/SESSION_LIFECYCLE_GUIDE_AR.md.
  const teacherCheckedIn = ['ongoing', 'completed'].includes(session.status) && ['on_time', 'late'].includes(session.teacherAttendanceStatus)

  return (
    <div className="card-light p-5 flex items-center gap-4 flex-wrap">
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center flex-none"
        style={{ background: `${status.color}15` }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2.5" stroke={status.color} strokeWidth="1.7"/><path d="M3 9h18M8 3v4M16 3v4" stroke={status.color} strokeWidth="1.7" strokeLinecap="round"/></svg>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-heading font-bold text-brand-textBody">{session.titleAr || session.title}</span>
          {(session.isPostponed || Boolean(session.rescheduledFrom)) && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
              ⏱️ حصة مؤجلة
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-[#7c6aaa]">
          <span className="flex items-center gap-1"><Calendar size={13} strokeWidth={1.8} /> {formatDateAr(session.scheduledAt)}</span>
          <span className="flex items-center gap-1"><Clock size={13} strokeWidth={1.8} /> {formatTimeAr(session.scheduledAt)}</span>
          <span className="flex items-center gap-1"><Timer size={13} strokeWidth={1.8} /> {session.durationMinutes} دقيقة</span>
          {provider && <span className="flex items-center gap-1" style={{ color: provider.color }}><Link2 size={13} strokeWidth={1.8} /> {provider.label}</span>}
          {teacherCheckedIn && (
            <span className="flex items-center gap-1 text-emerald-600 font-semibold"><CheckCircle2 size={13} strokeWidth={1.8} /> سجّل المعلم حضوره</span>
          )}
        </div>
        {/* Recorded outcome + wallet effect — real fields already on the
            session document, never a second guess of what the teacher
            recorded. Payroll/compensation amounts are deliberately excluded
            (private to the academy/teacher). */}
        {(outcome || session.status === 'completed') && (
          <div className="flex items-center gap-3 mt-1.5 flex-wrap text-[11px]">
            {outcome && <span className="font-semibold" style={{ color: outcome.color }}>{outcome.label}</span>}
            {session.status === 'completed' && (
              <span className="flex items-center gap-1 text-gray-500">
                <Wallet size={12} strokeWidth={1.8} />
                {session.subscriptionConsumed ? 'خُصمت حصة من رصيدك' : 'لم تُخصم حصة من رصيدك'}
              </span>
            )}
            {session.compensationRequired && (
              <span className="flex items-center gap-1 text-emerald-600 font-semibold"><Gift size={12} strokeWidth={1.8} /> أُضيفت حصة تعويضية لرصيدك</span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Badge variant={session.status === 'completed' ? 'gray' : session.status === 'cancelled' ? 'danger' : 'purple'}>
          {status.label}
        </Badge>
        {session.meetingLink && isFuture(session.scheduledAt) && session.status === 'scheduled' && (
          <a
            href={session.meetingLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-gold text-xs py-2 px-4"
          >
            انضم للحصة
          </a>
        )}
        {canCancel && (
          <button
            onClick={() => setShowCancel(true)}
            className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-700 px-3 py-2 rounded-xl hover:bg-red-50 transition-colors"
          >
            <X size={13} /> إلغاء
          </button>
        )}
      </div>
      {showCancel && <CancelSessionModal session={session} onClose={() => setShowCancel(false)} />}
    </div>
  )
}
