import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../../utils/api.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Input from '../../components/ui/Input.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import EmptyState from '../../components/shared/EmptyState.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import { formatDateAr, formatTimeAr } from '../../utils/date.js'
import { SESSION_STATUS } from '../../config/constants.js'

export default function TeacherSessionsPage() {
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ studentId: '', titleAr: '', scheduledAt: '', durationMinutes: 60, meetingLink: '', meetingProvider: 'zoom', notes: '' })
  const qc = useQueryClient()

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['teacher', 'sessions'],
    queryFn: () => api.get('/teachers/me/sessions').then(r => r.data.data),
  })

  const { data: students = [] } = useQuery({
    queryKey: ['teacher', 'students'],
    queryFn: () => api.get('/teachers/me/students').then(r => r.data.data),
  })

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/sessions', data),
    onSuccess: () => {
      toast.success('تمت جدولة الحصة بنجاح')
      qc.invalidateQueries({ queryKey: ['teacher', 'sessions'] })
      setShowModal(false)
      setForm({ studentId: '', titleAr: '', scheduledAt: '', durationMinutes: 60, meetingLink: '', meetingProvider: 'zoom', notes: '' })
    },
    onError: (err) => toast.error(err.response?.data?.message || 'حدث خطأ'),
  })

  const completeMutation = useMutation({
    mutationFn: (id) => api.patch(`/sessions/${id}/complete`),
    onSuccess: () => {
      toast.success('تم تحديث الحصة كمكتملة')
      qc.invalidateQueries({ queryKey: ['teacher', 'sessions'] })
    },
    onError: () => toast.error('حدث خطأ'),
  })

  function change(e) { setForm(p => ({ ...p, [e.target.name]: e.target.value })) }

  return (
    <div>
      <PageHeader
        title="الحصص الدراسية"
        subtitle="جدولة وإدارة الحصص"
        actions={<Button variant="gold" onClick={() => setShowModal(true)}>+ جدولة حصة</Button>}
      />

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner color="border-brand-gold" /></div>
      ) : !sessions.length ? (
        <EmptyState
          title="لا توجد حصص"
          description="لم يتم جدولة أي حصص بعد"
          action={{ label: 'جدولة حصة', onClick: () => setShowModal(true) }}
          dark
        />
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => {
            const statusInfo = SESSION_STATUS[s.status] || SESSION_STATUS.scheduled
            return (
              <div key={s._id} className="rounded-card p-5 flex items-center gap-4 flex-wrap" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Avatar src={s.studentId?.avatar} name={`${s.studentId?.firstNameAr} ${s.studentId?.lastNameAr}`} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="text-white font-heading font-bold">{s.titleAr || s.title}</div>
                  <div className="text-xs mt-0.5 flex items-center gap-3 flex-wrap" style={{ color: '#b3a4d0' }}>
                    <span>🎓 {s.studentId?.firstNameAr} {s.studentId?.lastNameAr}</span>
                    <span>📅 {formatDateAr(s.scheduledAt)}</span>
                    <span>🕐 {formatTimeAr(s.scheduledAt)}</span>
                    <span>⏱️ {s.durationMinutes} د</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={s.status === 'completed' ? 'gray' : s.status === 'cancelled' ? 'danger' : 'gold'}>
                    {statusInfo.label}
                  </Badge>
                  {s.status === 'scheduled' && (
                    <>
                      {s.meetingLink && <a href={s.meetingLink} target="_blank" rel="noopener noreferrer" className="btn-gold text-xs py-1.5 px-3">ابدأ</a>}
                      <Button size="sm" variant="ghost" onClick={() => completeMutation.mutate(s._id)} loading={completeMutation.isPending}>
                        تم
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="جدولة حصة جديدة"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)}>إلغاء</Button>
            <Button variant="gold" onClick={() => createMutation.mutate(form)} loading={createMutation.isPending}>جدولة</Button>
          </>
        }
      >
        <div className="space-y-4" dir="rtl">
          <div>
            <label className="block text-sm font-semibold text-white mb-1.5">الطالب</label>
            <select name="studentId" value={form.studentId} onChange={change} className="field w-full">
              <option value="">اختر طالباً</option>
              {students.map(s => <option key={s._id} value={s._id}>{s.firstNameAr} {s.lastNameAr}</option>)}
            </select>
          </div>
          <Input label="عنوان الحصة" name="titleAr" value={form.titleAr} onChange={change} placeholder="مثال: حصة تجويد - الدرس ١" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="التاريخ والوقت" name="scheduledAt" type="datetime-local" value={form.scheduledAt} onChange={change} />
            <div>
              <label className="block text-sm font-semibold text-white mb-1.5">المدة (دقيقة)</label>
              <select name="durationMinutes" value={form.durationMinutes} onChange={change} className="field w-full">
                {[30, 45, 60, 90].map(d => <option key={d} value={d}>{d} دقيقة</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-white mb-1.5">المنصة</label>
              <select name="meetingProvider" value={form.meetingProvider} onChange={change} className="field w-full">
                <option value="zoom">Zoom</option>
                <option value="meet">Google Meet</option>
                <option value="teams">Teams</option>
                <option value="other">أخرى</option>
              </select>
            </div>
            <Input label="رابط الاجتماع" name="meetingLink" value={form.meetingLink} onChange={change} placeholder="https://..." />
          </div>
        </div>
      </Modal>
    </div>
  )
}
