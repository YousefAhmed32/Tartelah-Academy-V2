import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Radio, Clock, UserX, Link2Off, Timer, ClipboardCheck, CheckCircle2, Ban,
  ShieldAlert, ChevronDown, RefreshCw, Eye, Check, X, AlertTriangle, Wifi,
  TrendingUp, Users, Wallet, ArrowLeft, Send, ListChecks, CalendarClock,
} from 'lucide-react'
import { Link as RouterLink } from 'react-router-dom'
import api from '../../utils/api.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import EmptyState from '../../components/shared/EmptyState.jsx'
import ErrorState from '../../components/shared/ErrorState.jsx'
import Pagination from '../../components/ui/Pagination.jsx'
import AttendanceStatusBadge from '../../components/ui/AttendanceStatusBadge.jsx'
import { formatDateAr, formatTimeAr, formatDateTimeAr } from '../../utils/date.js'
import { formatCurrency } from '../../utils/format.js'
import { SESSION_STATUS, PAYROLL_STATUS, REVIEW_SEVERITY, REVIEW_STATE, CONFIDENCE_LEVEL, ROUTES, getFileUrl } from '../../config/constants.js'

const inputCls = 'h-9 bg-gray-50 border border-gray-200 rounded-xl px-3 text-sm text-gray-700 outline-none focus:border-violet-400 cursor-pointer'

// ── Small building blocks ──────────────────────────────────────────────────

function StatTile({ label, value, Icon, color, onClick, tone = 'neutral' }) {
  // `tone` drives a subtle left-edge accent so the grid reads by urgency at a
  // glance (critical/warning/info/positive/neutral) instead of every tile
  // looking equally important.
  const toneBorder = {
    critical: value > 0 ? '#ef444440' : '#f3f4f6',
    warning: value > 0 ? '#f59e0b40' : '#f3f4f6',
    info: '#e5e7eb',
    positive: '#e5e7eb',
    neutral: '#f3f4f6',
  }[tone]
  return (
    <button onClick={onClick} disabled={!onClick}
      className={`text-start bg-white rounded-2xl p-3.5 border shadow-sm transition-all ${onClick ? 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer' : 'cursor-default'}`}
      style={{ borderColor: toneBorder }}>
      <div className="flex items-center justify-between mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon size={15} style={{ color }} strokeWidth={2} />
        </div>
        {(tone === 'critical' || tone === 'warning') && value > 0 && (
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} />
        )}
      </div>
      <div className="font-heading font-extrabold text-xl text-gray-900">{value ?? 0}</div>
      <div className="text-[11px] text-gray-500 mt-0.5 leading-tight">{label}</div>
    </button>
  )
}

function HealthCard({ label, value, Icon, color, sub, rateBased }) {
  // For rate-based metrics (percentages), color reflects whether the number
  // itself is good/borderline/bad — not a fixed brand color — so a 30%
  // attendance rate reads as alarming even though the card layout is calm.
  let displayColor = color
  if (rateBased && typeof value === 'number') {
    displayColor = value >= 80 ? '#22c55e' : value >= 50 ? '#f59e0b' : '#ef4444'
  }
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-none" style={{ background: `${displayColor}15` }}>
        <Icon size={18} style={{ color: displayColor }} strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <div className="font-heading font-extrabold text-lg text-gray-900 leading-none" style={{ color: rateBased ? displayColor : undefined }}>
          {value === null || value === undefined ? '—' : rateBased ? `${value}%` : value}
        </div>
        <div className="text-[11px] text-gray-500 mt-1 truncate">{label}</div>
        {sub && <div className="text-[10px] text-gray-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

function CriticalAlertBanner({ count, onClick }) {
  if (!count) return null
  return (
    <motion.button
      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-start transition-all hover:shadow-md"
      style={{ background: 'linear-gradient(90deg, #fef2f2, #fff)', border: '1px solid #fecaca' }}
    >
      <div className="w-9 h-9 rounded-xl bg-red-500 flex items-center justify-center flex-none">
        <AlertTriangle size={17} className="text-white" />
      </div>
      <div className="flex-1">
        <div className="font-bold text-red-800 text-sm">
          {count} {count === 1 ? 'حصة تحتاج تدخلاً فورياً' : 'حصص تحتاج تدخلاً فورياً'}
        </div>
        <div className="text-xs text-red-500 mt-0.5">بيانات متعارضة تحتاج مراجعة الإدارة مباشرة — لا تنتظر</div>
      </div>
      <ArrowLeft size={16} className="text-red-400 flex-none" />
    </motion.button>
  )
}

function PersonPair({ session }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <Avatar src={getFileUrl(session.teacherId?.avatar)} firstName={session.teacherId?.firstNameAr} lastName={session.teacherId?.lastNameAr} size="xs" />
      <div className="min-w-0">
        <div className="text-sm font-semibold text-gray-900 truncate">{session.teacherId?.firstNameAr} {session.teacherId?.lastNameAr}</div>
        <div className="text-xs text-gray-400 truncate">مع {session.studentId?.firstNameAr} {session.studentId?.lastNameAr}</div>
      </div>
    </div>
  )
}

// One reason config per source bucket in the "needs attention" feed —
// severity drives sort order (higher first) when a session is only in one
// bucket; sessions in multiple buckets show every relevant badge on one row.
const ATTENTION_REASONS = {
  missingCheckIn: { label: 'لم يسجّل المعلم حضوره', color: '#ef4444', Icon: UserX, severity: 3 },
  noShow: { label: 'المعلم لم يحضر الحصة', color: '#ef4444', Icon: UserX, severity: 3 },
  lateTeachers: { label: 'تأخر المعلم عن الموعد', color: '#f59e0b', Icon: Timer, severity: 2 },
  missingLink: { label: 'بلا رابط اجتماع', color: '#f59e0b', Icon: Link2Off, severity: 2 },
  attendancePending: { label: 'حضور بانتظار الاعتماد', color: '#0ea5e9', Icon: ClipboardCheck, severity: 1 },
}

function buildAttentionFeed(sections) {
  const map = new Map()
  for (const [bucketKey, reason] of Object.entries(ATTENTION_REASONS)) {
    for (const s of sections[bucketKey] || []) {
      const entry = map.get(s._id) || { session: s, reasons: [] }
      entry.reasons.push(reason)
      map.set(s._id, entry)
    }
  }
  return [...map.values()].sort((a, b) => {
    const maxA = Math.max(...a.reasons.map(r => r.severity))
    const maxB = Math.max(...b.reasons.map(r => r.severity))
    if (maxA !== maxB) return maxB - maxA
    return new Date(a.session.scheduledAt) - new Date(b.session.scheduledAt)
  })
}

function AttentionFeedRow({ entry, onOpenReview }) {
  const { session, reasons } = entry
  return (
    <div className="flex items-center gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100/70 transition-colors">
      <PersonPair session={session} />
      <div className="flex-1 flex flex-wrap gap-1.5 justify-end">
        {reasons.map((r, i) => (
          <span key={i} className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full flex-none"
            style={{ background: `${r.color}15`, color: r.color }}>
            <r.Icon size={10} /> {r.label}
          </span>
        ))}
      </div>
      <div className="text-end flex-none w-16">
        <div className="text-xs font-bold text-gray-700">{formatTimeAr(session.scheduledAt)}</div>
      </div>
      <button onClick={() => onOpenReview(session)} title="مراجعة"
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-none bg-white border border-gray-200 hover:border-violet-300 hover:bg-violet-50 transition-colors">
        <Eye size={13} className="text-gray-400" />
      </button>
    </div>
  )
}

// ── Live Now tab ────────────────────────────────────────────────────────────

function LiveTab({ onGoToTimeline, onGoToReview }) {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'operations', 'live'],
    queryFn: () => api.get('/operations/live').then(r => r.data.data),
    // Lightweight periodic refresh — no websockets needed for an admin
    // glance view; the existing platform has no realtime session-state
    // push channel, and one is not warranted just for this.
    refetchInterval: 60000,
  })

  const attentionFeed = useMemo(() => data ? buildAttentionFeed(data.sections) : [], [data])

  if (isLoading) return <div className="flex justify-center py-16"><Spinner color="border-violet-600" /></div>
  if (isError) return <ErrorState onRetry={refetch} isRetrying={isFetching} />

  const c = data.counts
  const h = data.health

  return (
    <div className="space-y-5">
      <CriticalAlertBanner count={c.criticalReviewCount} onClick={onGoToReview} />

      {/* Operational health — "is the platform healthy right now", not just "what's broken" */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <HealthCard label="نسبة حضور الطلاب اليوم" value={h.attendanceRateToday} Icon={TrendingUp} color="#22c55e" rateBased
          sub={h.attendanceRateToday === null ? 'لا بيانات بعد' : undefined} />
        <HealthCard label="التزام المعلمين بالموعد" value={h.teacherOnTimeRateToday} Icon={CheckCircle2} color="#7c3aed" rateBased
          sub={h.teacherOnTimeRateToday === null ? 'لا بيانات بعد' : undefined} />
        <HealthCard label="إيرادات اليوم" value={formatCurrency(h.revenueToday, 'SAR')} Icon={Wallet} color="#0ea5e9" />
        <HealthCard label="متصل الآن" value={h.onlineNow.teacher + h.onlineNow.student} Icon={Wifi} color="#f59e0b"
          sub={`${h.onlineNow.teacher} معلم · ${h.onlineNow.student} طالب`} />
      </div>

      {/* Stat grid — colored by urgency (critical → warning → info → positive/neutral) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatTile label="جارية الآن" value={c.liveNow} Icon={Radio} color="#22c55e" tone="positive" onClick={() => onGoToTimeline({ status: 'ongoing' })} />
        <StatTile label="تبدأ قريباً" value={c.startingSoon} Icon={Clock} color="#7c3aed" tone="info" onClick={() => onGoToTimeline({ status: 'scheduled' })} />
        <StatTile label="لم يسجّل المعلم حضوره" value={c.missingCheckIn} Icon={UserX} color="#ef4444" tone="critical" onClick={onGoToReview} />
        <StatTile label="المعلم لم يحضر" value={c.noShow} Icon={UserX} color="#ef4444" tone="critical" onClick={() => onGoToTimeline({ status: 'no_show' })} />
        <StatTile label="بلا رابط اجتماع" value={c.missingLink} Icon={Link2Off} color="#f59e0b" tone="warning" onClick={onGoToReview} />
        <StatTile label="معلمون متأخرون" value={c.lateTeachers} Icon={Timer} color="#f59e0b" tone="warning" onClick={() => onGoToTimeline({})} />
        <StatTile label="حضور بانتظار الاعتماد" value={c.attendancePending} Icon={ClipboardCheck} color="#0ea5e9" tone="warning" onClick={() => onGoToTimeline({ status: 'completed' })} />
        <StatTile label="غياب طلاب اليوم" value={c.studentAbsencesToday} Icon={UserX} color="#f59e0b" tone="warning" onClick={() => onGoToTimeline({ status: 'completed' })} />
        <StatTile label="اكتملت اليوم" value={c.recentlyCompleted} Icon={CheckCircle2} color="#22c55e" tone="positive" onClick={() => onGoToTimeline({ status: 'completed' })} />
        <StatTile label="ملغاة / معاد جدولتها" value={c.cancelledOrRescheduled} Icon={Ban} color="#6b7280" tone="neutral" onClick={() => onGoToTimeline({ status: 'cancelled' })} />
      </div>

      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-wrap items-center gap-3">
        <ShieldAlert size={16} className="text-amber-500 flex-none" />
        <span className="text-sm text-gray-700">
          <b className="text-gray-900">{c.needsReviewCount}</b> حصة بحاجة مراجعة (آخر 14 يوماً)
          {c.criticalReviewCount > 0 && <span className="text-red-600"> — {c.criticalReviewCount} حرجة</span>}
          {c.highReviewCount > 0 && <span className="text-orange-600"> — {c.highReviewCount} عالية الأولوية</span>}
        </span>
        <span className="text-sm text-gray-500 me-auto">
          <b className="text-gray-900">{c.payrollReviewCount}</b> حصة تنتظر قرار الإدارة بشأن الراتب
        </span>
        <button onClick={onGoToReview} className="text-xs font-bold text-violet-600 hover:text-violet-800 flex items-center gap-1">
          فتح قائمة المراجعة <ArrowLeft size={12} />
        </button>
      </div>

      {/* Quick actions — the "what should I do next" surface */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => onGoToTimeline({})} className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-gray-200 text-gray-600 hover:border-violet-300 hover:text-violet-700 transition-colors">
          <CalendarClock size={13} /> الجدول الزمني الكامل
        </button>
        <button onClick={onGoToReview} className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-gray-200 text-gray-600 hover:border-violet-300 hover:text-violet-700 transition-colors">
          <ListChecks size={13} /> قائمة المراجعة الكاملة
        </button>
        <RouterLink to={ROUTES.ADMIN_NOTIFICATIONS} className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-gray-200 text-gray-600 hover:border-violet-300 hover:text-violet-700 transition-colors">
          <Send size={13} /> إرسال إشعار جماعي
        </RouterLink>
      </div>

      {/* Unified "needs attention" feed — one sorted list instead of 5 boxes repeating the same sessions */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <ShieldAlert size={15} className="text-gray-400" />
          <span className="text-sm font-bold text-gray-800">يحتاج انتباهك الآن</span>
          {attentionFeed.length > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{attentionFeed.length}</span>
          )}
        </div>
        {attentionFeed.length ? (
          <div className="space-y-2">
            <AnimatePresence>
              {attentionFeed.map(entry => (
                <motion.div key={entry.session._id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <AttentionFeedRow entry={entry} onOpenReview={onGoToReview} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <EmptyState icon={<CheckCircle2 size={26} strokeWidth={1.6} />} title="لا شيء يحتاج انتباهك الآن" description="جميع حصص اليوم إما مكتملة أو ما زالت ضمن الجدول الطبيعي" />
        )}
      </div>
    </div>
  )
}

// ── Timeline tab ────────────────────────────────────────────────────────────

function TimelineRow({ session }) {
  const [open, setOpen] = useState(false)
  const statusInfo = SESSION_STATUS[session.status] || SESSION_STATUS.scheduled
  const payrollInfo = PAYROLL_STATUS[session.payrollStatus]
  const reviewInfo = session.reviewState ? REVIEW_STATE[session.reviewState] : null

  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
      <button onClick={() => setOpen(p => !p)} className="w-full flex items-center gap-3 p-3.5 text-start">
        <div className="text-xs font-bold text-gray-400 w-14 flex-none">{formatTimeAr(session.scheduledAt)}</div>
        <PersonPair session={session} />
        <div className="flex items-center gap-1.5 flex-wrap ms-auto flex-none">
          {session.teacherAttendanceStatus && session.teacherAttendanceStatus !== 'pending' && (
            <AttendanceStatusBadge status={session.teacherAttendanceStatus} size="sm" />
          )}
          {payrollInfo && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${payrollInfo.color}18`, color: payrollInfo.color }}>{payrollInfo.label}</span>
          )}
          {reviewInfo && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${reviewInfo.color}18`, color: reviewInfo.color }}>{reviewInfo.label}</span>
          )}
          {session.reviewAssessment && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${REVIEW_SEVERITY[session.reviewAssessment.severity].color}18`, color: REVIEW_SEVERITY[session.reviewAssessment.severity].color }}>
              يحتاج مراجعة
            </span>
          )}
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: statusInfo.bg, color: statusInfo.color }}>{statusInfo.label}</span>
          <ChevronDown size={13} className="text-gray-400 transition-transform" style={{ transform: open ? 'rotate(180deg)' : '' }} />
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-50 space-y-2 text-xs text-gray-600">
          <div>{session.titleAr}</div>
          {session.meetingLink ? (
            <div>رابط الاجتماع: <span className="text-violet-600">{session.meetingProvider}</span></div>
          ) : (
            <div className="text-amber-600">لا يوجد رابط اجتماع مسجّل</div>
          )}
          {session.teacherStartedAt && <div>سجّل المعلم حضوره: {formatDateTimeAr(session.teacherStartedAt)}</div>}
          {session.attendanceFinalizedAt && <div>اعتماد حضور الطالب: {formatDateTimeAr(session.attendanceFinalizedAt)}</div>}
          {session.payrollStatusReason && <div className="text-gray-500">سبب حالة الراتب: {session.payrollStatusReason}</div>}

          {session.confidence && (
            <div className="flex items-start gap-2 pt-1">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-none"
                style={{ background: `${CONFIDENCE_LEVEL[session.confidence.level].color}18`, color: CONFIDENCE_LEVEL[session.confidence.level].color }}>
                {CONFIDENCE_LEVEL[session.confidence.level].label}
              </span>
              <span className="text-gray-400">— ليست إثباتاً لحضور فعلي داخل الاجتماع الخارجي، بل مؤشر على توفر الأدلة التشغيلية</span>
            </div>
          )}

          {session.reviewAssessment && (
            <ul className="list-disc list-inside text-amber-700">
              {session.reviewAssessment.reasons.map((r, i) => <li key={i}>{r.label}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function TimelineTab({ initialFilters = {} }) {
  const [date, setDate] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const [status, setStatus] = useState(initialFilters.status || '')
  const [payrollStatus, setPayrollStatus] = useState('')
  const [needsReview, setNeedsReview] = useState(!!initialFilters.needsReview)
  const [page, setPage] = useState(1)

  const { data: teachers = [] } = useQuery({
    queryKey: ['admin', 'teachers', 'all'],
    queryFn: () => api.get('/admin/teachers?limit=100').then(r => r.data.data),
    staleTime: 5 * 60 * 1000,
  })

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'operations', 'timeline', date, teacherId, status, payrollStatus, needsReview, page],
    queryFn: () => {
      const p = new URLSearchParams({ page, limit: 20 })
      if (date) p.set('date', date)
      if (teacherId) p.set('teacherId', teacherId)
      if (status) p.set('status', status)
      if (payrollStatus) p.set('payrollStatus', payrollStatus)
      if (needsReview) p.set('needsReview', 'true')
      return api.get(`/operations/timeline?${p}`).then(r => r.data)
    },
    placeholderData: (prev) => prev,
  })

  const sessions = data?.data || []

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-wrap items-center gap-2.5">
        <input type="date" className={inputCls} value={date} onChange={e => { setDate(e.target.value); setPage(1) }} />
        <select className={inputCls} value={teacherId} onChange={e => { setTeacherId(e.target.value); setPage(1) }}>
          <option value="">كل المعلمين</option>
          {teachers.map(t => <option key={t._id} value={t._id}>{t.firstNameAr} {t.lastNameAr}</option>)}
        </select>
        <select className={inputCls} value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}>
          <option value="">كل الحالات</option>
          {Object.entries(SESSION_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className={inputCls} value={payrollStatus} onChange={e => { setPayrollStatus(e.target.value); setPage(1) }}>
          <option value="">كل حالات الاستحقاق</option>
          {Object.entries(PAYROLL_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button onClick={() => { setNeedsReview(p => !p); setPage(1) }}
          className={`h-9 px-3 rounded-xl text-sm font-semibold border transition-colors ${needsReview ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
          يحتاج مراجعة فقط
        </button>
        {!date && <span className="text-xs text-gray-400">افتراضياً: آخر 3 أيام + القادمة 3 أيام</span>}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner color="border-violet-600" /></div>
      ) : isError ? (
        <ErrorState onRetry={refetch} isRetrying={isFetching} />
      ) : !sessions.length ? (
        <EmptyState title="لا توجد حصص مطابقة" description="جرّب تغيير الفلاتر أو النطاق الزمني" />
      ) : (
        <div className="space-y-2">
          {sessions.map(s => <TimelineRow key={s._id} session={s} />)}
        </div>
      )}

      {data?.totalPages > 1 && (
        <div className="flex justify-center"><Pagination current={page} total={data.totalPages} onChange={setPage} /></div>
      )}
    </div>
  )
}

// ── Review Queue tab ─────────────────────────────────────────────────────────

const ATT_STATUSES = ['pending', 'on_time', 'late', 'absent', 'excused']

function InlineCorrectionForm({ session, onDone }) {
  const qc = useQueryClient()
  const [attStatus, setAttStatus] = useState(session.teacherAttendanceStatus || 'pending')
  const [payrollStatus, setPayrollStatus] = useState(session.payrollStatus || 'pending')
  const [reason, setReason] = useState('')

  const mut = useMutation({
    mutationFn: () => api.patch(`/teacher-performance/admin/session/${session._id}/attendance`, {
      status: attStatus, payrollStatus, payrollStatusReason: reason || undefined, notes: reason || undefined,
    }),
    onSuccess: () => {
      toast.success('تم حفظ التصحيح')
      qc.invalidateQueries({ queryKey: ['admin', 'operations'] })
      onDone?.()
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'حدث خطأ'),
  })

  return (
    <div className="mt-2 p-3 rounded-xl bg-gray-50 border border-gray-100 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <select className={inputCls + ' w-full'} value={attStatus} onChange={e => setAttStatus(e.target.value)}>
          {ATT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className={inputCls + ' w-full'} value={payrollStatus} onChange={e => setPayrollStatus(e.target.value)}>
          {Object.entries(PAYROLL_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>
      <input value={reason} onChange={e => setReason(e.target.value)} placeholder="سبب التصحيح (سيظهر للمعلم)"
        className="w-full h-9 bg-white border border-gray-200 rounded-xl px-3 text-sm outline-none focus:border-violet-400" />
      <button onClick={() => mut.mutate()} disabled={mut.isPending}
        className="w-full h-9 rounded-xl text-sm font-bold bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-60">
        {mut.isPending ? '...' : 'حفظ التصحيح'}
      </button>
    </div>
  )
}

function ReviewQueueItem({ item }) {
  const qc = useQueryClient()
  const [showCorrection, setShowCorrection] = useState(false)
  const session = item.session
  const sev = REVIEW_SEVERITY[item.severity]

  const actionMut = useMutation({
    mutationFn: (action) => api.patch(`/operations/review/${session._id}`, { action }).then(r => r.data),
    onSuccess: (_res, action) => {
      toast.success(action === 'dismiss' ? 'تم تجاهل التنبيه' : action === 'resolve' ? 'تم اعتماد المراجعة' : 'تم التحديث')
      qc.invalidateQueries({ queryKey: ['admin', 'operations'] })
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'حدث خطأ'),
  })

  return (
    <div className="rounded-2xl bg-white border shadow-sm overflow-hidden" style={{ borderColor: `${sev.color}35` }}>
      <div className="p-4">
        <div className="flex items-start gap-3 flex-wrap">
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full flex-none" style={{ background: `${sev.color}18`, color: sev.color }}>{sev.label}</span>
          <div className="flex-1 min-w-[200px]">
            <PersonPair session={session} />
          </div>
          <div className="text-xs text-gray-400 flex-none">
            {formatDateAr(session.scheduledAt)} • {formatTimeAr(session.scheduledAt)}
          </div>
        </div>

        <ul className="mt-3 space-y-1">
          {item.reasons.map((r, i) => (
            <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
              <span className="w-1 h-1 rounded-full bg-gray-400 mt-1.5 flex-none" />
              {r.label}
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap gap-2 mt-3">
          {session.reviewState !== 'in_review' && (
            <button onClick={() => actionMut.mutate('start_review')} disabled={actionMut.isPending}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors">
              <Eye size={12} /> بدء المراجعة
            </button>
          )}
          <button onClick={() => setShowCorrection(p => !p)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors">
            <ShieldAlert size={12} /> تصحيح
          </button>
          <button onClick={() => actionMut.mutate('resolve')} disabled={actionMut.isPending}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors">
            <Check size={12} /> اعتماد كمُراجَعة
          </button>
          <button onClick={() => actionMut.mutate('dismiss')} disabled={actionMut.isPending}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors">
            <X size={12} /> تجاهل
          </button>
        </div>

        {showCorrection && <InlineCorrectionForm session={session} onDone={() => setShowCorrection(false)} />}
      </div>
    </div>
  )
}

function ReviewQueueTab() {
  const [severity, setSeverity] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'operations', 'review-queue', severity, page],
    queryFn: () => {
      const p = new URLSearchParams({ page, limit: 15 })
      if (severity) p.set('severity', severity)
      return api.get(`/operations/review-queue?${p}`).then(r => r.data)
    },
    placeholderData: (prev) => prev,
  })

  const items = data?.data || []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button onClick={() => { setSeverity(''); setPage(1) }}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${!severity ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-500'}`}>
          الكل
        </button>
        {Object.entries(REVIEW_SEVERITY).map(([k, v]) => (
          <button key={k} onClick={() => { setSeverity(k); setPage(1) }}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ background: severity === k ? v.color : `${v.color}12`, color: severity === k ? 'white' : v.color }}>
            {v.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner color="border-violet-600" /></div>
      ) : isError ? (
        <ErrorState onRetry={refetch} isRetrying={isFetching} />
      ) : !items.length ? (
        <EmptyState icon={<CheckCircle2 size={28} strokeWidth={1.6} />} title="لا توجد عناصر بحاجة مراجعة" description="كل الحصص ضمن آخر 14 يوماً إما سليمة أو تم التعامل معها" />
      ) : (
        <div className="space-y-3">
          {items.map(item => <ReviewQueueItem key={item.session._id} item={item} />)}
        </div>
      )}

      {data?.totalPages > 1 && (
        <div className="flex justify-center"><Pagination current={page} total={data.totalPages} onChange={setPage} /></div>
      )}
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function AdminOperationsCenterPage() {
  const [tab, setTab] = useState('live')
  const [timelineFilters, setTimelineFilters] = useState({})
  const [timelineKey, setTimelineKey] = useState(0)

  const TABS = [
    { key: 'live', label: 'الآن' },
    { key: 'timeline', label: 'الجدول الزمني' },
    { key: 'review', label: 'قائمة المراجعة' },
  ]

  function goToTimeline(filters) {
    setTimelineFilters(filters)
    setTimelineKey(k => k + 1)
    setTab('timeline')
  }

  function goToReview() {
    setTab('review')
  }

  return (
    <div dir="rtl" className="space-y-5 max-w-[1400px]">
      <PageHeader title="مركز العمليات" subtitle="نظرة تشغيلية فورية على الأكاديمية — ما يحدث الآن وما يحتاج إجراءً" />

      <div className="flex gap-1.5 p-1 rounded-xl w-fit bg-gray-100">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-[10px] text-sm font-semibold transition-all ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'live' && <LiveTab onGoToTimeline={goToTimeline} onGoToReview={goToReview} />}
      {tab === 'timeline' && <TimelineTab key={timelineKey} initialFilters={timelineFilters} />}
      {tab === 'review' && <ReviewQueueTab />}
    </div>
  )
}
