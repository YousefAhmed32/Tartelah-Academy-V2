import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar, FileText, Star, CreditCard, UserRound,
  Bell, LayoutGrid, Inbox, Search, CircleCheck, Clock3,
  Archive, ArchiveRestore, CalendarClock, Tag, ChevronDown,
} from 'lucide-react'
import api from '../../utils/api.js'
import PageHeader from '../shared/PageHeader.jsx'
import Spinner from '../ui/Spinner.jsx'
import { timeFromNow } from '../../utils/date.js'
import { useNotificationStore } from '../../store/notificationStore.js'
import {
  NOTIFICATION_TYPE_CONFIG as TYPE_CONFIG,
  NOTIFICATION_PRIORITY_CONFIG as PRIORITY_CONFIG,
} from '../../config/notificationTypes.js'

const FILTER_TABS = [
  { key: 'all',          label: 'الكل',        Icon: LayoutGrid  },
  { key: 'unread',       label: 'غير مقروءة',  Icon: Inbox       },
  { key: 'session',      label: 'الحصص',        Icon: Calendar    },
  { key: 'homework',     label: 'الواجبات',     Icon: FileText    },
  { key: 'evaluation',   label: 'التقييمات',    Icon: Star        },
  { key: 'enrollment',   label: 'التسجيل',      Icon: UserRound   },
  { key: 'subscription', label: 'الاشتراك',     Icon: CreditCard  },
  { key: 'attendance',   label: 'الحضور',       Icon: Clock3      },
  { key: 'system',       label: 'النظام',       Icon: Bell        },
]

function groupByDate(notifications) {
  const todayStr = new Date().toDateString()
  const yestStr = new Date(Date.now() - 86400000).toDateString()
  const result = { 'اليوم': [], 'الأمس': [], 'سابقاً': [] }
  for (const n of notifications) {
    const d = new Date(n.createdAt).toDateString()
    const key = d === todayStr ? 'اليوم' : d === yestStr ? 'الأمس' : 'سابقاً'
    result[key].push(n)
  }
  return result
}

function groupByCategory(notifications) {
  const result = {}
  for (const n of notifications) {
    const key = TYPE_CONFIG[n.type]?.label || TYPE_CONFIG.system.label
    if (!result[key]) result[key] = []
    result[key].push(n)
  }
  return result
}

// Within a group, surface urgent/high-priority items first without fully
// discarding recency — a same-priority tie keeps the original (newest-first) order.
function sortByPriorityThenDate(items) {
  return [...items].sort((a, b) => {
    const pa = PRIORITY_CONFIG[a.priority]?.rank ?? 2
    const pb = PRIORITY_CONFIG[b.priority]?.rank ?? 2
    if (pa !== pb) return pa - pb
    return new Date(b.createdAt) - new Date(a.createdAt)
  })
}

export default function NotificationCenter({ theme = 'light' }) {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [groupMode, setGroupMode] = useState('day') // 'day' | 'category'
  const [showArchived, setShowArchived] = useState(false)
  const qc = useQueryClient()
  const isDark = theme === 'dark'
  const { markRead, markUnread, markAllRead, removeNotification } = useNotificationStore()

  const { data: raw = {}, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ['notifications', 'center', filter, showArchived],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: 100, isArchived: showArchived ? 'true' : 'false' })
      if (filter === 'unread') params.set('isRead', 'false')
      else if (filter !== 'all') params.set('type', filter)
      const r = await api.get(`/notifications?${params}`)
      return r.data?.data || {}
    },
    staleTime: 30 * 1000,
  })

  const notifications = Array.isArray(raw?.notifications) ? raw.notifications : []

  const filtered = useMemo(() => {
    if (!search.trim()) return notifications
    const q = search.trim().toLowerCase()
    return notifications.filter(n =>
      (n.titleAr || '').toLowerCase().includes(q) ||
      (n.bodyAr || '').toLowerCase().includes(q)
    )
  }, [notifications, search])

  const grouped = useMemo(() => {
    const groups = groupMode === 'category' ? groupByCategory(filtered) : groupByDate(filtered)
    const sorted = {}
    for (const [key, items] of Object.entries(groups)) sorted[key] = sortByPriorityThenDate(items)
    return sorted
  }, [filtered, groupMode])

  const unreadCount = notifications.filter(n => !n.isRead).length

  function invalidateAll() {
    qc.invalidateQueries({ queryKey: ['notifications'] })
  }

  const markAllMutation = useMutation({
    mutationFn: () => api.patch('/notifications/mark-all-read'),
    onSuccess: () => {
      markAllRead()
      invalidateAll()
    },
  })

  const deleteReadMutation = useMutation({
    mutationFn: () => api.delete('/notifications/read'),
    onSuccess: invalidateAll,
  })

  const bulkUpdateMutation = useMutation({
    mutationFn: ({ ids, action }) => api.patch('/notifications/bulk', { ids: [...ids], action }),
    onSuccess: () => {
      setSelected(new Set())
      invalidateAll()
    },
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids) => api.delete('/notifications/bulk', { data: { ids: [...ids] } }),
    onSuccess: () => {
      for (const id of selected) removeNotification(id)
      setSelected(new Set())
      invalidateAll()
    },
  })

  const archiveMutation = useMutation({
    mutationFn: ({ id, archived }) => api.patch(`/notifications/${id}/${archived ? 'unarchive' : 'archive'}`),
    onSuccess: (_, { id }) => {
      removeNotification(id)
      invalidateAll()
    },
  })

  function handleMarkRead(notif) {
    if (notif.isRead) return
    markRead(notif._id)
    api.patch(`/notifications/${notif._id}/read`).catch(() => {})
    qc.setQueryData(['notifications', 'center', filter, showArchived], old => ({
      ...old,
      notifications: (old?.notifications || []).map(n => n._id === notif._id ? { ...n, isRead: true } : n),
    }))
  }

  function handleMarkUnread(notif) {
    if (!notif.isRead) return
    markUnread(notif._id)
    api.patch(`/notifications/${notif._id}/unread`).catch(() => {})
    qc.setQueryData(['notifications', 'center', filter, showArchived], old => ({
      ...old,
      notifications: (old?.notifications || []).map(n => n._id === notif._id ? { ...n, isRead: false } : n),
    }))
  }

  function handleDelete(id) {
    removeNotification(id)
    api.delete(`/notifications/${id}`).catch(() => {})
    qc.setQueryData(['notifications', 'center', filter, showArchived], old => ({
      ...old,
      notifications: (old?.notifications || []).filter(n => n._id !== id),
    }))
  }

  function handleArchive(notif) {
    archiveMutation.mutate({ id: notif._id, archived: showArchived })
  }

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const allVisibleSelected = filtered.length > 0 && selected.size === filtered.length
  function toggleSelectAll() {
    setSelected(allVisibleSelected ? new Set() : new Set(filtered.map(n => n._id)))
  }

  const cardBase = isDark
    ? { base: 'rgba(255,255,255,0.025)', unread: 'rgba(124,58,237,0.08)', border: 'rgba(255,255,255,0.07)', unreadBorder: 'rgba(232,199,106,0.2)' }
    : { base: '#fff', unread: 'rgba(124,58,237,0.035)', border: '#f0ecf8', unreadBorder: '#e0d4f7' }

  return (
    <div>
      <PageHeader
        title="مركز الإشعارات"
        subtitle={unreadCount > 0 ? `${unreadCount} إشعار غير مقروء` : 'جميع الإشعارات مقروءة'}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowArchived(v => !v); setSelected(new Set()) }}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all"
              style={{
                background: showArchived
                  ? (isDark ? '#E8C76A' : '#7c3aed')
                  : (isDark ? 'rgba(255,255,255,0.06)' : '#f0ecf8'),
                color: showArchived
                  ? (isDark ? '#1d0a3f' : '#fff')
                  : (isDark ? 'rgba(255,255,255,0.6)' : '#7c6aaa'),
              }}
            >
              {showArchived ? <ArchiveRestore size={13} /> : <Archive size={13} />}
              {showArchived ? 'العودة للوارد' : 'الأرشيف'}
            </button>
            {!showArchived && unreadCount > 0 && (
              <button
                onClick={() => markAllMutation.mutate()}
                disabled={markAllMutation.isPending}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl transition-all"
                style={{
                  background: isDark ? 'rgba(232,199,106,0.1)' : 'rgba(124,58,237,0.08)',
                  color: isDark ? '#E8C76A' : '#7c3aed',
                  border: `1px solid ${isDark ? 'rgba(232,199,106,0.2)' : 'rgba(124,58,237,0.15)'}`,
                }}
              >
                {markAllMutation.isPending ? '...' : 'تحديد الكل كمقروء'}
              </button>
            )}
            {!showArchived && (
              <button
                onClick={() => deleteReadMutation.mutate()}
                disabled={deleteReadMutation.isPending}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl transition-all"
                style={{
                  background: isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.07)',
                  color: '#ef4444',
                  border: '1px solid rgba(239,68,68,0.2)',
                }}
              >
                {deleteReadMutation.isPending ? '...' : 'حذف المقروءة'}
              </button>
            )}
          </div>
        }
      />

      {/* Search + group-by toggle */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none"
            className="absolute end-3 top-1/2 -translate-y-1/2"
            style={{ color: isDark ? '#6b5a8e' : '#c0b4de' }}
          >
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
            <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="ابحث في الإشعارات..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pe-10 ps-4 py-2.5 rounded-xl text-sm transition-all outline-none"
            style={{
              background: isDark ? 'rgba(255,255,255,0.05)' : '#f8f5ff',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e8e0f5'}`,
              color: isDark ? '#fff' : '#1d0a3f',
              direction: 'rtl',
            }}
          />
        </div>
        <div
          className="flex items-center rounded-xl p-1 flex-none"
          style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#f0ecf8' }}
          role="group"
          aria-label="تجميع حسب"
        >
          {[{ key: 'day', label: 'اليوم', Icon: CalendarClock }, { key: 'category', label: 'التصنيف', Icon: Tag }].map(opt => (
            <button
              key={opt.key}
              onClick={() => setGroupMode(opt.key)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all"
              style={{
                background: groupMode === opt.key ? (isDark ? '#E8C76A' : '#fff') : 'transparent',
                color: groupMode === opt.key ? (isDark ? '#1d0a3f' : '#7c3aed') : (isDark ? 'rgba(255,255,255,0.5)' : '#9b7fd6'),
                boxShadow: groupMode === opt.key && !isDark ? '0 1px 4px rgba(124,58,237,0.15)' : 'none',
              }}
            >
              <opt.Icon size={12} /> {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Tabs */}
      {!showArchived && (
        <div className="flex gap-1.5 flex-wrap mb-5 overflow-x-auto pb-1">
          {FILTER_TABS.map(tab => {
            const count = tab.key === 'unread'
              ? notifications.filter(n => !n.isRead).length
              : tab.key === 'all'
              ? notifications.length
              : notifications.filter(n => n.type === tab.key).length

            if (count === 0 && tab.key !== 'all' && tab.key !== 'unread') return null

            const isActive = filter === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => { setFilter(tab.key); setSelected(new Set()) }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-semibold transition-all whitespace-nowrap"
                style={{
                  background: isActive
                    ? (isDark ? '#E8C76A' : '#7c3aed')
                    : (isDark ? 'rgba(255,255,255,0.05)' : '#f0ecf8'),
                  color: isActive
                    ? (isDark ? '#1d0a3f' : '#fff')
                    : (isDark ? 'rgba(255,255,255,0.55)' : '#7c6aaa'),
                }}
              >
                <tab.Icon size={12} strokeWidth={2} />
                {tab.label}
                {count > 0 && (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{
                      background: isActive ? 'rgba(0,0,0,0.15)' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(124,58,237,0.12)'),
                      color: isActive ? 'inherit' : (isDark ? '#fff' : '#7c3aed'),
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Select-all + Bulk Actions Bar */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between mb-3 px-1">
          <button onClick={toggleSelectAll} className="flex items-center gap-2 text-xs font-semibold" style={{ color: isDark ? 'rgba(255,255,255,0.45)' : '#9b7fd6' }}>
            <span
              className="w-4 h-4 rounded flex items-center justify-center transition-all"
              style={{
                background: allVisibleSelected ? '#7c3aed' : (isDark ? 'rgba(255,255,255,0.07)' : '#f0ecf8'),
                border: `1.5px solid ${allVisibleSelected ? '#7c3aed' : (isDark ? 'rgba(255,255,255,0.12)' : '#d8d0f0')}`,
              }}
            >
              {allVisibleSelected && (
                <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                  <path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </span>
            {allVisibleSelected ? 'إلغاء تحديد الكل' : `تحديد الكل (${filtered.length})`}
          </button>
        </div>
      )}

      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center justify-between px-4 py-2.5 rounded-xl mb-4"
            style={{
              background: isDark ? 'rgba(232,199,106,0.08)' : 'rgba(124,58,237,0.06)',
              border: `1px solid ${isDark ? 'rgba(232,199,106,0.15)' : 'rgba(124,58,237,0.12)'}`,
            }}
          >
            <span className="text-xs font-semibold" style={{ color: isDark ? '#E8C76A' : '#7c3aed' }}>
              {selected.size} محدد
            </span>
            <div className="flex gap-2">
              {!showArchived && (
                <button onClick={() => bulkUpdateMutation.mutate({ ids: selected, action: 'read' })} className="text-xs font-semibold px-3 py-1 rounded-lg" style={{ background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(124,58,237,0.08)', color: isDark ? '#fff' : '#7c3aed' }}>
                  تحديد كمقروء
                </button>
              )}
              <button onClick={() => bulkUpdateMutation.mutate({ ids: selected, action: showArchived ? 'unarchive' : 'archive' })} className="text-xs font-semibold px-3 py-1 rounded-lg flex items-center gap-1.5" style={{ background: isDark ? 'rgba(255,255,255,0.07)' : '#f0ecf8', color: isDark ? '#fff' : '#7c6aaa' }}>
                {showArchived ? <ArchiveRestore size={12} /> : <Archive size={12} />}
                {showArchived ? 'إعادة من الأرشيف' : 'أرشفة'}
              </button>
              <button onClick={() => bulkDeleteMutation.mutate(selected)} className="text-xs font-semibold px-3 py-1 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                حذف
              </button>
              <button onClick={() => setSelected(new Set())} className="text-xs font-semibold px-3 py-1 rounded-lg" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#f0ecf8', color: isDark ? 'rgba(255,255,255,0.5)' : '#9b7fd6' }}>
                إلغاء
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-24">
          <Spinner color={isDark ? 'border-brand-gold' : 'border-brand-purple'} />
        </div>
      ) : isError ? (
        <div
          className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-2xl"
          style={{
            background: isDark ? 'rgba(255,255,255,0.02)' : '#faf8ff',
            border: `1px dashed ${isDark ? 'rgba(255,255,255,0.08)' : '#e0d4f7'}`,
          }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: isDark ? 'rgba(239,68,68,0.1)' : '#fef2f2' }}
          >
            <Bell size={26} strokeWidth={1.6} className="text-red-500" />
          </div>
          <p className="font-bold text-sm mb-1" style={{ color: isDark ? 'rgba(255,255,255,0.7)' : '#1d0a3f' }}>
            تعذّر تحميل الإشعارات
          </p>
          <p className="text-xs mb-4" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : '#9b7fd6' }}>
            حدث خطأ أثناء الاتصال بالخادم
          </p>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-xs font-bold px-4 py-2 rounded-xl transition-all disabled:opacity-60"
            style={{
              background: isDark ? '#E8C76A' : '#7c3aed',
              color: isDark ? '#1d0a3f' : '#fff',
            }}
          >
            {isFetching ? 'جارٍ إعادة المحاولة...' : 'إعادة المحاولة'}
          </button>
        </div>
      ) : !filtered.length ? (
        <EmptyState filter={filter} search={search} isDark={isDark} showArchived={showArchived} />
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).filter(([, items]) => items.length > 0).map(([groupLabel, items]) => (
            <div key={groupLabel}>
              <div
                className="text-[10px] font-extrabold uppercase tracking-widest px-1 mb-3"
                style={{ color: isDark ? 'rgba(255,255,255,0.2)' : '#c0b4de' }}
              >
                {groupLabel} <span className="ml-1" style={{ color: isDark ? 'rgba(255,255,255,0.12)' : '#e0d4f7' }}>— {items.length}</span>
              </div>
              <div className="space-y-2">
                {items.map(notif => (
                  <NotificationCard
                    key={notif._id}
                    notif={notif}
                    isDark={isDark}
                    isSelected={selected.has(notif._id)}
                    isArchivedView={showArchived}
                    onToggleSelect={() => toggleSelect(notif._id)}
                    onMarkRead={() => handleMarkRead(notif)}
                    onMarkUnread={() => handleMarkUnread(notif)}
                    onDelete={() => handleDelete(notif._id)}
                    onArchive={() => handleArchive(notif)}
                    cardColors={cardBase}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function NotificationCard({ notif, isDark, isSelected, isArchivedView, onToggleSelect, onMarkRead, onMarkUnread, onDelete, onArchive, cardColors }) {
  const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.system
  const pri = PRIORITY_CONFIG[notif.priority] || PRIORITY_CONFIG.medium
  const isUnread = !notif.isRead
  const isUrgent = notif.priority === 'urgent' && isUnread

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex items-start gap-3 p-4 rounded-2xl transition-all group"
      style={{
        background: isSelected
          ? (isDark ? 'rgba(232,199,106,0.08)' : 'rgba(124,58,237,0.07)')
          : isUnread ? cardColors.unread : cardColors.base,
        border: `1px solid ${isSelected
          ? (isDark ? 'rgba(232,199,106,0.25)' : 'rgba(124,58,237,0.25)')
          : isUrgent ? 'rgba(239,68,68,0.35)'
          : isUnread ? cardColors.unreadBorder : cardColors.border}`,
        boxShadow: isUrgent ? '0 2px 14px rgba(239,68,68,0.1)' : isUnread && !isSelected ? (isDark ? 'none' : '0 2px 12px rgba(124,58,237,0.05)') : 'none',
      }}
    >
      {/* Checkbox */}
      <button
        onClick={onToggleSelect}
        className="flex-none mt-0.5 w-4 h-4 rounded flex items-center justify-center transition-all"
        style={{
          background: isSelected ? '#7c3aed' : (isDark ? 'rgba(255,255,255,0.07)' : '#f0ecf8'),
          border: `1.5px solid ${isSelected ? '#7c3aed' : (isDark ? 'rgba(255,255,255,0.12)' : '#d8d0f0')}`,
        }}
      >
        {isSelected && (
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
            <path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

      {/* Unread accent */}
      <div
        className="flex-none w-1.5 h-1.5 rounded-full mt-2"
        style={{ background: isUnread ? (isUrgent ? '#ef4444' : cfg.dot || cfg.color) : 'transparent', flexShrink: 0 }}
      />

      {/* Icon */}
      <div
        className="flex-none w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: cfg.bg }}
      >
        <cfg.Icon size={16} strokeWidth={1.8} color={cfg.color} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0" onClick={onMarkRead} style={{ cursor: isUnread ? 'pointer' : 'default' }}>
        <div className="flex items-start justify-between gap-2 mb-1">
          <span
            className="text-sm leading-snug line-clamp-1"
            style={{
              fontWeight: isUnread ? 700 : 500,
              color: isUnread
                ? (isDark ? '#fff' : '#1d0a3f')
                : (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(29,10,63,0.4)'),
            }}
          >
            {notif.titleAr || notif.title}
          </span>
          <span
            className="text-[10px] flex-none whitespace-nowrap"
            style={{ color: isDark ? 'rgba(255,255,255,0.2)' : '#c0b4de' }}
          >
            {timeFromNow(notif.createdAt)}
          </span>
        </div>
        {notif.bodyAr && (
          <p
            className="text-[12px] line-clamp-2 mb-2"
            style={{ color: isDark ? 'rgba(255,255,255,0.35)' : '#9b7fd6' }}
          >
            {notif.bodyAr}
          </p>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: cfg.bg, color: cfg.color }}
          >
            {cfg.label}
          </span>
          {notif.priority && notif.priority !== 'medium' && (
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: pri.bg, color: pri.color }}
            >
              {pri.label}
            </span>
          )}
          {isUnread && !isUrgent && (
            <span
              className="text-[10px] font-bold"
              style={{ color: isDark ? '#E8C76A' : '#7c3aed' }}
            >
              جديد
            </span>
          )}
        </div>
      </div>

      {/* Action buttons - visible on hover */}
      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-none">
        {!isArchivedView && (isUnread ? (
          <button
            onClick={onMarkRead}
            title="تحديد كمقروء"
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: isDark ? 'rgba(255,255,255,0.07)' : '#f5f3ff' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ color: isDark ? '#9b7fd6' : '#7c3aed' }}>
              <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        ) : (
          <button
            onClick={onMarkUnread}
            title="تحديد كغير مقروء"
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: isDark ? 'rgba(255,255,255,0.07)' : '#f5f3ff' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ color: isDark ? '#6b5a8e' : '#b3a4d0' }}>
              <circle cx="12" cy="12" r="3" fill="currentColor"/>
            </svg>
          </button>
        ))}
        <button
          onClick={onArchive}
          title={isArchivedView ? 'إعادة من الأرشيف' : 'أرشفة'}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
          style={{ background: isDark ? 'rgba(255,255,255,0.07)' : '#f5f3ff' }}
        >
          {isArchivedView
            ? <ArchiveRestore size={13} style={{ color: isDark ? '#9b7fd6' : '#7c3aed' }} />
            : <Archive size={13} style={{ color: isDark ? '#9b7fd6' : '#7c3aed' }} />}
        </button>
        <button
          onClick={onDelete}
          title="حذف"
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
          style={{ background: 'rgba(239,68,68,0.08)' }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ color: '#ef4444' }}>
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </motion.div>
  )
}

function EmptyState({ filter, search, isDark, showArchived }) {
  const isSearch = search.trim().length > 0
  return (
    <div
      className="p-16 text-center rounded-2xl"
      style={{
        background: isDark ? 'rgba(255,255,255,0.02)' : '#faf8ff',
        border: `1px dashed ${isDark ? 'rgba(255,255,255,0.08)' : '#e0d4f7'}`,
      }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#f0ecf8' }}
      >
        {isSearch
          ? <Search size={26} strokeWidth={1.6} color={isDark ? '#6b5a8e' : '#c0b4de'} />
          : showArchived
          ? <Archive size={26} strokeWidth={1.6} color={isDark ? '#6b5a8e' : '#c0b4de'} />
          : filter === 'unread'
          ? <CircleCheck size={26} strokeWidth={1.6} color={isDark ? '#6b5a8e' : '#c0b4de'} />
          : <Bell size={26} strokeWidth={1.6} color={isDark ? '#6b5a8e' : '#c0b4de'} />
        }
      </div>
      <p className="font-bold text-sm mb-1" style={{ color: isDark ? 'rgba(255,255,255,0.45)' : '#7c6aaa' }}>
        {isSearch ? 'لا توجد نتائج للبحث' : showArchived ? 'لا توجد إشعارات مؤرشفة' : filter === 'unread' ? 'جميع الإشعارات مقروءة' : 'لا توجد إشعارات'}
      </p>
      <p className="text-xs" style={{ color: isDark ? 'rgba(255,255,255,0.2)' : '#c0b4de' }}>
        {isSearch ? `لا يوجد ما يطابق "${search}"` : showArchived ? 'الإشعارات التي تؤرشفها ستظهر هنا' : filter === 'unread' ? 'أحسنت! لا يوجد إشعارات غير مقروءة' : 'ستظهر إشعاراتك هنا عند وصولها'}
      </p>
    </div>
  )
}
