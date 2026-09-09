import Modal from '../ui/Modal.jsx'
import { formatDateTimeAr } from '../../utils/date.js'
import {
  NOTIFICATION_TYPE_CONFIG as TYPE_CONFIG,
  NOTIFICATION_PRIORITY_CONFIG as PRIORITY_CONFIG,
} from '../../config/notificationTypes.js'

// Shown when a notification has no actionUrl (nothing to navigate to) —
// so an informational-only notification still has somewhere to reveal its
// full, untruncated content instead of silently doing nothing on click.
export default function NotificationDetailModal({ notif, onClose }) {
  if (!notif) return null
  const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.system
  const pri = PRIORITY_CONFIG[notif.priority] || PRIORITY_CONFIG.medium

  return (
    <Modal open onClose={onClose} title={notif.titleAr || notif.title} size="sm">
      <div className="space-y-4" dir="rtl">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ background: cfg.bg, color: cfg.color }}
          >
            <cfg.Icon size={13} /> {cfg.label}
          </span>
          {notif.priority && notif.priority !== 'medium' && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: pri.bg, color: pri.color }}>
              {pri.label}
            </span>
          )}
          <span className="text-xs text-gray-400">{formatDateTimeAr(notif.createdAt)}</span>
        </div>

        {notif.bodyAr && (
          <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">{notif.bodyAr}</p>
        )}
        {!notif.bodyAr && (
          <p className="text-sm text-gray-400">لا يوجد تفاصيل إضافية لهذا الإشعار.</p>
        )}
      </div>
    </Modal>
  )
}
