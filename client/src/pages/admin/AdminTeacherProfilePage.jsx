import { useState, useEffect } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  ArrowRight, Mail, Phone, Wallet, GraduationCap, Users, Calendar, Plus, Clock,
  User, KeyRound, CalendarClock, Lock, History, ClipboardCheck, TrendingUp,
} from 'lucide-react'
import api from '../../utils/api.js'
import Avatar from '../../components/ui/Avatar.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Button from '../../components/ui/Button.jsx'
import ErrorState from '../../components/shared/ErrorState.jsx'
import WorkingHoursEditor from '../../components/ui/WorkingHoursEditor.jsx'
import PasswordCredentialSection, { emptyCredential, validateCredentialValue, credentialPayload } from '../../components/ui/PasswordCredentialSection.jsx'
import StudentScheduleSection, { emptySchedule } from '../../components/ui/StudentScheduleSection.jsx'
import { formatDateAr } from '../../utils/date.js'
import { formatCurrency } from '../../utils/format.js'
import { getFileUrl, ROUTES } from '../../config/constants.js'
import { resolveTeacherIdentity } from '../../utils/teacherIdentity.js'
import { subjectLabel } from '../../utils/teacherProfile.js'
import { useTeachingSubjects } from '../../hooks/useTeachingSubjects.js'
import { audienceCategoriesLabel } from '../../utils/studentAudience.js'
import { buildDefaultWorkingHours, summarizeWorkingHoursDays } from '../../utils/workingHours.js'
import { useAuthStore } from '../../store/authStore.js'
import { deriveScheduleDays, validateScheduleForSubmit } from '../../utils/assignmentSchedule.js'

const inputCls = 'w-full h-10 bg-gray-50 border border-gray-200 rounded-xl px-3.5 text-sm text-gray-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all'
const labelCls = 'text-xs font-bold text-gray-400 mb-1 block'

function InfoRow({ label, value, icon }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-none text-gray-400">{icon}</div>
      <div>
        <div className="text-xs text-gray-400 mb-0.5">{label}</div>
        <div className="text-sm font-semibold text-gray-800">{value}</div>
      </div>
    </div>
  )
}

const ADD_STUDENT_TABS = [
  { key: 'info', label: 'البيانات', Icon: User },
  { key: 'credential', label: 'تسجيل الدخول', Icon: KeyRound },
  { key: 'schedule', label: 'الجدول', Icon: CalendarClock },
]

function emptyAddStudentForm() {
  return {
    firstNameAr: '', lastNameAr: '', email: '', phone: '', gender: '', studentType: '',
    packageId: '', splitMode: 'none', splitValue: '', startDate: new Date().toISOString().slice(0, 10),
    credential: emptyCredential(), schedule: emptySchedule(),
  }
}

function AddStudentModal({ teacherId, open, onClose, teacherContext }) {
  const qc = useQueryClient()
  const { hasPermission } = useAuthStore()
  const overrideAllowed = hasPermission('assignments.override')
  const [tab, setTab] = useState('info')
  const [form, setForm] = useState(emptyAddStudentForm)
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  const { data: packages } = useQuery({
    queryKey: ['packages', 'active'],
    queryFn: () => api.get('/packages').then((r) => r.data.data),
    enabled: open,
  })

  const mut = useMutation({
    mutationFn: (payload) => api.post(`/admin/teachers/${teacherId}/students`, payload).then((r) => r.data),
    onSuccess: (res) => {
      toast.success(res.data.assignmentRequest?.requiresTeacherApproval ? 'تمت إضافة الطالب — بانتظار موافقة المعلم على الجدول' : 'تمت إضافة الطالب')
      qc.invalidateQueries({ queryKey: ['admin', 'teacher-profile', teacherId] })
      qc.invalidateQueries({ queryKey: ['admin', 'teacher-availability', teacherId] })
      onClose()
      setForm(emptyAddStudentForm())
      setTab('info')
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'حدث خطأ')
      const conflicts = err?.response?.data?.conflicts
      if (conflicts?.length) setTab('schedule')
    },
  })

  function submit() {
    if (!form.firstNameAr.trim() || !form.lastNameAr.trim()) return toast.error('الاسم الأول واسم العائلة مطلوبان')
    if (!form.email.trim()) return toast.error('البريد الإلكتروني مطلوب')
    if (!form.studentType) return toast.error('يجب تحديد نوع الطالب')
    const credentialError = validateCredentialValue(form.credential)
    if (credentialError) { setTab('credential'); return toast.error(credentialError) }
    const scheduleError = validateScheduleForSubmit(form.schedule, form.studentType)
    if (scheduleError) { setTab('schedule'); return toast.error(scheduleError) }

    const payload = {
      firstNameAr: form.firstNameAr, lastNameAr: form.lastNameAr, email: form.email, phone: form.phone,
      gender: form.gender || undefined, studentType: form.studentType, credential: credentialPayload(form.credential),
    }
    if (form.packageId) {
      payload.package = {
        packageId: form.packageId, startDate: form.startDate,
        ...(form.splitMode === 'used' ? { lessonsUsed: Number(form.splitValue) } : {}),
        ...(form.splitMode === 'remaining' ? { lessonsRemaining: Number(form.splitValue) } : {}),
      }
    }
    if (form.schedule.enabled) {
      Object.assign(payload, {
        specialization: form.schedule.specialization,
        lessonDurationMinutes: form.schedule.lessonDurationMinutes,
        schedule: {
          days: deriveScheduleDays(form.schedule), startDate: form.schedule.startDate,
          endDate: form.schedule.noEndDate ? undefined : (form.schedule.endDate || undefined), frequency: form.schedule.frequency,
        },
        teachingType: form.schedule.teachingType,
        scheduleNotes: form.schedule.notes || undefined,
        immediateOverride: form.studentType === 'new' ? !!form.schedule.immediateOverride : undefined,
        overrideReason: form.schedule.overrideReason || undefined,
      })
    }
    mut.mutate(payload)
  }

  const pkg = (packages || []).find((p) => p._id === form.packageId)

  return (
    <Modal open={open} onClose={onClose} title="إضافة طالب جديد" size="md"
      footer={<>
        <Button variant="ghost" onClick={onClose}>إلغاء</Button>
        <Button variant="purple" onClick={submit} loading={mut.isPending}>إضافة الطالب</Button>
      </>}>
      <div className="space-y-3">
        {/* Locked teacher context — never editable here; a genuine "change
            teacher" affordance would be a separate, deliberate action
            outside this continuation flow's scope. */}
        {teacherContext && (
          <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3 flex items-start gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-none text-gray-400">
              <Lock size={13} />
            </span>
            <div className="min-w-0 text-xs">
              <div className="font-bold text-gray-800 text-sm truncate">{teacherContext.name}</div>
              <div className="text-gray-500 mt-0.5">{teacherContext.specializationsLabel || 'بدون تخصص محدد'}</div>
              <div className="flex items-center gap-3 mt-1 text-gray-500">
                <span className="flex items-center gap-1"><Clock size={11} /> {teacherContext.workingHoursSummary}</span>
                <span className="flex items-center gap-1"><Users size={11} /> {teacherContext.studentsCount} طالب مسند حاليًا</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-1.5 border-b border-gray-100 pb-2">
          {ADD_STUDENT_TABS.map((t) => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${tab === t.key ? 'bg-violet-50 text-violet-700' : 'text-gray-400 hover:text-gray-600'}`}>
              <t.Icon size={13} /> {t.label}
            </button>
          ))}
        </div>

        {tab === 'info' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label htmlFor="addstudent-firstNameAr" className={labelCls}>الاسم الأول</label><input id="addstudent-firstNameAr" className={inputCls} value={form.firstNameAr} onChange={(e) => set('firstNameAr', e.target.value)} /></div>
              <div><label htmlFor="addstudent-lastNameAr" className={labelCls}>اسم العائلة</label><input id="addstudent-lastNameAr" className={inputCls} value={form.lastNameAr} onChange={(e) => set('lastNameAr', e.target.value)} /></div>
            </div>
            <div><label htmlFor="addstudent-email" className={labelCls}>البريد الإلكتروني</label><input id="addstudent-email" type="email" dir="ltr" className={inputCls} value={form.email} onChange={(e) => set('email', e.target.value)} /></div>
            <div><label htmlFor="addstudent-phone" className={labelCls}>رقم الهاتف</label><input id="addstudent-phone" dir="ltr" className={inputCls} value={form.phone} onChange={(e) => set('phone', e.target.value)} /></div>
            <div>
              <label className={labelCls}>نوع الطالب</label>
              <div className="grid grid-cols-2 gap-2">
                {[['existing', 'قديم'], ['new', 'جديد']].map(([v, l]) => (
                  <button key={v} type="button" onClick={() => set('studentType', v)}
                    className={`h-10 rounded-xl text-sm font-bold border transition-colors ${form.studentType === v ? 'bg-violet-600 border-violet-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="addstudent-packageId" className={labelCls}>الباقة (اختياري)</label>
              <select id="addstudent-packageId" className={inputCls} value={form.packageId} onChange={(e) => set('packageId', e.target.value)}>
                <option value="">— بدون باقة الآن —</option>
                {(packages || []).map((p) => <option key={p._id} value={p._id}>{p.nameAr} — {p.sessionsPerMonth} حصة</option>)}
              </select>
            </div>
            {pkg && (
              <div className="rounded-lg bg-gray-50 p-3 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {[['none', 'باقة جديدة بالكامل'], ['used', 'إدخال المستخدم'], ['remaining', 'إدخال المتبقي']].map(([v, l]) => (
                    <button key={v} type="button" onClick={() => set('splitMode', v)}
                      className={`px-2.5 py-1.5 rounded-md text-[11px] font-bold ${form.splitMode === v ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500'}`}>
                      {l}
                    </button>
                  ))}
                </div>
                {form.splitMode !== 'none' && (
                  <input type="number" min="0" max={pkg.sessionsPerMonth} className={inputCls}
                    placeholder={form.splitMode === 'used' ? 'عدد الحصص المستخدمة' : 'عدد الحصص المتبقية'}
                    value={form.splitValue} onChange={(e) => set('splitValue', e.target.value)} />
                )}
                <div><label htmlFor="addstudent-startDate" className={labelCls}>تاريخ بداية الاشتراك</label><input id="addstudent-startDate" type="date" className={inputCls} value={form.startDate} onChange={(e) => set('startDate', e.target.value)} /></div>
              </div>
            )}
          </div>
        )}

        {tab === 'credential' && (
          <PasswordCredentialSection value={form.credential} onChange={(v) => set('credential', v)} compact />
        )}

        {tab === 'schedule' && (
          <StudentScheduleSection
            value={form.schedule} onChange={(v) => set('schedule', v)}
            teacherId={teacherId} studentType={form.studentType} overrideAllowed={overrideAllowed}
          />
        )}
      </div>
    </Modal>
  )
}

function WorkingHoursCard({ teacherId, initialDays }) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [days, setDays] = useState(initialDays || buildDefaultWorkingHours())

  const mut = useMutation({
    mutationFn: (payload) => api.put(`/admin/teachers/${teacherId}/working-hours`, payload).then((r) => r.data),
    onSuccess: () => {
      toast.success('تم تحديث أوقات العمل')
      qc.invalidateQueries({ queryKey: ['admin', 'teacher-profile', teacherId] })
      setEditing(false)
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'حدث خطأ'),
  })

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-900 flex items-center gap-2"><Clock size={16} className="text-violet-600" /> أوقات العمل</h3>
        {!editing && (
          <button onClick={() => { setDays(initialDays || buildDefaultWorkingHours()); setEditing(true) }} className="text-xs font-bold text-violet-600 hover:text-violet-800">
            تعديل
          </button>
        )}
      </div>
      {editing ? (
        <div className="space-y-3">
          <WorkingHoursEditor value={days} onChange={setDays} disabled={mut.isPending} />
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="flex-1 h-9 rounded-xl bg-gray-100 text-gray-600 text-sm font-bold">إلغاء</button>
            <button onClick={() => mut.mutate({ days })} disabled={mut.isPending}
              className="flex-1 h-9 rounded-xl bg-violet-600 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60">
              {mut.isPending && <Spinner size="sm" color="border-white" />} حفظ
            </button>
          </div>
        </div>
      ) : (
        <WorkingHoursEditor value={initialDays || buildDefaultWorkingHours()} onChange={() => {}} disabled />
      )}
    </div>
  )
}

// Assigned/pending students, completed/upcoming lessons, and compensation
// consolidated on one profile (Phase 2 change request #4) — reuses existing
// endpoints rather than a new aggregate one: the teacher-profile payload
// already carries `recentSessions`/`scheduleRules` (previously fetched but
// never rendered), the assignment-requests list is filtered client-side to
// this teacher's pending queue, and salary/attendance comes from the
// existing (admin-only, `reports.view`-gated) teacher-performance endpoint.

const SESSION_STATUS_LABELS_AR = {
  scheduled: { label: 'قادمة', color: '#0891b2' },
  ongoing: { label: 'جارية', color: '#7c3aed' },
  completed: { label: 'مكتملة', color: '#059669' },
  cancelled: { label: 'ملغاة', color: '#6b7280' },
  rescheduled: { label: 'أُجّلت', color: '#d97706' },
  missed: { label: 'فائتة', color: '#dc2626' },
  no_show: { label: 'غياب', color: '#dc2626' },
}

function PendingRequestsCard({ teacherId }) {
  const { data } = useQuery({
    queryKey: ['admin', 'assignment-requests', 'teacher-pending', teacherId],
    queryFn: () => api.get('/admin/assignments', { params: { teacherId, status: 'pending_teacher_approval,time_change_requested', limit: 5 } }).then((r) => r.data.data),
  })
  const items = data?.items || []
  if (!items.length) return null
  return (
    <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-900 flex items-center gap-2"><ClipboardCheck size={16} className="text-amber-600" /> طلبات إسناد معلقة ({data?.total ?? items.length})</h3>
        <Link to={`${ROUTES.ADMIN_ASSIGNMENT_REQUESTS}?teacherId=${teacherId}`} className="text-xs font-bold text-violet-600 hover:text-violet-800">عرض الكل</Link>
      </div>
      <div className="space-y-2">
        {items.map((r) => {
          const statusCfg = r.status === 'time_change_requested'
            ? { label: 'اقترح المعلم موعدًا آخر', color: '#dc2626' }
            : { label: 'محجوز مؤقتًا — بانتظار الموافقة', color: '#d97706' }
          return (
            <Link key={r._id} to={ROUTES.ADMIN_ASSIGNMENT_REQUEST_DETAIL.replace(':id', r._id)}
              className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2 text-xs hover:border-violet-300 hover:bg-violet-50/30 transition-colors">
              <span className="font-semibold text-gray-800 truncate">{r.studentId?.firstNameAr} {r.studentId?.lastNameAr}</span>
              <span className="font-bold flex-none" style={{ color: statusCfg.color }}>{statusCfg.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function RecentSessionsCard({ sessions }) {
  if (!sessions?.length) return null
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-3"><History size={16} className="text-violet-600" /> آخر الحصص</h3>
      <div className="space-y-2">
        {sessions.slice(0, 8).map((s) => {
          const cfg = SESSION_STATUS_LABELS_AR[s.status] || { label: s.status, color: '#6b7280' }
          return (
            <div key={s._id} className="flex items-center justify-between gap-2 text-xs py-1.5 border-b border-gray-50 last:border-0">
              <span className="text-gray-700 truncate">{s.studentId?.firstNameAr} {s.studentId?.lastNameAr}</span>
              <span className="text-gray-400 flex-none">{formatDateAr(s.scheduledAt)}</span>
              <span className="font-bold flex-none" style={{ color: cfg.color }}>{cfg.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Compensation/payable totals — sensitive, admin-only data (guarded by the
// same `reports.view` permission the payroll/report screens already use;
// never shown to a plain-permission admin, and never reachable by a
// teacher, who has no route to this page at all).
function CompensationCard({ teacherId, hourlyRate }) {
  const { hasPermission } = useAuthStore()
  const allowed = hasPermission('reports.view')
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'teacher-performance', 'summary', teacherId],
    queryFn: () => api.get(`/teacher-performance/admin/${teacherId}/summary`).then((r) => r.data.data),
    enabled: allowed,
  })
  if (!allowed) return null
  const salary = data?.salary
  const attendance = data?.attendance
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-3"><Wallet size={16} className="text-violet-600" /> الأداء والمستحقات</h3>
      {isLoading ? (
        <div className="flex justify-center py-6"><Spinner color="border-violet-600" /></div>
      ) : !salary ? (
        <p className="text-xs text-gray-400">لا تتوفر بيانات بعد</p>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-xl bg-gray-50 p-3">
              <div className="text-lg font-extrabold text-emerald-600">{formatCurrency(salary.totalAmount, salary.currency)}</div>
              <div className="text-[11px] text-gray-400 mt-0.5">إجمالي المستحق (فترة محدودة)</div>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <div className="text-lg font-extrabold text-gray-800">{salary.payableSessions ?? 0}</div>
              <div className="text-[11px] text-gray-400 mt-0.5">عدد الحصص المستحقة</div>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <div className="text-lg font-extrabold text-gray-800">{attendance?.completionRate ?? 0}%</div>
              <div className="text-[11px] text-gray-400 mt-0.5">نسبة الالتزام بالحصص</div>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <div className="text-lg font-extrabold text-gray-800">{attendance?.punctualityRate ?? 0}%</div>
              <div className="text-[11px] text-gray-400 mt-0.5">نسبة الالتزام بالموعد</div>
            </div>
          </div>
          {!!hourlyRate && (
            <div className="rounded-xl border border-gray-100 p-3">
              <div className="text-[11px] font-bold text-gray-400 mb-1.5">قيمة الحصة حسب المدة (سعر الساعة × المدة ÷ 60)</div>
              <div className="grid grid-cols-4 gap-1.5">
                {[30, 45, 60, 90].map((mins) => (
                  <div key={mins} className="text-center rounded-lg bg-gray-50 py-1.5">
                    <div className="text-xs font-bold text-gray-800">{formatCurrency(Math.round(hourlyRate * mins / 60), 'EGP')}</div>
                    <div className="text-[10px] text-gray-400">{mins} د</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function AdminTeacherProfilePage() {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [showAddStudent, setShowAddStudent] = useState(false)
  const { data: subjects = [] } = useTeachingSubjects()

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'teacher-profile', id],
    queryFn: () => api.get(`/admin/teachers/${id}`).then((r) => r.data.data),
  })

  // Continuation from the onboarding wizard's success page
  // (`/admin/teachers/:id?action=add`) — only auto-opens once the teacher is
  // actually confirmed to exist on the backend (never before `data` loads),
  // and the query flag is stripped immediately so a later back/forward
  // navigation doesn't reopen it unexpectedly.
  useEffect(() => {
    if (!isLoading && !isError && data && searchParams.get('action') === 'add') {
      setShowAddStudent(true)
      const next = new URLSearchParams(searchParams)
      next.delete('action')
      setSearchParams(next, { replace: true })
    }
  }, [isLoading, isError, data, searchParams, setSearchParams])

  if (isLoading) return <div className="flex justify-center py-24"><Spinner color="border-violet-600" /></div>
  if (isError || !data) return <ErrorState title="تعذّر تحميل الملف الإداري للمعلم" onRetry={refetch} />

  const { teacher, students, workingHours, recentSessions, scheduleRules } = data
  const weeklySessionCount = (scheduleRules || []).reduce((sum, r) => sum + (r.daysOfWeek?.length || (r.frequency === 'daily' ? 7 : 1)), 0)
  const identity = resolveTeacherIdentity(teacher)
  const specializations = teacher.specializations?.length ? teacher.specializations : (teacher.category ? [teacher.category] : [])

  return (
    <div dir="rtl" className="space-y-5">
      <div className="flex items-center gap-3">
        <Link to={ROUTES.ADMIN_TEACHERS} className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
          <ArrowRight size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-heading font-extrabold text-2xl text-gray-900 truncate">{teacher.firstNameAr} {teacher.lastNameAr}</h1>
          <p className="text-sm text-gray-500 mt-0.5">الملف الإداري الكامل للمعلم</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1 space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-4">
              <Avatar src={identity.displayAvatar} firstName={teacher.firstNameAr} lastName={teacher.lastNameAr} size="lg" />
              <div>
                <div className="font-bold text-gray-900">{teacher.firstNameAr} {teacher.lastNameAr}</div>
                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full mt-1 ${teacher.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                  {teacher.isActive ? 'نشط' : 'موقوف'}
                </span>
              </div>
            </div>
            <InfoRow label="البريد الإلكتروني" value={teacher.email} icon={<Mail size={14} />} />
            <InfoRow label="رقم الهاتف" value={teacher.phone} icon={<Phone size={14} />} />
            <InfoRow label="تخصصات التدريس" value={specializations.map((s) => subjectLabel(subjects, s)).filter(Boolean).join('، ') || null} icon={<GraduationCap size={14} />} />
            <InfoRow label="الفئات المستهدفة" value={audienceCategoriesLabel(teacher.audienceCategories)} icon={<Users size={14} />} />
            <InfoRow label="سعر ساعة التدريس" value={teacher.hourlyRate ? formatCurrency(teacher.hourlyRate, 'EGP') : null} icon={<Wallet size={14} />} />
            <InfoRow label="تاريخ الانضمام" value={formatDateAr(teacher.createdAt)} icon={<Calendar size={14} />} />
            <InfoRow label="عبء العمل الأسبوعي" value={weeklySessionCount ? `${weeklySessionCount} حصة/أسبوع عبر ${scheduleRules?.length || 0} جدول دوري نشط` : null} icon={<TrendingUp size={14} />} />
          </div>

          <WorkingHoursCard teacherId={id} initialDays={workingHours?.days} />
          <CompensationCard teacherId={id} hourlyRate={teacher.hourlyRate} />
          <PendingRequestsCard teacherId={id} />
        </div>

        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-2"><Users size={16} className="text-violet-600" /> الطلاب المسندون ({students?.length || 0})</h3>
              <button onClick={() => setShowAddStudent(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors">
                <Plus size={14} /> إضافة طالب
              </button>
            </div>

            {!students?.length ? (
              <div className="py-12 text-center text-gray-400">
                <Users size={28} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm font-semibold">لا يوجد طلاب مسندون لهذا المعلم بعد</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {students.map((s) => (
                  <Link
                    key={s.subscriptionId || `schedule-${s.student?._id}`}
                    to={s.student?._id ? ROUTES.ADMIN_STUDENT_DETAIL.replace(':id', s.student._id) : '#'}
                    className="rounded-xl border border-gray-100 p-3.5 flex items-center justify-between gap-3 flex-wrap hover:border-violet-300 hover:bg-violet-50/30 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar src={getFileUrl(s.student?.avatar)} firstName={s.student?.firstNameAr} lastName={s.student?.lastNameAr} size="sm" />
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900 text-sm truncate">{s.student?.firstNameAr} {s.student?.lastNameAr}</div>
                        <div className="text-xs text-gray-400 truncate">{s.status === 'schedule_only' ? 'جدول بدون اشتراك بعد' : (s.package?.nameAr || 'بدون باقة')}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-none">
                      {s.student?.studentType && (
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${s.student.studentType === 'new' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                          {s.student.studentType === 'new' ? 'طالب جديد' : 'طالب قديم'}
                        </span>
                      )}
                      {s.status !== 'schedule_only' && <span className="text-sm font-bold text-emerald-600">{s.wallet?.remaining ?? 0} حصة</span>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <RecentSessionsCard sessions={recentSessions} />
        </div>
      </div>

      <AddStudentModal
        teacherId={id} open={showAddStudent} onClose={() => setShowAddStudent(false)}
        teacherContext={{
          name: `${teacher.firstNameAr} ${teacher.lastNameAr}`,
          specializationsLabel: specializations.map((s) => subjectLabel(subjects, s)).filter(Boolean).join('، '),
          workingHoursSummary: summarizeWorkingHoursDays(workingHours?.days),
          studentsCount: students?.length || 0,
        }}
      />
    </div>
  )
}
