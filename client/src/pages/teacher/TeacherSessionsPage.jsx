import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Check, Star, FileText, X, Users, CalendarDays, Calendar,
  CircleCheck,
} from 'lucide-react'
import api from '../../utils/api.js'
import Avatar from '../../components/ui/Avatar.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import { formatDateAr, formatTimeAr } from '../../utils/date.js'
import { SESSION_STATUS, DAYS_OF_WEEK, SCHEDULE_FREQUENCY } from '../../config/constants.js'

// ─── Arabic month names ───────────────────────────────────────────────────────
const AR_MONTHS = ['يناير','فبراير','مارس','إبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
const HOURS_LIST = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINS_LIST = ['00', '15', '30', '45']

const ATT_OPTIONS = [
  { value: 'present', label: 'حاضر',  color: '#22c55e', bg: 'rgba(34,197,94,0.18)' },
  { value: 'absent',  label: 'غائب',  color: '#ef4444', bg: 'rgba(239,68,68,0.18)' },
  { value: 'late',    label: 'متأخر', color: '#f59e0b', bg: 'rgba(245,158,11,0.18)' },
  { value: 'excused', label: 'معذور', color: '#7c3aed', bg: 'rgba(124,58,237,0.18)' },
]

const FIELD = 'field-light w-full'
const LBL = 'block text-xs font-bold text-brand-textBody mb-1.5'

// ─── Quick Evaluation Modal ───────────────────────────────────────────────────
function QuickEvalModal({ session, onClose }) {
  const qc = useQueryClient()
  const [score, setScore] = useState(8)
  const [type, setType] = useState('general')
  const [notes, setNotes] = useState('')
  const SCORE_LABELS = { 1:'ضعيف جداً',2:'ضعيف',3:'مقبول',4:'مقبول+',5:'جيد',6:'جيد+',7:'جيد جداً',8:'جيد جداً+',9:'ممتاز',10:'ممتاز+' }

  const mutation = useMutation({
    mutationFn: () => api.post('/evaluations', {
      studentId: session.studentId?._id || session.studentId,
      sessionId: session._id,
      type, score: Number(score), notesAr: notes,
    }),
    onSuccess: () => {
      toast.success('تم حفظ التقييم')
      qc.invalidateQueries({ queryKey: ['evaluations'] })
      onClose()
    },
    onError: () => toast.error('حدث خطأ'),
  })

  const scoreColor = score >= 8 ? '#22c55e' : score >= 6 ? '#E8C76A' : score >= 4 ? '#f59e0b' : '#ef4444'

  return (
    <Modal open onClose={onClose} title="تقييم سريع" size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button variant="gold" onClick={() => mutation.mutate()} loading={mutation.isPending}>حفظ التقييم</Button>
        </>
      }
    >
      <div className="space-y-4" dir="rtl">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-[#f8f5ff]">
          <Avatar src={session.studentId?.avatar} name={`${session.studentId?.firstNameAr} ${session.studentId?.lastNameAr}`} size="sm" />
          <div>
            <div className="font-bold text-sm text-brand-textBody">{session.studentId?.firstNameAr} {session.studentId?.lastNameAr}</div>
            <div className="text-xs text-[#9b7fd6]">{session.titleAr}</div>
          </div>
        </div>
        <div>
          <label className={LBL}>نوع التقييم</label>
          <select value={type} onChange={e => setType(e.target.value)} className={FIELD}>
            {[['tajweed','التجويد'],['hifz','الحفظ'],['nazra','القراءة'],['behavior','السلوك'],['general','عام']].map(([v,l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={LBL}>
            الدرجة: <span className="font-extrabold" style={{ color: scoreColor }}>{score}/١٠</span>{' '}
            <span className="font-normal text-[#9b7fd6]">({SCORE_LABELS[score]})</span>
          </label>
          <input type="range" min="1" max="10" step="1" value={score}
            onChange={e => setScore(Number(e.target.value))}
            className="w-full h-2 rounded-full accent-brand-purple" />
        </div>
        <div>
          <label className={LBL}>ملاحظات</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            className="field-light resize-none w-full" placeholder="ملاحظاتك عن هذه الحصة..." />
        </div>
      </div>
    </Modal>
  )
}

// ─── Quick Homework Modal ─────────────────────────────────────────────────────
function QuickHomeworkModal({ session, onClose }) {
  const qc = useQueryClient()
  const studentId = session.studentId?._id || session.studentId
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [due, setDue] = useState('')

  const mutation = useMutation({
    mutationFn: () => api.post('/homework', {
      titleAr: title, descriptionAr: desc, dueDate: due,
      assignedTo: [studentId],
    }),
    onSuccess: () => {
      toast.success('تم إنشاء الواجب')
      qc.invalidateQueries({ queryKey: ['homework'] })
      onClose()
    },
    onError: () => toast.error('حدث خطأ'),
  })

  return (
    <Modal open onClose={onClose} title="واجب سريع" size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button variant="gold" onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!title || !due}>إنشاء الواجب</Button>
        </>
      }
    >
      <div className="space-y-4" dir="rtl">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-[#f8f5ff]">
          <Avatar src={session.studentId?.avatar} name={`${session.studentId?.firstNameAr} ${session.studentId?.lastNameAr}`} size="sm" />
          <div className="font-bold text-sm text-brand-textBody">{session.studentId?.firstNameAr} {session.studentId?.lastNameAr}</div>
        </div>
        <div>
          <label className={LBL}>عنوان الواجب *</label>
          <input value={title} onChange={e => setTitle(e.target.value)} className={FIELD} placeholder="مثال: مراجعة سورة الكهف" />
        </div>
        <div>
          <label className={LBL}>الوصف</label>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} className="field-light resize-none w-full" placeholder="تعليمات..." />
        </div>
        <div>
          <label className={LBL}>تاريخ التسليم *</label>
          <input type="date" value={due} onChange={e => setDue(e.target.value)} className={FIELD} />
        </div>
      </div>
    </Modal>
  )
}

// ─── Reschedule Modal ─────────────────────────────────────────────────────────
function RescheduleModal({ session, onClose, qc }) {
  const [newDate, setNewDate] = useState('')
  const mutation = useMutation({
    mutationFn: () => api.patch(`/sessions/${session._id}/reschedule`, { newDate }),
    onSuccess: () => {
      toast.success('تم إعادة الجدولة')
      qc.invalidateQueries({ queryKey: ['teacher', 'sessions', 'month'] })
      onClose()
    },
    onError: () => toast.error('حدث خطأ'),
  })

  return (
    <Modal open onClose={onClose} title="إعادة جدولة" size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button variant="gold" onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!newDate}>تأكيد</Button>
        </>
      }
    >
      <div className="space-y-3" dir="rtl">
        <p className="text-sm text-[#9b7fd6]">الموعد الحالي: {formatDateAr(session.scheduledAt)} {formatTimeAr(session.scheduledAt)}</p>
        <div>
          <label className={LBL}>الموعد الجديد *</label>
          <input type="datetime-local" value={newDate} onChange={e => setNewDate(e.target.value)} className={FIELD} />
        </div>
      </div>
    </Modal>
  )
}

// ─── Session Card ─────────────────────────────────────────────────────────────
function SessionCard({ session, onEval, onHomework }) {
  const qc = useQueryClient()
  const [expanded, setExpanded] = useState(false)
  const [attStatus, setAttStatus] = useState('')
  const [attNotes, setAttNotes] = useState('')
  const [showReschedule, setShowReschedule] = useState(false)

  const isPast = new Date(session.scheduledAt) < new Date()
  const isScheduled = session.status === 'scheduled'

  const { data: existingAtt } = useQuery({
    queryKey: ['attendance', 'session', session._id],
    queryFn: () => api.get(`/attendance/session/${session._id}`).then(r => r.data.data),
    enabled: expanded && isPast,
  })

  useEffect(() => {
    if (existingAtt) {
      setAttStatus(existingAtt.status || '')
      setAttNotes(existingAtt.notes || '')
    }
  }, [existingAtt])

  const saveAttMutation = useMutation({
    mutationFn: () => api.post(`/attendance/session/${session._id}`, { status: attStatus, notes: attNotes }),
    onSuccess: () => {
      toast.success('تم حفظ الحضور')
      qc.invalidateQueries({ queryKey: ['attendance', 'session', session._id] })
    },
    onError: () => toast.error('حدث خطأ في الحفظ'),
  })

  const completeMutation = useMutation({
    mutationFn: () => api.patch(`/sessions/${session._id}/complete`),
    onSuccess: () => {
      toast.success('تم إكمال الحصة')
      qc.invalidateQueries({ queryKey: ['teacher', 'sessions', 'month'] })
    },
    onError: () => toast.error('حدث خطأ'),
  })

  const cancelMutation = useMutation({
    mutationFn: () => api.patch(`/sessions/${session._id}/cancel`, { reason: '' }),
    onSuccess: () => {
      toast.success('تم إلغاء الحصة')
      qc.invalidateQueries({ queryKey: ['teacher', 'sessions', 'month'] })
    },
    onError: () => toast.error('حدث خطأ'),
  })

  const statusInfo = SESSION_STATUS[session.status] || SESSION_STATUS.scheduled
  const attOpt = ATT_OPTIONS.find(o => o.value === attStatus)

  return (
    <>
      <motion.div layout className="rounded-2xl overflow-hidden transition-all"
        style={{ background: 'rgba(255,255,255,0.05)', border: expanded ? '1px solid rgba(232,199,106,0.25)' : '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* Main row */}
        <button
          className="w-full flex items-center gap-3 p-4 text-start"
          onClick={() => setExpanded(p => !p)}
        >
          <Avatar src={session.studentId?.avatar} name={`${session.studentId?.firstNameAr} ${session.studentId?.lastNameAr}`} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="text-white font-semibold text-sm truncate">{session.titleAr}</div>
            <div className="text-[11px] mt-0.5 flex items-center gap-2 flex-wrap" style={{ color: '#b3a4d0' }}>
              <span>{session.studentId?.firstNameAr} {session.studentId?.lastNameAr}</span>
              <span>•</span>
              <span>{formatDateAr(session.scheduledAt)}</span>
              <span>{formatTimeAr(session.scheduledAt)}</span>
              <span>•</span>
              <span>{session.durationMinutes} د</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-none">
            {existingAtt && isPast && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: ATT_OPTIONS.find(o => o.value === existingAtt.status)?.bg || 'rgba(255,255,255,0.1)', color: ATT_OPTIONS.find(o => o.value === existingAtt.status)?.color || '#b3a4d0' }}>
                {ATT_OPTIONS.find(o => o.value === existingAtt.status)?.label || ''}
              </span>
            )}
            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: statusInfo.bg, color: statusInfo.color }}>
              {statusInfo.label}
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="flex-none transition-transform"
              style={{ color: '#b3a4d0', transform: expanded ? 'rotate(180deg)' : '' }}>
              <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </button>

        {/* Expanded content */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden' }}
            >
              <div className="px-4 pb-4 space-y-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>

                {/* Meeting link */}
                {session.meetingLink && (
                  <div className="pt-3">
                    <a href={session.meetingLink} target="_blank" rel="noopener noreferrer"
                      className="btn-gold w-full text-center flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                        <path d="M15 10l5-5M15 10h4V6M10 9a5 5 0 0 0-5 5v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      ابدأ الحصة
                    </a>
                  </div>
                )}

                {/* Attendance section — only for past sessions */}
                {isPast && (
                  <div className="pt-3">
                    <div className="text-xs font-bold mb-2.5" style={{ color: '#E8C76A' }}>سجّل الحضور</div>
                    <div className="grid grid-cols-4 gap-2 mb-2.5">
                      {ATT_OPTIONS.map(opt => (
                        <button key={opt.value} onClick={() => setAttStatus(opt.value)}
                          className="py-2 rounded-xl text-xs font-bold transition-all"
                          style={{
                            background: attStatus === opt.value ? opt.bg : 'rgba(255,255,255,0.06)',
                            color: attStatus === opt.value ? opt.color : '#b3a4d0',
                            border: attStatus === opt.value ? `1.5px solid ${opt.color}` : '1.5px solid transparent',
                          }}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={attNotes}
                      onChange={e => setAttNotes(e.target.value)}
                      rows={1}
                      placeholder="ملاحظات الحضور..."
                      className="w-full rounded-xl px-3 py-2 text-xs resize-none mb-2"
                      style={{ background: 'rgba(255,255,255,0.06)', color: '#e2d9f3', border: '1px solid rgba(255,255,255,0.1)' }}
                    />
                    <button
                      onClick={() => saveAttMutation.mutate()}
                      disabled={!attStatus || saveAttMutation.isPending}
                      className="w-full py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40"
                      style={{ background: attOpt ? attOpt.bg : 'rgba(124,58,237,0.2)', color: attOpt ? attOpt.color : '#c4b5fd' }}
                    >
                      {saveAttMutation.isPending ? 'جارٍ الحفظ...' : existingAtt ? 'تحديث الحضور' : 'حفظ الحضور'}
                    </button>
                  </div>
                )}

                {/* Quick actions */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {isScheduled && (
                    <button
                      onClick={() => completeMutation.mutate()}
                      disabled={completeMutation.isPending}
                      className="flex-1 min-w-[100px] py-2 rounded-xl text-xs font-bold transition-all"
                      style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' }}
                    >
                      {completeMutation.isPending ? '...' : <span className="flex items-center justify-center gap-1"><Check size={13} strokeWidth={2.5} /> اكتملت</span>}
                    </button>
                  )}
                  {isScheduled && (
                    <button
                      onClick={() => setShowReschedule(true)}
                      className="flex-1 min-w-[100px] py-2 rounded-xl text-xs font-bold transition-all"
                      style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}
                    >
                      ↺ إعادة جدولة
                    </button>
                  )}
                  <button
                    onClick={() => onEval(session)}
                    className="flex-1 min-w-[100px] py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
                    style={{ background: 'rgba(232,199,106,0.12)', color: '#E8C76A', border: '1px solid rgba(232,199,106,0.2)' }}
                  >
                    <Star size={13} strokeWidth={2} /> تقييم
                  </button>
                  <button
                    onClick={() => onHomework(session)}
                    className="flex-1 min-w-[100px] py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
                    style={{ background: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}
                  >
                    <FileText size={13} strokeWidth={2} /> واجب
                  </button>
                  {isScheduled && (
                    <button
                      onClick={() => cancelMutation.mutate()}
                      disabled={cancelMutation.isPending}
                      className="flex-1 min-w-[100px] py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
                      style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.15)' }}
                    >
                      {cancelMutation.isPending ? '...' : <><X size={13} strokeWidth={2.5} /> إلغاء</>}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {showReschedule && (
        <RescheduleModal session={session} onClose={() => setShowReschedule(false)} qc={qc} />
      )}
    </>
  )
}

// ─── Schedule Wizard ──────────────────────────────────────────────────────────
function ScheduleWizard({ students, onClose, onSuccess }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    studentId: '',
    frequency: 'weekly',
    daysOfWeek: [],
    timeHour: '18',
    timeMinute: '00',
    durationMinutes: 60,
    sessionsCount: 8,
    startDate: new Date().toISOString().split('T')[0],
    meetingLink: '',
    meetingProvider: 'zoom',
    titleTemplate: 'حصة',
  })
  const [preview, setPreview] = useState([])

  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }
  function toggleDay(d) {
    setForm(p => ({
      ...p,
      daysOfWeek: p.daysOfWeek.includes(d)
        ? p.daysOfWeek.filter(x => x !== d)
        : [...p.daysOfWeek, d],
    }))
  }

  const previewMutation = useMutation({
    mutationFn: () => api.post('/schedule-rules/preview', {
      frequency: form.frequency,
      daysOfWeek: form.daysOfWeek,
      timeOfDay: `${form.timeHour}:${form.timeMinute}`,
      startDate: form.startDate,
      sessionsTotal: Number(form.sessionsCount),
    }).then(r => r.data.data),
    onSuccess: (data) => { setPreview(data.dates || []); setStep(4) },
    onError: () => toast.error('حدث خطأ في المعاينة'),
  })

  const createMutation = useMutation({
    mutationFn: () => api.post('/schedule-rules', {
      studentId: form.studentId,
      frequency: form.frequency,
      daysOfWeek: form.daysOfWeek,
      timeOfDay: `${form.timeHour}:${form.timeMinute}`,
      durationMinutes: Number(form.durationMinutes),
      startDate: form.startDate,
      sessionsTotal: Number(form.sessionsCount),
      meetingLink: form.meetingLink,
      meetingProvider: form.meetingProvider,
      titleTemplate: form.titleTemplate,
    }),
    onSuccess: (res) => {
      toast.success(`تم إنشاء الجدول وتوليد ${res.data.data?.sessionCount || 0} حصة`)
      onSuccess()
      onClose()
    },
    onError: () => toast.error('حدث خطأ في الإنشاء'),
  })

  const selectedStudent = students.find(s => s._id === form.studentId)
  const canStep2 = !!form.studentId
  const canStep3 = form.frequency === 'daily' || form.daysOfWeek.length > 0
  const canPreview = !!form.startDate && Number(form.sessionsCount) > 0

  const stepTitle = ['اختر الطالب', 'نمط الجدول', 'تفاصيل الجدول', 'معاينة وتأكيد']

  return (
    <Modal
      open
      onClose={onClose}
      title={`إنشاء جدول دوري — الخطوة ${step} من 4: ${stepTitle[step - 1]}`}
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full gap-3">
          <Button variant="ghost" onClick={step === 1 ? onClose : () => setStep(p => p - 1)}>
            {step === 1 ? 'إلغاء' : 'رجوع'}
          </Button>
          <div className="flex gap-2">
            {step < 3 && (
              <Button variant="purple"
                onClick={() => setStep(p => p + 1)}
                disabled={(step === 1 && !canStep2) || (step === 2 && !canStep3)}
              >
                التالي →
              </Button>
            )}
            {step === 3 && (
              <Button variant="gold" onClick={() => previewMutation.mutate()} loading={previewMutation.isPending} disabled={!canPreview}>
                معاينة الجدول
              </Button>
            )}
            {step === 4 && (
              <Button variant="gold" onClick={() => createMutation.mutate()} loading={createMutation.isPending}>
                إنشاء الجدول ({preview.length} حصة)
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div dir="rtl">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1,2,3,4].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                style={{ background: s <= step ? '#7c3aed' : 'rgba(124,58,237,0.15)', color: s <= step ? 'white' : '#9b7fd6' }}>
                {s < step ? <Check size={12} strokeWidth={2.5} /> : s}
              </div>
              {s < 4 && <div className="w-8 h-0.5 rounded-full" style={{ background: s < step ? '#7c3aed' : 'rgba(124,58,237,0.2)' }} />}
            </div>
          ))}
        </div>

        {/* Step 1 — Student */}
        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm text-[#9b7fd6] mb-4">اختر الطالب الذي تريد إنشاء جدول دوري معه</p>
            {students.length === 0 ? (
              <div className="text-center py-8 text-[#9b7fd6]">
                <Users size={36} strokeWidth={1.4} color="#9b7fd6" className="mb-2 mx-auto" />
                <p>لا يوجد طلاب مُعيَّنون لك بعد</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto custom-scroll">
                {students.map(s => (
                  <button key={s._id}
                    onClick={() => set('studentId', s._id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl transition-all"
                    style={{
                      background: form.studentId === s._id ? 'rgba(124,58,237,0.12)' : 'rgba(124,58,237,0.04)',
                      border: form.studentId === s._id ? '1.5px solid #7c3aed' : '1.5px solid transparent',
                    }}
                  >
                    <Avatar src={s.avatar} name={`${s.firstNameAr} ${s.lastNameAr}`} size="sm" />
                    <div className="text-start">
                      <div className="font-semibold text-sm text-brand-textBody">{s.firstNameAr} {s.lastNameAr}</div>
                      <div className="text-xs text-[#9b7fd6]">{s.email}</div>
                    </div>
                    {form.studentId === s._id && (
                      <div className="mr-auto w-5 h-5 rounded-full bg-brand-purple flex items-center justify-center">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                          <path d="M20 6 9 17l-5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2 — Frequency + Days + Time */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <label className={LBL}>تكرار الجدول</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(SCHEDULE_FREQUENCY).slice(0, 4).map(([v, { label }]) => (
                  <button key={v} onClick={() => set('frequency', v)}
                    className="py-2.5 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      background: form.frequency === v ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.04)',
                      color: form.frequency === v ? '#7c3aed' : '#9b7fd6',
                      border: form.frequency === v ? '1.5px solid #7c3aed' : '1.5px solid rgba(124,58,237,0.1)',
                    }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {form.frequency !== 'daily' && (
              <div>
                <label className={LBL}>أيام الأسبوع {form.daysOfWeek.length > 0 && <span className="text-brand-purple">({form.daysOfWeek.length} أيام)</span>}</label>
                <div className="grid grid-cols-7 gap-1.5">
                  {DAYS_OF_WEEK.map(d => (
                    <button key={d.value} onClick={() => toggleDay(d.value)}
                      className="py-2 rounded-xl text-xs font-bold transition-all"
                      style={{
                        background: form.daysOfWeek.includes(d.value) ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.04)',
                        color: form.daysOfWeek.includes(d.value) ? '#c4b5fd' : '#9b7fd6',
                        border: form.daysOfWeek.includes(d.value) ? '1.5px solid #7c3aed' : '1.5px solid transparent',
                      }}>
                      {d.short}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[#9b7fd6] mt-1.5">
                  {form.daysOfWeek.map(d => DAYS_OF_WEEK.find(x => x.value === d)?.label).join(' + ')}
                </p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={LBL}>الساعة</label>
                <select value={form.timeHour} onChange={e => set('timeHour', e.target.value)} className={FIELD}>
                  {HOURS_LIST.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label className={LBL}>الدقيقة</label>
                <select value={form.timeMinute} onChange={e => set('timeMinute', e.target.value)} className={FIELD}>
                  {MINS_LIST.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className={LBL}>المدة</label>
                <select value={form.durationMinutes} onChange={e => set('durationMinutes', Number(e.target.value))} className={FIELD}>
                  <option value={30}>٣٠ د</option>
                  <option value={45}>٤٥ د</option>
                  <option value={60}>٦٠ د</option>
                  <option value={90}>٩٠ د</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 3 — Period + Meeting */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LBL}>تاريخ البدء *</label>
                <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} className={FIELD} />
              </div>
              <div>
                <label className={LBL}>عدد الحصص *</label>
                <div className="flex gap-2 flex-wrap">
                  {[4, 8, 12, 16].map(n => (
                    <button key={n} onClick={() => set('sessionsCount', n)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex-1"
                      style={{
                        background: form.sessionsCount === n ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.04)',
                        color: form.sessionsCount === n ? '#7c3aed' : '#9b7fd6',
                        border: form.sessionsCount === n ? '1.5px solid #7c3aed' : '1.5px solid rgba(124,58,237,0.1)',
                      }}>
                      {n}
                    </button>
                  ))}
                </div>
                <input type="number" min="1" max="60" value={form.sessionsCount}
                  onChange={e => set('sessionsCount', Number(e.target.value))}
                  className={`${FIELD} mt-2`} placeholder="أو أدخل عدداً مخصصاً..." />
              </div>
            </div>

            <div>
              <label className={LBL}>عنوان الحصة (قالب)</label>
              <input value={form.titleTemplate} onChange={e => set('titleTemplate', e.target.value)}
                className={FIELD} placeholder="مثال: حصة تجويد" />
              <p className="text-xs text-[#9b7fd6] mt-1">سيتم إضافة رقم تسلسلي تلقائياً (حصة ١، حصة ٢...)</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LBL}>منصة الاجتماع</label>
                <select value={form.meetingProvider} onChange={e => set('meetingProvider', e.target.value)} className={FIELD}>
                  <option value="zoom">Zoom</option>
                  <option value="meet">Google Meet</option>
                  <option value="teams">Microsoft Teams</option>
                  <option value="other">أخرى</option>
                </select>
              </div>
              <div>
                <label className={LBL}>رابط الاجتماع</label>
                <input value={form.meetingLink} onChange={e => set('meetingLink', e.target.value)}
                  className={FIELD} placeholder="https://..." />
              </div>
            </div>
          </div>
        )}

        {/* Step 4 — Preview */}
        {step === 4 && (
          <div className="space-y-4">
            {selectedStudent && (
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)' }}>
                <Avatar src={selectedStudent.avatar} name={`${selectedStudent.firstNameAr} ${selectedStudent.lastNameAr}`} size="sm" />
                <div>
                  <div className="font-bold text-sm text-brand-textBody">{selectedStudent.firstNameAr} {selectedStudent.lastNameAr}</div>
                  <div className="text-xs text-[#9b7fd6]">
                    {SCHEDULE_FREQUENCY[form.frequency]?.label} •{' '}
                    {form.daysOfWeek.map(d => DAYS_OF_WEEK.find(x => x.value === d)?.label).join(' + ')} •{' '}
                    {form.timeHour}:{form.timeMinute}
                  </div>
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-brand-textBody">الحصص المُولَّدة</span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(124,58,237,0.15)', color: '#7c3aed' }}>
                  {preview.length} حصة
                </span>
              </div>
              <div className="max-h-60 overflow-y-auto custom-scroll space-y-1.5 rounded-xl p-3"
                style={{ background: 'rgba(124,58,237,0.04)', border: '1px solid rgba(124,58,237,0.1)' }}>
                {preview.length === 0 ? (
                  <p className="text-center text-sm text-[#9b7fd6] py-4">لا توجد حصص — تحقق من الإعدادات</p>
                ) : preview.map((dateStr, i) => {
                  const d = new Date(dateStr)
                  return (
                    <div key={i} className="flex items-center gap-3 py-1.5 px-2 rounded-lg"
                      style={{ background: i % 2 === 0 ? 'rgba(124,58,237,0.06)' : 'transparent' }}>
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-none"
                        style={{ background: 'rgba(124,58,237,0.2)', color: '#c4b5fd' }}>{i + 1}</span>
                      <span className="text-sm text-brand-textBody">{formatDateAr(d)}</span>
                      <span className="text-xs text-[#9b7fd6] mr-auto">{form.timeHour}:{form.timeMinute}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="p-3 rounded-xl" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}>
              <p className="text-xs text-emerald-600 flex items-center gap-1.5">
                <CircleCheck size={13} strokeWidth={2} /> سيتم إنشاء {preview.length} حصة في قاعدة البيانات وسيُرسل إشعار للطالب تلقائياً
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ─── Schedule Rules Tab ───────────────────────────────────────────────────────
function ScheduleRulesView({ rules, isLoading, onRefresh }) {
  if (isLoading) return <div className="flex justify-center py-16"><Spinner color="border-brand-gold" /></div>
  if (!rules.length) return (
    <div className="rounded-2xl p-16 text-center"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)' }}>
      <CalendarDays size={44} strokeWidth={1.3} color="#b3a4d0" className="mb-3 mx-auto" />
      <p className="text-white font-semibold mb-1">لا توجد جداول دورية</p>
      <p className="text-sm" style={{ color: '#b3a4d0' }}>أنشئ جدولاً دورياً لتوليد الحصص تلقائياً</p>
    </div>
  )

  return (
    <div className="space-y-3">
      {rules.map(rule => (
        <div key={rule._id} className="rounded-2xl p-4"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-start gap-3">
            <Avatar src={rule.studentId?.avatar} name={`${rule.studentId?.firstNameAr} ${rule.studentId?.lastNameAr}`} size="md" />
            <div className="flex-1 min-w-0">
              <div className="text-white font-bold truncate">{rule.studentId?.firstNameAr} {rule.studentId?.lastNameAr}</div>
              <div className="text-xs mt-1 flex flex-wrap gap-2" style={{ color: '#b3a4d0' }}>
                <span>{SCHEDULE_FREQUENCY[rule.frequency]?.label}</span>
                {rule.daysOfWeek.length > 0 && (
                  <span>•  {rule.daysOfWeek.map(d => DAYS_OF_WEEK.find(x => x.value === d)?.label).join(' + ')}</span>
                )}
                <span>• {rule.timeOfDay}</span>
                <span>• {rule.durationMinutes} دقيقة</span>
              </div>
              <div className="mt-2 flex items-center gap-3 flex-wrap">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
                  {rule.stats?.completed || 0} مكتملة
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(124,58,237,0.15)', color: '#c4b5fd' }}>
                  {rule.stats?.total || 0} إجمالي
                </span>
                {rule.stats?.nextSession && (
                  <span className="text-xs" style={{ color: '#E8C76A' }}>
                    التالية: {formatDateAr(rule.stats.nextSession)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex-none">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: rule.status === 'active' ? 'rgba(34,197,94,0.15)' : 'rgba(100,116,139,0.15)',
                  color: rule.status === 'active' ? '#22c55e' : '#94a3b8',
                }}>
                {rule.status === 'active' ? 'نشط' : rule.status === 'paused' ? 'موقوف' : 'منتهٍ'}
              </span>
            </div>
          </div>
          {rule.meetingLink && (
            <div className="mt-3 pt-3 border-t flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ color: '#b3a4d0' }}>
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              <a href={rule.meetingLink} target="_blank" rel="noopener noreferrer"
                className="text-xs truncate" style={{ color: '#b3a4d0' }}>
                {rule.meetingLink}
              </a>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TeacherSessionsPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState('month')
  const [showWizard, setShowWizard] = useState(false)
  const [evalSession, setEvalSession] = useState(null)
  const [hwSession, setHwSession] = useState(null)
  const [showManual, setShowManual] = useState(false)
  const [manualForm, setManualForm] = useState({ studentId:'', titleAr:'', scheduledAt:'', durationMinutes:60, meetingLink:'', meetingProvider:'zoom', notes:'' })

  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1)

  function prevMonth() {
    if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1) }
    else setViewMonth(m => m + 1)
  }

  const { data: sessions = [], isLoading: sessLoading } = useQuery({
    queryKey: ['teacher', 'sessions', 'month', viewYear, viewMonth],
    queryFn: () => api.get(`/sessions/teacher-month?year=${viewYear}&month=${viewMonth}`).then(r => r.data.data),
  })

  const { data: rules = [], isLoading: rulesLoading } = useQuery({
    queryKey: ['teacher', 'schedule-rules'],
    queryFn: () => api.get('/schedule-rules/my').then(r => r.data.data),
    enabled: tab === 'rules',
  })

  const { data: students = [] } = useQuery({
    queryKey: ['teacher', 'students'],
    queryFn: () => api.get('/teachers/me/students').then(r => r.data.data),
  })

  const { data: history = [], isLoading: histLoading } = useQuery({
    queryKey: ['teacher', 'sessions', 'history'],
    queryFn: () => api.get('/sessions/history').then(r => r.data.data),
    enabled: tab === 'history',
  })

  const createManualMutation = useMutation({
    mutationFn: (data) => api.post('/sessions', data),
    onSuccess: () => {
      toast.success('تمت جدولة الحصة')
      qc.invalidateQueries({ queryKey: ['teacher', 'sessions', 'month'] })
      setShowManual(false)
      setManualForm({ studentId:'', titleAr:'', scheduledAt:'', durationMinutes:60, meetingLink:'', meetingProvider:'zoom', notes:'' })
    },
    onError: () => toast.error('حدث خطأ'),
  })

  function chg(e) { setManualForm(p => ({ ...p, [e.target.name]: e.target.value })) }

  // Group sessions by date for month view
  const grouped = sessions.reduce((acc, s) => {
    const k = new Date(s.scheduledAt).toDateString()
    if (!acc[k]) acc[k] = []
    acc[k].push(s)
    return acc
  }, {})

  const TABS = [
    { key: 'month',   label: 'الشهر الحالي', count: sessions.length },
    { key: 'rules',   label: 'الجداول الدورية', count: rules.length },
    { key: 'history', label: 'السجل', count: null },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-3 justify-between">
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-white">الحصص الدراسية</h1>
          <p className="text-sm mt-0.5" style={{ color: '#b3a4d0' }}>إدارة حصصك وجداولك الدورية</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="ghost" onClick={() => setShowManual(true)}>+ حصة واحدة</Button>
          <Button size="sm" variant="gold" onClick={() => setShowWizard(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="inline me-1.5">
              <path d="M12 2v20M2 12h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            إنشاء جدول دوري
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,0.05)' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="px-4 py-1.5 rounded-[10px] text-xs font-semibold transition-all flex items-center gap-1.5"
            style={{
              background: tab === t.key ? 'rgba(232,199,106,0.2)' : 'transparent',
              color: tab === t.key ? '#E8C76A' : '#b3a4d0',
            }}>
            {t.label}
            {t.count != null && t.count > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: tab === t.key ? 'rgba(232,199,106,0.3)' : 'rgba(255,255,255,0.1)' }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Month Tab */}
      {tab === 'month' && (
        <div>
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#b3a4d0' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <div className="text-center">
              <div className="text-white font-bold font-heading">{AR_MONTHS[viewMonth - 1]} {viewYear}</div>
              <div className="text-xs" style={{ color: '#b3a4d0' }}>{sessions.length} حصة</div>
            </div>
            <button onClick={nextMonth}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#b3a4d0' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="m15 18-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {sessLoading ? (
            <div className="flex justify-center py-16"><Spinner color="border-brand-gold" /></div>
          ) : sessions.length === 0 ? (
            <div className="rounded-2xl p-14 text-center"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <Calendar size={44} strokeWidth={1.3} color="#b3a4d0" className="mb-3 mx-auto" />
              <p className="text-white font-semibold mb-1">لا توجد حصص هذا الشهر</p>
              <p className="text-sm mb-4" style={{ color: '#b3a4d0' }}>أنشئ جدولاً دورياً لتوليد الحصص تلقائياً</p>
              <Button size="sm" variant="gold" onClick={() => setShowWizard(true)}>إنشاء جدول دوري</Button>
            </div>
          ) : (
            <div className="space-y-5">
              {Object.entries(grouped).map(([dateKey, daySessions]) => (
                <div key={dateKey}>
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="text-xs font-bold px-3 py-1 rounded-full"
                      style={{ background: 'rgba(232,199,106,0.15)', color: '#E8C76A' }}>
                      {formatDateAr(new Date(dateKey))}
                    </div>
                    <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                    <span className="text-xs" style={{ color: '#b3a4d0' }}>{daySessions.length} حصة</span>
                  </div>
                  <div className="space-y-2">
                    {daySessions.map(s => (
                      <SessionCard key={s._id} session={s}
                        onEval={setEvalSession}
                        onHomework={setHwSession} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Schedule Rules Tab */}
      {tab === 'rules' && (
        <ScheduleRulesView
          rules={rules}
          isLoading={rulesLoading}
          onRefresh={() => qc.invalidateQueries({ queryKey: ['teacher', 'schedule-rules'] })}
        />
      )}

      {/* History Tab */}
      {tab === 'history' && (
        <div>
          {histLoading ? (
            <div className="flex justify-center py-16"><Spinner color="border-brand-gold" /></div>
          ) : !history.length ? (
            <div className="rounded-2xl p-14 text-center"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <p className="text-white font-semibold">لا يوجد سجل حصص</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map(s => (
                <SessionCard key={s._id} session={s} onEval={setEvalSession} onHomework={setHwSession} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Manual Session Modal */}
      <Modal open={showManual} onClose={() => setShowManual(false)} title="جدولة حصة واحدة" size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowManual(false)}>إلغاء</Button>
            <Button variant="gold" onClick={() => createManualMutation.mutate(manualForm)}
              loading={createManualMutation.isPending}
              disabled={!manualForm.studentId || !manualForm.titleAr || !manualForm.scheduledAt}>
              جدولة الحصة
            </Button>
          </>
        }
      >
        <div className="space-y-4" dir="rtl">
          <div>
            <label className={LBL}>الطالب *</label>
            <select name="studentId" value={manualForm.studentId} onChange={chg} className={FIELD}>
              <option value="">اختر طالباً...</option>
              {students.map(s => <option key={s._id} value={s._id}>{s.firstNameAr} {s.lastNameAr}</option>)}
            </select>
          </div>
          <div>
            <label className={LBL}>عنوان الحصة *</label>
            <input name="titleAr" value={manualForm.titleAr} onChange={chg} className={FIELD} placeholder="مثال: حصة تجويد — الدرس الأول" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LBL}>التاريخ والوقت *</label>
              <input type="datetime-local" name="scheduledAt" value={manualForm.scheduledAt} onChange={chg} className={FIELD} />
            </div>
            <div>
              <label className={LBL}>المدة</label>
              <select name="durationMinutes" value={manualForm.durationMinutes} onChange={chg} className={FIELD}>
                <option value={30}>٣٠ دقيقة</option>
                <option value={45}>٤٥ دقيقة</option>
                <option value={60}>٦٠ دقيقة</option>
                <option value={90}>٩٠ دقيقة</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LBL}>المنصة</label>
              <select name="meetingProvider" value={manualForm.meetingProvider} onChange={chg} className={FIELD}>
                <option value="zoom">Zoom</option>
                <option value="meet">Google Meet</option>
                <option value="teams">Microsoft Teams</option>
                <option value="other">أخرى</option>
              </select>
            </div>
            <div>
              <label className={LBL}>رابط الاجتماع</label>
              <input name="meetingLink" value={manualForm.meetingLink} onChange={chg} className={FIELD} placeholder="https://..." />
            </div>
          </div>
        </div>
      </Modal>

      {/* Schedule Wizard */}
      {showWizard && (
        <ScheduleWizard
          students={students}
          onClose={() => setShowWizard(false)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['teacher', 'sessions', 'month'] })
            qc.invalidateQueries({ queryKey: ['teacher', 'schedule-rules'] })
          }}
        />
      )}

      {/* Quick Eval Modal */}
      {evalSession && (
        <QuickEvalModal session={evalSession} onClose={() => setEvalSession(null)} />
      )}

      {/* Quick Homework Modal */}
      {hwSession && (
        <QuickHomeworkModal session={hwSession} onClose={() => setHwSession(null)} />
      )}
    </div>
  )
}
