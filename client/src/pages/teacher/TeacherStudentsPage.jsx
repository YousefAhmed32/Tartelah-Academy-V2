import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Users, ChevronDown, CalendarClock, Wallet, ClipboardList,
  CheckCircle2, XCircle, Clock3, StickyNote, Link as LinkIcon,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '../../utils/api.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import EmptyState from '../../components/shared/EmptyState.jsx'
import ErrorState from '../../components/shared/ErrorState.jsx'
import { SkeletonCardGrid } from '../../components/ui/Skeleton.jsx'
import { toArray } from '../../utils/format.js'
import { getFileUrl, ROUTES } from '../../config/constants.js'
import { formatDateAr, formatDateTimeAr } from '../../utils/date.js'

const SESSION_STATUS_AR = {
  scheduled: 'قادمة', ongoing: 'جارية', completed: 'مكتملة',
  cancelled: 'ملغاة', rescheduled: 'أُجّلت', missed: 'فائتة', no_show: 'غياب',
}

function StatPill({ icon, value, label, color }) {
  return (
    <div className="rounded-xl bg-gray-50 px-2.5 py-2 text-center">
      <div className="flex items-center justify-center gap-1 font-bold text-sm" style={{ color: color || '#1f2937' }}>
        {icon} {value}
      </div>
      <div className="text-[10px] text-gray-400 mt-0.5">{label}</div>
    </div>
  )
}

/**
 * Rich per-student summary for the teacher's own roster (Phase 2 change
 * request #5) — lesson counts, attendance, upcoming/last lesson, wallet
 * balance, and recent notes, all visible without leaving this page. Every
 * card expands in place for detail; the name/avatar still link out to the
 * student's full (permitted) profile for anyone who wants more.
 */
export default function TeacherStudentsPage() {
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  const { data: students = [], isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['teacher', 'students'],
    queryFn: () => api.get('/teachers/me/students').then(r => toArray(r.data?.data)),
  })

  const filtered = toArray(students).filter(s =>
    `${s.firstNameAr} ${s.lastNameAr} ${s.email}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <PageHeader title="طلابي" subtitle={`${students.length} طالب مسجل`} />

      <div className="mb-5 max-w-sm">
        <div className="relative">
          <Search size={16} className="absolute top-1/2 -translate-y-1/2 end-3.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث عن طالب..."
            className="w-full h-10 bg-gray-50 border border-gray-200 rounded-xl pe-10 ps-4 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
          />
        </div>
      </div>

      {isLoading ? (
        <SkeletonCardGrid count={6} />
      ) : isError ? (
        <ErrorState onRetry={refetch} isRetrying={isFetching} />
      ) : !filtered.length ? (
        <EmptyState
          icon={<Users size={28} strokeWidth={1.6} />}
          title={search ? 'لا نتائج مطابقة' : 'لا يوجد طلاب بعد'}
          description={search ? `لم نجد طالباً باسم "${search}"` : 'سيظهر طلابك هنا بعد تعيينهم من قِبل الإدارة'}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((st, i) => {
            const attendance = st.attendanceRate || 0
            const attendanceColor = attendance >= 80 ? '#22c55e' : attendance >= 60 ? '#f59e0b' : '#ef4444'
            const expanded = expandedId === st._id
            return (
              <motion.div
                key={st._id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.3) }}
                className="rounded-2xl p-5 transition-all bg-white border border-gray-100 shadow-sm"
              >
                <div className="flex items-start gap-3 mb-3">
                  <Link to={ROUTES.TEACHER_STUDENT_DETAIL.replace(':studentId', st._id)} className="flex-none">
                    <Avatar src={getFileUrl(st.avatar)} firstName={st.firstNameAr} lastName={st.lastNameAr} size="md" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to={ROUTES.TEACHER_STUDENT_DETAIL.replace(':studentId', st._id)} className="font-heading font-bold text-gray-900 truncate hover:text-violet-600 transition-colors block">
                      {st.firstNameAr} {st.lastNameAr}
                    </Link>
                    <div className="text-xs mt-0.5 truncate text-gray-500">{st.email}</div>
                    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                      <Badge variant="purple">{st.courseLevel || 'مبتدئ'}</Badge>
                      {st.scheduleStatus === 'schedule_only' && <Badge variant="warning">جدول بلا اشتراك</Badge>}
                      {st.studentType === 'new' && <Badge variant="warning">طالب جديد</Badge>}
                    </div>
                  </div>
                  {st.walletRemaining !== null && st.walletRemaining !== undefined && (
                    <div className="flex-none text-center">
                      <div className="text-lg font-extrabold text-emerald-600">{st.walletRemaining}</div>
                      <div className="text-[10px] text-gray-400">حصة متبقية</div>
                    </div>
                  )}
                </div>

                {/* Attendance bar */}
                <div className="mt-1 mb-3">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs text-gray-500">نسبة الحضور</span>
                    <span className="text-xs font-bold" style={{ color: attendanceColor }}>{attendance}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-gray-100">
                    <div
                      className="h-1.5 rounded-full transition-all duration-700"
                      style={{ width: `${attendance}%`, background: attendanceColor }}
                    />
                  </div>
                </div>

                {/* Next/last lesson quick line — scannable without expanding */}
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
                  <CalendarClock size={13} className="flex-none text-violet-400" />
                  {st.nextSession ? (
                    <span>القادمة: {formatDateTimeAr(st.nextSession.scheduledAt)}</span>
                  ) : st.lastSession ? (
                    <span>آخر حصة: {formatDateAr(st.lastSession.scheduledAt)} ({SESSION_STATUS_AR[st.lastSession.status] || st.lastSession.status})</span>
                  ) : (
                    <span>لا توجد حصص مسجلة بعد</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : st._id)}
                  aria-expanded={expanded}
                  className="w-full flex items-center justify-between gap-2 min-h-[36px] text-xs font-bold text-violet-600 border-t border-gray-50 pt-2.5"
                >
                  <span>{expanded ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}</span>
                  <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-3 space-y-3">
                        <div className="grid grid-cols-4 gap-1.5">
                          <StatPill icon={<CheckCircle2 size={11} />} value={st.lessonsCompleted ?? 0} label="مكتملة" color="#059669" />
                          <StatPill icon={<ClipboardList size={11} />} value={st.lessonsUpcoming ?? 0} label="قادمة" color="#0891b2" />
                          <StatPill icon={<Clock3 size={11} />} value={st.lessonsCancelled ?? 0} label="مؤجلة/ملغاة" color="#d97706" />
                          <StatPill icon={<XCircle size={11} />} value={st.lessonsMissed ?? 0} label="فائتة" color="#dc2626" />
                        </div>
                        {st.packageName && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            <Wallet size={13} className="flex-none text-gray-400" /> الباقة: <span className="font-semibold">{st.packageName}</span>
                          </div>
                        )}
                        {st.lastEvaluation && (
                          <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                            <div className="flex items-center gap-1.5 font-bold mb-0.5">
                              <StickyNote size={12} /> آخر تقييم — {st.lastEvaluation.score ?? '—'}/10 ({formatDateAr(st.lastEvaluation.createdAt)})
                            </div>
                            {st.lastEvaluation.notesAr && <p className="line-clamp-2">{st.lastEvaluation.notesAr}</p>}
                          </div>
                        )}
                        <div className="flex items-center gap-3 flex-wrap pt-1">
                          <Link to={ROUTES.TEACHER_EVALUATIONS} className="text-[11px] font-bold text-violet-600 hover:underline flex items-center gap-1">
                            <LinkIcon size={11} /> كل التقييمات
                          </Link>
                          <Link to={ROUTES.TEACHER_SESSIONS} className="text-[11px] font-bold text-violet-600 hover:underline flex items-center gap-1">
                            <LinkIcon size={11} /> كل الحصص
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
