import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../utils/api.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Button from '../../components/ui/Button.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import { timeFromNow } from '../../utils/date.js'
import { useNotificationStore } from '../../store/notificationStore.js'

export default function TeacherNotificationsPage() {
  const qc = useQueryClient()
  const markAllRead = useNotificationStore(s => s.markAllRead)

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', 'me'],
    queryFn: () => api.get('/notifications').then(r => r.data.data),
  })

  const markAll = useMutation({
    mutationFn: () => api.patch('/notifications/mark-all-read'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); markAllRead() },
  })

  const notifIcon = { session: '📅', homework: '📝', evaluation: '⭐', subscription: '📦', system: '🔔' }

  return (
    <div>
      <PageHeader
        title="الإشعارات"
        subtitle="جميع التنبيهات"
        actions={<Button size="sm" variant="ghost" onClick={() => markAll.mutate()} loading={markAll.isPending}>تحديد الكل كمقروء</Button>}
      />

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner color="border-brand-gold" /></div>
      ) : !notifications.length ? (
        <div className="text-center py-16" style={{ color: '#b3a4d0' }}>
          <div className="text-4xl mb-3">🔔</div>
          <p>لا توجد إشعارات</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => (
            <div key={notif._id} className="rounded-card p-4 flex items-start gap-4" style={{ background: !notif.isRead ? 'rgba(232,199,106,0.06)' : 'rgba(255,255,255,0.03)', border: `1px solid ${!notif.isRead ? 'rgba(232,199,106,0.2)' : 'rgba(255,255,255,0.07)'}` }}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-none ${!notif.isRead ? 'bg-brand-gold/10' : 'bg-white/5'}`}>
                {notifIcon[notif.type] || '🔔'}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`font-semibold text-sm ${!notif.isRead ? 'text-white' : 'text-white/60'}`}>{notif.titleAr || notif.title}</div>
                {notif.bodyAr && <p className="text-xs mt-0.5" style={{ color: '#b3a4d0' }}>{notif.bodyAr}</p>}
                <div className="text-xs mt-1" style={{ color: 'rgba(179,164,208,0.6)' }}>{timeFromNow(notif.createdAt)}</div>
              </div>
              {!notif.isRead && <div className="w-2 h-2 rounded-full bg-brand-gold flex-none mt-2" />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
