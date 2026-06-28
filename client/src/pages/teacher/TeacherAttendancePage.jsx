import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ClipboardList } from 'lucide-react'
import api from '../../utils/api.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import { formatDateAr } from '../../utils/date.js'
import { ATTENDANCE_STATUS } from '../../config/constants.js'

export default function TeacherAttendancePage() {
  const qc = useQueryClient()

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['attendance', 'teacher'],
    queryFn: () => api.get('/attendance/teacher').then(r => r.data.data),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/attendance/${id}`, { status }),
    onSuccess: () => {
      toast.success('تم تحديث سجل الحضور')
      qc.invalidateQueries({ queryKey: ['attendance', 'teacher'] })
    },
    onError: () => toast.error('حدث خطأ'),
  })

  const statusBadge = {
    present: 'success',
    absent: 'danger',
    excused: 'warning',
    late: 'gold',
  }

  return (
    <div>
      <PageHeader title="سجل الحضور" subtitle="متابعة حضور وغياب الطلاب" />

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner color="border-brand-gold" /></div>
      ) : !records.length ? (
        <div className="text-center py-16" style={{ color: '#b3a4d0' }}>
          <ClipboardList size={44} strokeWidth={1.3} color="#b3a4d0" className="mb-3 mx-auto" />
          <p>لا توجد سجلات حضور</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((rec) => (
            <div key={rec._id} className="rounded-card p-5 flex items-center gap-4 flex-wrap" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <Avatar src={rec.studentId?.avatar} name={`${rec.studentId?.firstNameAr} ${rec.studentId?.lastNameAr}`} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="text-white font-semibold">{rec.studentId?.firstNameAr} {rec.studentId?.lastNameAr}</div>
                <div className="text-xs mt-0.5" style={{ color: '#b3a4d0' }}>
                  {rec.sessionId?.titleAr} • {formatDateAr(rec.sessionId?.scheduledAt)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {Object.entries(ATTENDANCE_STATUS).map(([key, info]) => (
                  <button
                    key={key}
                    onClick={() => updateMutation.mutate({ id: rec._id, status: key })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${rec.status === key ? 'border-transparent' : 'border-white/10 text-white/40 hover:text-white/70'}`}
                    style={rec.status === key ? { background: `${info.color}30`, color: info.color, border: `1px solid ${info.color}50` } : {}}
                  >
                    {info.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
