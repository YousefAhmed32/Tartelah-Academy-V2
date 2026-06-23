import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../utils/api.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import EmptyState from '../../components/shared/EmptyState.jsx'
import { formatDateAr, formatTimeAr, isFuture } from '../../utils/date.js'
import { SESSION_STATUS, MEETING_PROVIDERS } from '../../config/constants.js'

const tabs = [
  { key: 'upcoming', label: 'القادمة' },
  { key: 'history', label: 'السابقة' },
]

export default function StudentSessionsPage() {
  const [tab, setTab] = useState('upcoming')

  const { data, isLoading } = useQuery({
    queryKey: ['sessions', tab],
    queryFn: () => api.get(`/sessions/${tab}`).then(r => r.data.data),
    placeholderData: [],
  })

  return (
    <div dir="rtl">
      <PageHeader title="حصصي" subtitle="جميع الحصص الدراسية" />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#f0ecf8] p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-2 rounded-[10px] text-sm font-semibold transition-all ${tab === t.key ? 'bg-white text-brand-textBody shadow-sm' : 'text-[#9b7fd6] hover:text-brand-textBody'}`}
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
  const status = SESSION_STATUS[session.status] || SESSION_STATUS.scheduled
  const provider = MEETING_PROVIDERS[session.meetingProvider]

  return (
    <div className="card-light p-5 flex items-center gap-4 flex-wrap">
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center flex-none"
        style={{ background: `${status.color}15` }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2.5" stroke={status.color} strokeWidth="1.7"/><path d="M3 9h18M8 3v4M16 3v4" stroke={status.color} strokeWidth="1.7" strokeLinecap="round"/></svg>
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-heading font-bold text-brand-textBody">{session.titleAr || session.title}</div>
        <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-[#9b7fd6]">
          <span>📅 {formatDateAr(session.scheduledAt)}</span>
          <span>🕐 {formatTimeAr(session.scheduledAt)}</span>
          <span>⏱️ {session.durationMinutes} دقيقة</span>
          {provider && <span style={{ color: provider.color }}>🔗 {provider.label}</span>}
        </div>
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
      </div>
    </div>
  )
}
