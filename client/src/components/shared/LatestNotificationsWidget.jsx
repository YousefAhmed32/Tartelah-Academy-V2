import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, ChevronLeft } from 'lucide-react'
import { useNotificationStore } from '../../store/notificationStore.js'
import { timeFromNow } from '../../utils/date.js'
import { NOTIFICATION_TYPE_CONFIG } from '../../config/notificationTypes.js'
import { ROUTES } from '../../config/constants.js'
import api from '../../utils/api.js'

// Where a notification's click should navigate, per role and type — the
// notification model has an `actionUrl` field for a precise deep link, but
// nothing in the codebase sets it yet, so this type-based fallback is what
// actually fires in practice today. Kept intentionally coarse (section
// pages, not single-item deep links) since no per-item detail routes exist
// for sessions/homework/etc. in this app yet.
const TYPE_ROUTES = {
  teacher: {
    session: ROUTES.TEACHER_SESSIONS, schedule: ROUTES.TEACHER_SESSIONS, attendance: ROUTES.TEACHER_SESSIONS,
    homework: ROUTES.TEACHER_HOMEWORK, evaluation: ROUTES.TEACHER_EVALUATIONS,
    subscription: ROUTES.TEACHER_PERFORMANCE, payment: ROUTES.TEACHER_PERFORMANCE,
    enrollment: ROUTES.TEACHER_STUDENTS,
  },
  student: {
    session: ROUTES.STUDENT_SESSIONS, schedule: ROUTES.STUDENT_SCHEDULE, attendance: ROUTES.STUDENT_SESSIONS,
    homework: ROUTES.STUDENT_HOMEWORK, evaluation: ROUTES.STUDENT_EVALUATIONS,
    subscription: ROUTES.STUDENT_SUBSCRIPTION, payment: ROUTES.STUDENT_SUBSCRIPTION,
    enrollment: ROUTES.STUDENT_ENROLLMENT,
  },
}

// Compact "latest notifications" card for the Home Dashboard (teacher +
// student). Deliberately reuses the SAME live data source as the header
// bell (`useNotificationStore`) instead of a separate fetch — the store is
// already kept fresh app-wide via a socket push (`notification:new`) plus a
// 60s reconciliation poll (see hooks/useNotificationInit.js), so this
// widget auto-refreshes for free and can never drift out of sync with the
// bell's unread count.
export default function LatestNotificationsWidget({ role, viewAllPath, limit = 5 }) {
  const navigate = useNavigate()
  const { notifications, markRead } = useNotificationStore()
  const items = notifications.slice(0, limit)

  function handleClick(notif) {
    if (!notif.isRead) {
      markRead(notif._id)
      api.patch(`/notifications/${notif._id}/read`).catch(() => {})
    }
    const dest = notif.actionUrl || TYPE_ROUTES[role]?.[notif.type]
    if (dest) navigate(dest)
  }

  return (
    <div className="card-light p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading font-bold text-base text-brand-textBody flex items-center gap-2">
          <Bell size={16} strokeWidth={1.8} className="text-brand-purple" />
          آخر الإشعارات
        </h2>
        <button
          onClick={() => navigate(viewAllPath)}
          className="text-xs font-semibold text-brand-purple hover:text-brand-purpleDark transition-colors flex items-center gap-0.5"
        >
          عرض الكل <ChevronLeft size={12} />
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-8">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
            style={{ background: 'rgba(124,58,237,0.08)' }}
          >
            <Bell size={20} strokeWidth={1.6} color="#c0b4de" />
          </div>
          <p className="text-sm font-semibold text-brand-textBody">لا توجد إشعارات</p>
          <p className="text-xs text-[#9b7fd6] mt-0.5">ستظهر إشعاراتك هنا فور وصولها</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {items.map((notif, i) => {
              const cfg = NOTIFICATION_TYPE_CONFIG[notif.type] || NOTIFICATION_TYPE_CONFIG.system
              const isUnread = !notif.isRead
              return (
                <motion.button
                  key={notif._id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.3 }}
                  onClick={() => handleClick(notif)}
                  className="w-full flex items-start gap-3 p-3 rounded-xl text-start transition-all hover:-translate-y-0.5"
                  style={{
                    background: isUnread ? 'rgba(124,58,237,0.05)' : '#faf8ff',
                    border: `1px solid ${isUnread ? 'rgba(124,58,237,0.18)' : '#f0ecf8'}`,
                  }}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-none" style={{ background: cfg.bg }}>
                    <cfg.Icon size={16} strokeWidth={1.8} color={cfg.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="text-sm truncate"
                        style={{ fontWeight: isUnread ? 700 : 500, color: isUnread ? '#1d0a3f' : '#7c6aaa' }}
                      >
                        {notif.titleAr || notif.title}
                      </span>
                      {isUnread && <span className="w-2 h-2 rounded-full flex-none" style={{ background: cfg.dot }} />}
                    </div>
                    {notif.bodyAr && (
                      <p className="text-xs text-[#9b7fd6] truncate mt-0.5">{notif.bodyAr}</p>
                    )}
                    <span className="text-[11px] text-[#c0b4de] mt-1 block">{timeFromNow(notif.createdAt)}</span>
                  </div>
                </motion.button>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
