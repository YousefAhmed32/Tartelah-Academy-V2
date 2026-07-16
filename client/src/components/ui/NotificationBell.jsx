import { useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNotificationStore } from '../../store/notificationStore.js'
import { timeFromNow } from '../../utils/date.js'
import { NOTIFICATION_TYPE_CONFIG as TYPE_CONFIG } from '../../config/notificationTypes.js'
import api from '../../utils/api.js'

export default function NotificationBell({ theme = 'light', viewAllPath }) {
  const navigate = useNavigate()
  const dropdownRef = useRef(null)
  const qc = useQueryClient()

  const {
    unreadCount,
    notifications,
    dropdownOpen,
    toggleDropdown,
    closeDropdown,
    markRead,
    markAllRead,
  } = useNotificationStore()

  const isDark = theme === 'dark'
  const recentNotifs = notifications.slice(0, 10)
  const hasCritical = notifications.some(n => !n.isRead && (n.priority === 'urgent' || n.priority === 'high'))

  useEffect(() => {
    if (!dropdownOpen) return
    function handler(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        closeDropdown()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropdownOpen, closeDropdown])

  const markAllMutation = useMutation({
    mutationFn: () => api.patch('/notifications/mark-all-read'),
    onSuccess: () => {
      markAllRead()
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  function handleMarkRead(notif) {
    if (notif.isRead) return
    markRead(notif._id)
    api.patch(`/notifications/${notif._id}/read`).catch(() => {})
  }

  function handleViewAll() {
    closeDropdown()
    if (viewAllPath) navigate(viewAllPath)
  }

  const badgeColor = hasCritical ? '#ef4444' : '#ef4444'

  return (
    <div className="relative" ref={dropdownRef}>
      {/* ── Bell Button ── */}
      <button
        onClick={toggleDropdown}
        aria-label="الإشعارات"
        className={[
          'relative transition-all duration-200',
          isDark
            ? 'w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white/10'
            : 'hdric',
          dropdownOpen ? (isDark ? 'bg-white/10' : 'bg-brand-purple/10') : '',
        ].join(' ')}
        style={{ color: dropdownOpen ? (isDark ? '#E8C76A' : '#7c3aed') : undefined }}
      >
        <svg
          width="20" height="20" viewBox="0 0 24 24"
          fill={dropdownOpen && unreadCount === 0 ? 'none' : 'none'}
          className="transition-all duration-200"
        >
          <path
            d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9Z"
            stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"
          />
          <path
            d="M10 21a2 2 0 0 0 4 0"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
          />
        </svg>

        {/* Badge */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -end-1 min-w-[18px] h-[18px] rounded-full text-white text-[9px] font-extrabold flex items-center justify-center px-1 leading-none"
              style={{ background: badgeColor, boxShadow: hasCritical ? `0 0 0 2px ${isDark ? '#1a0838' : '#fff'}, 0 0 8px ${badgeColor}` : `0 0 0 2px ${isDark ? '#1a0838' : '#fff'}` }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>

        {/* Pulse ring for critical */}
        {hasCritical && (
          <span
            className="absolute -top-1 -end-1 w-[18px] h-[18px] rounded-full animate-ping"
            style={{ background: '#ef4444', opacity: 0.4 }}
          />
        )}
      </button>

      {/* ── Dropdown ── */}
      <AnimatePresence>
        {dropdownOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute end-0 top-full mt-2 z-[999] rounded-2xl overflow-hidden"
            style={{
              width: 'min(380px, calc(100vw - 24px))',
              background: isDark ? 'rgba(22, 7, 48, 0.98)' : '#fff',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e8e0f5'}`,
              boxShadow: isDark
                ? '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)'
                : '0 20px 60px rgba(124,58,237,0.15), 0 4px 20px rgba(0,0,0,0.08)',
              backdropFilter: 'blur(20px)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3.5"
              style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : '#f0ecf8'}` }}
            >
              <div className="flex items-center gap-2.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: isDark ? '#E8C76A' : '#7c3aed' }}>
                  <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                  <path d="M10 21a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span className="font-bold text-[13px]" style={{ color: isDark ? '#fff' : '#1d0a3f' }}>
                  الإشعارات
                </span>
                {unreadCount > 0 && (
                  <span
                    className="text-[10px] font-extrabold px-2 py-0.5 rounded-full"
                    style={{ background: '#ef4444', color: '#fff' }}
                  >
                    {unreadCount} جديد
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllMutation.mutate()}
                  disabled={markAllMutation.isPending}
                  className="text-[11px] font-semibold transition-opacity hover:opacity-70"
                  style={{ color: isDark ? '#E8C76A' : '#7c3aed' }}
                >
                  {markAllMutation.isPending ? '...' : 'تحديد الكل كمقروء'}
                </button>
              )}
            </div>

            {/* Notification List */}
            <div className="overflow-y-auto" style={{ maxHeight: '380px' }}>
              {!recentNotifs.length ? (
                <div className="py-14 flex flex-col items-center gap-3">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#f5f3ff' }}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ color: isDark ? '#6b5a8e' : '#c0b4de' }}>
                      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9Z" stroke="currentColor" strokeWidth="1.8"/>
                      <path d="M10 21a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : '#9b7fd6' }}>
                      لا توجد إشعارات
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: isDark ? 'rgba(255,255,255,0.2)' : '#c0b4de' }}>
                      ستظهر إشعاراتك هنا
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Unread section */}
                  {recentNotifs.some(n => !n.isRead) && (
                    <div
                      className="px-4 py-1.5 text-[9px] font-extrabold uppercase tracking-widest"
                      style={{ color: isDark ? 'rgba(255,255,255,0.25)' : '#c0b4de' }}
                    >
                      غير مقروءة
                    </div>
                  )}
                  {recentNotifs.filter(n => !n.isRead).map(notif => (
                    <NotifItem
                      key={notif._id}
                      notif={notif}
                      isDark={isDark}
                      onMarkRead={handleMarkRead}
                    />
                  ))}

                  {/* Read section */}
                  {recentNotifs.some(n => n.isRead) && recentNotifs.some(n => !n.isRead) && (
                    <div
                      className="px-4 py-1.5 text-[9px] font-extrabold uppercase tracking-widest mt-1"
                      style={{
                        color: isDark ? 'rgba(255,255,255,0.2)' : '#c0b4de',
                        borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : '#f5f3ff'}`,
                      }}
                    >
                      مقروءة
                    </div>
                  )}
                  {recentNotifs.filter(n => n.isRead).map(notif => (
                    <NotifItem
                      key={notif._id}
                      notif={notif}
                      isDark={isDark}
                      onMarkRead={handleMarkRead}
                    />
                  ))}
                </>
              )}
            </div>

            {/* Footer */}
            <div
              className="px-4 py-3"
              style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : '#f0ecf8'}` }}
            >
              <button
                onClick={handleViewAll}
                className="w-full py-2.5 rounded-xl text-[13px] font-bold transition-all hover:opacity-90 active:scale-98"
                style={{
                  background: isDark ? 'rgba(232,199,106,0.1)' : 'rgba(124,58,237,0.07)',
                  color: isDark ? '#E8C76A' : '#7c3aed',
                  border: `1px solid ${isDark ? 'rgba(232,199,106,0.15)' : 'rgba(124,58,237,0.12)'}`,
                }}
              >
                عرض مركز الإشعارات
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function NotifItem({ notif, isDark, onMarkRead }) {
  const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.system
  const isUnread = !notif.isRead

  return (
    <button
      onClick={() => onMarkRead(notif)}
      className="w-full flex items-start gap-3 px-4 py-3 text-start transition-colors"
      style={{
        background: isUnread
          ? (isDark ? 'rgba(124,58,237,0.06)' : 'rgba(124,58,237,0.03)')
          : 'transparent',
        borderRight: `3px solid ${isUnread ? cfg.dot : 'transparent'}`,
        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : '#faf8ff'}`,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(124,58,237,0.04)' }}
      onMouseLeave={e => { e.currentTarget.style.background = isUnread ? (isDark ? 'rgba(124,58,237,0.06)' : 'rgba(124,58,237,0.03)') : 'transparent' }}
    >
      {/* Type icon circle */}
      <div
        className="w-8 h-8 rounded-xl flex-none flex items-center justify-center"
        style={{ background: cfg.bg, flexShrink: 0 }}
      >
        <cfg.Icon size={14} strokeWidth={2} color={cfg.color} />
      </div>

      <div className="flex-1 min-w-0">
        <div
          className="text-[12px] leading-snug line-clamp-1"
          style={{
            fontWeight: isUnread ? 700 : 500,
            color: isUnread
              ? (isDark ? '#fff' : '#1d0a3f')
              : (isDark ? 'rgba(255,255,255,0.45)' : 'rgba(29,10,63,0.45)'),
          }}
        >
          {notif.titleAr || notif.title}
        </div>
        {notif.bodyAr && (
          <p
            className="text-[11px] mt-0.5 line-clamp-1"
            style={{ color: isDark ? 'rgba(255,255,255,0.3)' : '#b3a4d0' }}
          >
            {notif.bodyAr}
          </p>
        )}
        <div className="flex items-center gap-1.5 mt-1">
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: cfg.bg, color: cfg.color }}
          >
            {cfg.label}
          </span>
          <span
            className="text-[10px]"
            style={{ color: isDark ? 'rgba(255,255,255,0.2)' : '#c0b4de' }}
          >
            {timeFromNow(notif.createdAt)}
          </span>
        </div>
      </div>

      {isUnread && (
        <div
          className="w-2 h-2 rounded-full flex-none mt-2"
          style={{ background: cfg.dot, flexShrink: 0 }}
        />
      )}
    </button>
  )
}
