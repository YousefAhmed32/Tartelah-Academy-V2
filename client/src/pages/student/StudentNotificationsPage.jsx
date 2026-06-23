import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../utils/api.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Button from '../../components/ui/Button.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import { timeFromNow } from '../../utils/date.js'
import { useNotificationStore } from '../../store/notificationStore.js'

export default function StudentNotificationsPage() {
  const qc = useQueryClient()
  const markAllRead = useNotificationStore(s => s.markAllRead)

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', 'me'],
    queryFn: () => api.get('/notifications').then(r => r.data.data),
  })

  const markAll = useMutation({
    mutationFn: () => api.patch('/notifications/mark-all-read'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      markAllRead()
    },
  })

  const notifIcon = {
    session: '📅',
    homework: '📝',
    evaluation: '⭐',
    subscription: '📦',
    system: '🔔',
  }

  return (
    <div dir="rtl">
      <PageHeader
        title="الإشعارات"
        subtitle="جميع التنبيهات والإشعارات"
        actions={
          <Button size="sm" variant="outline" onClick={() => markAll.mutate()} loading={markAll.isPending}>
            تحديد الكل كمقروء
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner color="border-brand-purple" /></div>
      ) : !notifications.length ? (
        <div className="card-light p-12 text-center">
          <div className="text-4xl mb-3">🔔</div>
          <p className="text-[#9b7fd6]">لا توجد إشعارات</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => (
            <div
              key={notif._id}
              className={`card-light p-4 flex items-start gap-4 transition-all ${!notif.isRead ? 'border-brand-purple/20' : ''}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-none ${!notif.isRead ? 'bg-brand-purple/10' : 'bg-[#f0ecf8]'}`}>
                {notifIcon[notif.type] || '🔔'}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`font-semibold text-sm ${!notif.isRead ? 'text-brand-textBody' : 'text-[#9b7fd6]'}`}>
                  {notif.titleAr || notif.title}
                </div>
                {notif.bodyAr && <p className="text-xs text-[#9b7fd6] mt-0.5">{notif.bodyAr}</p>}
                <div className="text-xs text-[#9b7fd6]/60 mt-1">{timeFromNow(notif.createdAt)}</div>
              </div>
              {!notif.isRead && (
                <div className="w-2 h-2 rounded-full bg-brand-purple flex-none mt-2" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
