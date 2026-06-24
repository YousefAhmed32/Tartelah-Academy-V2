import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../utils/api.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Button from '../../components/ui/Button.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import { timeFromNow } from '../../utils/date.js'
import { useNotificationStore } from '../../store/notificationStore.js'

const TYPE_CONFIG = {
  session:      { label: 'حصة', color: '#7c3aed', bg: '#f0ebff', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.8"/><path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> },
  homework:     { label: 'واجب', color: '#3b82f6', bg: '#eff6ff', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M8 4h8l3 3v13H5V4h3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  evaluation:   { label: 'تقييم', color: '#d97706', bg: '#fffbeb', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 18l-6.2 3 1.2-6.8L2 9.3l6.9-1L12 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg> },
  subscription: { label: 'اشتراك', color: '#059669', bg: '#ecfdf5', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="2" y="6" width="20" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.8"/><path d="M2 10h20" stroke="currentColor" strokeWidth="1.8"/></svg> },
  enrollment:   { label: 'تسجيل', color: '#b45309', bg: '#fffbeb', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg> },
  system:       { label: 'نظام', color: '#7c6aaa', bg: '#f8f5ff', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9Z" stroke="currentColor" strokeWidth="1.8"/><path d="M10 21a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8"/></svg> },
}

const FILTER_TABS = [
  { key: 'all', label: 'الكل' },
  { key: 'unread', label: 'غير مقروءة' },
  { key: 'session', label: 'الحصص' },
  { key: 'evaluation', label: 'التقييمات' },
  { key: 'homework', label: 'الواجبات' },
  { key: 'system', label: 'النظام' },
]

function groupByDate(notifications) {
  const todayStr = new Date().toDateString()
  const yestStr = new Date(Date.now() - 86400000).toDateString()
  const result = {}
  for (const n of notifications) {
    const d = new Date(n.createdAt).toDateString()
    const key = d === todayStr ? 'اليوم' : d === yestStr ? 'الأمس' : 'سابقاً'
    if (!result[key]) result[key] = []
    result[key].push(n)
  }
  return result
}

export default function StudentNotificationsPage() {
  const [filter, setFilter] = useState('all')
  const qc = useQueryClient()
  const { markAllRead, markRead } = useNotificationStore()

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', 'me'],
    queryFn: () => api.get('/notifications').then(r => r.data.data),
  })

  const markAllMutation = useMutation({
    mutationFn: () => api.patch('/notifications/mark-all-read'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); markAllRead() },
  })

  function handleMarkRead(notif) {
    if (notif.isRead) return
    markRead(notif._id)
    api.patch(`/notifications/${notif._id}/read`).catch(() => {})
    qc.setQueryData(['notifications', 'me'], (old) =>
      old?.map(n => n._id === notif._id ? { ...n, isRead: true } : n)
    )
  }

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.isRead
    if (filter === 'all') return true
    return n.type === filter
  })

  const unreadCount = notifications.filter(n => !n.isRead).length
  const grouped = groupByDate(filtered)

  return (
    <div>
      <PageHeader
        title="الإشعارات"
        subtitle={unreadCount > 0 ? `${unreadCount} إشعار غير مقروء` : 'جميع الإشعارات مقروءة'}
        actions={
          unreadCount > 0 && (
            <Button size="sm" variant="ghost" onClick={() => markAllMutation.mutate()} loading={markAllMutation.isPending}>
              تحديد الكل كمقروء
            </Button>
          )
        }
      />

      {/* Filter Tabs */}
      <div className="flex gap-1.5 flex-wrap mb-5 p-1 rounded-xl w-fit" style={{ background: '#f0ecf8' }}>
        {FILTER_TABS.map(tab => {
          const count = tab.key === 'unread'
            ? unreadCount
            : tab.key === 'all'
            ? notifications.length
            : notifications.filter(n => n.type === tab.key).length
          if (count === 0 && tab.key !== 'all' && tab.key !== 'unread') return null
          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3.5 py-1.5 rounded-[10px] text-xs font-semibold transition-all flex items-center gap-1.5 ${
                filter === tab.key
                  ? 'bg-brand-purple text-white shadow-sm'
                  : 'text-brand-textBody/60 hover:text-brand-textBody'
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  filter === tab.key ? 'bg-white/20 text-white' : 'bg-brand-purple/10 text-brand-purple'
                }`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner color="border-brand-purple" /></div>
      ) : !filtered.length ? (
        <div className="card-light p-16 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#ede9ff' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-brand-purple">
              <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9Z" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M10 21a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </div>
          <p className="font-semibold text-brand-textBody mb-1">
            {filter === 'unread' ? 'جميع الإشعارات مقروءة' : 'لا توجد إشعارات'}
          </p>
          <p className="text-sm text-[#9b7fd6]">
            {filter === 'unread' ? 'أحسنت! لا يوجد إشعارات غير مقروءة' : 'ستظهر إشعاراتك هنا'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([dateLabel, items]) => (
            <div key={dateLabel}>
              <div className="text-xs font-bold mb-3 px-1 text-[#9b7fd6] uppercase tracking-widest">{dateLabel}</div>
              <div className="space-y-2">
                {items.map((notif) => {
                  const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.system
                  return (
                    <div
                      key={notif._id}
                      onClick={() => handleMarkRead(notif)}
                      className="flex items-start gap-4 p-4 rounded-2xl transition-all cursor-pointer hover:shadow-sm"
                      style={{
                        background: !notif.isRead ? '#fff' : '#faf8ff',
                        border: `1px solid ${!notif.isRead ? '#e0d4f7' : '#f0ecf8'}`,
                        boxShadow: !notif.isRead ? '0 2px 12px rgba(124,58,237,0.07)' : 'none',
                      }}
                    >
                      {/* Icon */}
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-none"
                        style={{ background: config.bg, color: config.color }}
                      >
                        {config.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className={`font-semibold text-sm leading-snug ${!notif.isRead ? 'text-brand-textBody' : 'text-brand-textBody/50'}`}>
                            {notif.titleAr || notif.title}
                          </div>
                          <span className="text-[10px] flex-none mt-0.5 text-[#9b7fd6]">
                            {timeFromNow(notif.createdAt)}
                          </span>
                        </div>
                        {notif.bodyAr && (
                          <p className={`text-xs mt-1 line-clamp-2 ${!notif.isRead ? 'text-[#6b5a8e]' : 'text-[#c0b4de]'}`}>
                            {notif.bodyAr}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: config.bg, color: config.color }}
                          >
                            {config.label}
                          </span>
                          {!notif.isRead && (
                            <span className="text-[10px] text-brand-purple font-semibold">جديد</span>
                          )}
                        </div>
                      </div>

                      {/* Unread dot */}
                      {!notif.isRead && (
                        <div className="w-2.5 h-2.5 rounded-full flex-none mt-1.5 bg-brand-purple" />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
