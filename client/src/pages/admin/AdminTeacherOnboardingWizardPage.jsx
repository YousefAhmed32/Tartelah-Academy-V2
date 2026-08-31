import { useState, useMemo, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  ChevronRight, ChevronLeft, Plus, Trash2, AlertCircle, CheckCircle2, Copy, User, GraduationCap,
  KeyRound, CalendarClock, Pencil, XCircle, History, UserPlus, Users, X,
} from 'lucide-react'
import api from '../../utils/api.js'
import Input from '../../components/ui/Input.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import GenderSegmentedControl from '../../components/ui/GenderSegmentedControl.jsx'
import ShiftsMultiSelect from '../../components/ui/ShiftsMultiSelect.jsx'
import SpecializationsMultiSelect from '../../components/ui/SpecializationsMultiSelect.jsx'
import AudienceCategoriesMultiSelect from '../../components/ui/AudienceCategoriesMultiSelect.jsx'
import WorkingHoursEditor from '../../components/ui/WorkingHoursEditor.jsx'
import PasswordCredentialSection, { emptyCredential, validateCredentialValue, credentialPayload } from '../../components/ui/PasswordCredentialSection.jsx'
import StudentScheduleSection, { emptySchedule } from '../../components/ui/StudentScheduleSection.jsx'
import { buildDefaultWorkingHours, validateWorkingHoursDays } from '../../utils/workingHours.js'
import { formatCurrency } from '../../utils/format.js'
import {
  dayLabel, durationLabel, ASSIGNMENT_STATUS_LABELS, deriveScheduleDays,
  validateScheduleForSubmit, formatTimeArabic12,
} from '../../utils/assignmentSchedule.js'
import { useAuthStore } from '../../store/authStore.js'
import { ROUTES, buildTeacherAddStudentUrl } from '../../config/constants.js'

const inputCls = 'w-full h-10 bg-gray-50 border border-gray-200 rounded-xl px-3.5 text-sm text-gray-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all'
const labelCls = 'text-xs font-bold text-gray-400 mb-1 block'
const RESUME_STORAGE_KEY = 'tartelah_onboarding_resume_v1'
// Lightweight, non-sensitive fallback for "the success page's result was lost
// on refresh" (Phase 2 Part 2c continuation improvement) — holds only the
// finalized teacher's id/name, never credentials or student data, so a
// refresh right after finishing can still offer a safe way back to the
// teacher's profile instead of silently landing on a blank wizard with no
// path forward. Cleared once the admin dismisses the banner.
const LAST_COMPLETED_STORAGE_KEY = 'tartelah_onboarding_last_completed_v1'

// Optional (never required, never guessed) — used only for gender-correct
// wording in the generated teacher-assignment message when a schedule is
// set up for this student (see server/src/config/assignmentMessage.js).
const STUDENT_GENDER_OPTIONS = [
  { value: 'male', label: 'طالب' },
  { value: 'female', label: 'طالبة' },
]

function newClientRequestId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `req-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function emptyTeacher() {
  return {
    firstNameAr: '', lastNameAr: '', email: '', phone: '',
    gender: '', bioAr: '', specializations: [], audienceCategories: [], hourlyRate: '', availableShifts: [],
    credential: emptyCredential(),
  }
}

function emptyStudent() {
  return {
    _saveKey: newClientRequestId(),
    firstNameAr: '', lastNameAr: '', email: '', phone: '', gender: '',
    studentType: '', packageId: '', splitMode: 'none', splitValue: '',
    startDate: new Date().toISOString().slice(0, 10), notes: '',
    credential: emptyCredential(),
    schedule: emptySchedule(),
    _tab: 'info',
  }
}

// Pure client-side mirror of the backend's computeOpeningBalance — for
// instant inline feedback only; the backend remains the real validation
// boundary (see server/src/config/lessonPolicy.js).
function computeSplitPreview(packageTotal, splitMode, splitValue) {
  const total = Number(packageTotal) || 0
  if (splitMode === 'none' || splitValue === '' || splitValue === undefined) return { used: 0, remaining: total, error: null }
  const n = Number(splitValue)
  if (!Number.isInteger(n) || n < 0) return { used: null, remaining: null, error: 'قيمة غير صحيحة' }
  if (n > total) return { used: null, remaining: null, error: 'القيمة أكبر من إجمالي حصص الباقة' }
  return splitMode === 'used'
    ? { used: n, remaining: total - n, error: null }
    : { used: total - n, remaining: n, error: null }
}

// Builds the incremental "save student" request body from the active form's
// local shape — same field mapping the old one-shot wizard used per student,
// just for exactly one student at a time.
function buildStudentPayload(s) {
  const base = {
    firstNameAr: s.firstNameAr, lastNameAr: s.lastNameAr, email: s.email, phone: s.phone,
    gender: s.gender || undefined, studentType: s.studentType, credential: credentialPayload(s.credential),
  }
  const withPackage = !s.packageId ? base : {
    ...base,
    package: {
      packageId: s.packageId, startDate: s.startDate,
      ...(s.splitMode === 'used' ? { lessonsUsed: Number(s.splitValue) } : {}),
      ...(s.splitMode === 'remaining' ? { lessonsRemaining: Number(s.splitValue) } : {}),
    },
  }
  if (!s.schedule.enabled) return withPackage
  return {
    ...withPackage,
    specialization: s.schedule.specialization,
    lessonDurationMinutes: s.schedule.lessonDurationMinutes,
    schedule: {
      days: deriveScheduleDays(s.schedule), startDate: s.schedule.startDate,
      endDate: s.schedule.noEndDate ? undefined : (s.schedule.endDate || undefined), frequency: s.schedule.frequency,
    },
    teachingType: s.schedule.teachingType,
    scheduleNotes: s.schedule.notes || undefined,
    immediateOverride: s.studentType === 'new' ? !!s.schedule.immediateOverride : undefined,
    overrideReason: s.schedule.overrideReason || undefined,
  }
}

function StepHeader({ steps, current }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-1 flex-none">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-none ${
            i === current ? 'bg-violet-600 text-white' : i < current ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-400'
          }`}>
            {i < current ? <CheckCircle2 size={14} /> : i + 1}
          </div>
          <span className={`text-xs font-semibold whitespace-nowrap ${i === current ? 'text-gray-900' : 'text-gray-400'}`}>{s}</span>
          {i < steps.length - 1 && <div className="w-6 h-px bg-gray-200 mx-1 flex-none" />}
        </div>
      ))}
    </div>
  )
}

const TABS = [
  { key: 'info', label: 'البيانات', Icon: User },
  { key: 'credential', label: 'تسجيل الدخول', Icon: KeyRound },
  { key: 'schedule', label: 'الجدول', Icon: CalendarClock },
]

// The ONE actively-edited, not-yet-saved student form. Only ever one of
// these is on screen at a time — every earlier student in this session is
// already saved and renders as a compact backend-driven summary instead
// (see SavedStudentCard below).
function ActiveStudentCard({ student, packages, teacherId, overrideAllowed, onChange, onDiscard, saving, lockConflict }) {
  const pkg = packages.find((p) => p._id === student.packageId)
  const preview = pkg ? computeSplitPreview(pkg.sessionsPerMonth, student.splitMode, student.splitValue) : null
  const set = (k, v) => onChange({ ...student, [k]: v })
  const credentialError = validateCredentialValue(student.credential)
  const scheduleError = validateScheduleForSubmit(student.schedule, student.studentType)
  const hasError = !student.firstNameAr.trim() || !student.lastNameAr.trim() || !student.email.trim() || !student.studentType || credentialError || scheduleError || preview?.error

  return (
    <div className="rounded-xl border-2 border-violet-200 bg-violet-50/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-violet-500" /> طالب جديد (غير محفوظ بعد)
        </span>
        <button type="button" onClick={onDiscard} disabled={saving}
          className="flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-red-600 transition-colors disabled:opacity-40">
          <XCircle size={13} /> إلغاء التعديلات غير المحفوظة
        </button>
      </div>

      <div className="flex gap-1.5 border-b border-gray-100 pb-2">
        {TABS.map((t) => (
          <button
            key={t.key} type="button" onClick={() => set('_tab', t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              student._tab === t.key ? 'bg-violet-100 text-violet-700' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <t.Icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      {student._tab === 'info' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label htmlFor="student-firstNameAr" className={labelCls}>الاسم الأول</label><input id="student-firstNameAr" className={inputCls} value={student.firstNameAr} onChange={(e) => set('firstNameAr', e.target.value)} /></div>
            <div><label htmlFor="student-lastNameAr" className={labelCls}>اسم العائلة</label><input id="student-lastNameAr" className={inputCls} value={student.lastNameAr} onChange={(e) => set('lastNameAr', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label htmlFor="student-email" className={labelCls}>البريد الإلكتروني</label><input id="student-email" type="email" dir="ltr" className={inputCls} value={student.email} onChange={(e) => set('email', e.target.value)} /></div>
            <div><label htmlFor="student-phone" className={labelCls}>رقم الهاتف</label><input id="student-phone" dir="ltr" className={inputCls} value={student.phone} onChange={(e) => set('phone', e.target.value)} /></div>
          </div>

          <GenderSegmentedControl
            value={student.gender} onChange={(v) => set('gender', v)} options={STUDENT_GENDER_OPTIONS}
            label="تصنيف الطالب (اختياري — لصياغة رسالة الإسناد فقط)"
          />

          <div>
            <label className={labelCls}>نوع الطالب</label>
            <div className="grid grid-cols-2 gap-2">
              {[['existing', 'قديم'], ['new', 'جديد']].map(([v, l]) => (
                <button key={v} type="button" onClick={() => set('studentType', v)}
                  className={`h-10 rounded-xl text-sm font-bold border transition-colors ${student.studentType === v ? 'bg-violet-600 border-violet-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-violet-300'}`}>
                  {l}
                </button>
              ))}
            </div>
            {!student.studentType && <p className="text-[11px] text-amber-600 mt-1 font-semibold">مطلوب — حدد نوع الطالب</p>}
          </div>

          <div>
            <label htmlFor="student-packageId" className={labelCls}>الباقة (اختياري — يمكن إضافتها لاحقًا)</label>
            <select id="student-packageId" className={inputCls} value={student.packageId} onChange={(e) => set('packageId', e.target.value)}>
              <option value="">— بدون باقة الآن —</option>
              {packages.map((p) => (
                <option key={p._id} value={p._id}>{p.nameAr} — {p.sessionsPerMonth} حصة — {formatCurrency(p.price, p.currency || 'EGP')}</option>
              ))}
            </select>
          </div>

          {pkg && (
            <div className="rounded-lg bg-gray-50 p-3 space-y-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                {[['none', 'باقة جديدة بالكامل'], ['used', 'إدخال المستخدم'], ['remaining', 'إدخال المتبقي']].map(([v, l]) => (
                  <button key={v} type="button" onClick={() => set('splitMode', v)}
                    className={`px-2.5 py-1.5 rounded-md text-[11px] font-bold transition-all ${student.splitMode === v ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    {l}
                  </button>
                ))}
              </div>
              {student.splitMode !== 'none' && (
                <input type="number" min="0" max={pkg.sessionsPerMonth} className={inputCls}
                  placeholder={student.splitMode === 'used' ? 'عدد الحصص المستخدمة' : 'عدد الحصص المتبقية'}
                  value={student.splitValue} onChange={(e) => set('splitValue', e.target.value)} />
              )}
              <div className="flex items-center justify-between text-xs">
                {preview?.error ? (
                  <span className="text-red-600 font-semibold flex items-center gap-1"><AlertCircle size={12} /> {preview.error}</span>
                ) : (
                  <>
                    <span className="text-gray-500">المستخدم: <b className="text-gray-700">{preview?.used ?? 0}</b></span>
                    <span className="text-gray-500">الرصيد الافتتاحي: <b className="text-emerald-600">{preview?.remaining ?? pkg.sessionsPerMonth}</b> من {pkg.sessionsPerMonth}</span>
                  </>
                )}
              </div>
              <div>
                <label htmlFor="student-startDate" className={labelCls}>تاريخ بداية الاشتراك</label>
                <input id="student-startDate" type="date" className={inputCls} value={student.startDate} onChange={(e) => set('startDate', e.target.value)} />
              </div>
            </div>
          )}
        </div>
      )}

      {student._tab === 'credential' && (
        <PasswordCredentialSection value={student.credential} onChange={(v) => set('credential', v)} compact />
      )}

      {student._tab === 'schedule' && (
        <div className="space-y-2.5">
          {lockConflict && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs font-bold text-amber-700 flex items-start gap-2">
              <AlertCircle size={14} className="flex-none mt-0.5" />
              <span>تم حجز هذا الموعد منذ لحظات. اخترنا لك أقرب المواعيد المتاحة — يرجى اختيار موعد آخر أدناه.</span>
            </div>
          )}
          <StudentScheduleSection
            value={student.schedule} onChange={(v) => set('schedule', v)}
            teacherId={teacherId} studentType={student.studentType} overrideAllowed={overrideAllowed}
            localWorkingHoursDays={null} siblingDaysList={[]}
          />
        </div>
      )}

      {hasError && student._tab !== 'schedule' && (
        <p className="text-[11px] text-amber-600 font-semibold flex items-center gap-1.5"><AlertCircle size={12} /> أكمل البيانات المطلوبة قبل الحفظ</p>
      )}
    </div>
  )
}

// A student already persisted in THIS onboarding session — read entirely
// from the backend summary (never from local form state), per the
// requirement that saved-student data always reflects the server.
function SavedStudentCard({ summary, onEdit, onRemove, removing }) {
  const { student, subscription, openingBalance, assignmentRequest } = summary
  const statusMeta = assignmentRequest ? ASSIGNMENT_STATUS_LABELS[assignmentRequest.status] : null
  const days = assignmentRequest?.schedule?.days || []
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-3.5 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-none"><CheckCircle2 size={14} /></span>
          <div className="min-w-0">
            <div className="text-sm font-bold text-gray-800 truncate">{student.firstNameAr} {student.lastNameAr}</div>
            <div className="text-[11px] text-gray-500 truncate">{student.email} — {student.studentType === 'existing' ? 'طالب قديم' : 'طالب جديد'}</div>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-none">
          <button type="button" onClick={onEdit} disabled={removing}
            className="text-violet-600 hover:bg-violet-50 rounded-lg p-1.5 transition-colors disabled:opacity-40" aria-label="تعديل الطالب المحفوظ" title="تعديل الطالب المحفوظ">
            <Pencil size={13} />
          </button>
          <button type="button" onClick={onRemove} disabled={removing}
            className="text-red-500 hover:bg-red-50 rounded-lg p-1.5 transition-colors disabled:opacity-40" aria-label="حذف الطالب من هذه العملية" title="حذف الطالب من هذه العملية">
            {removing ? <Spinner size="sm" /> : <Trash2 size={13} />}
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        {subscription && (
          <span className="px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600 font-semibold">
            {subscription.packageId?.nameAr ? `باقة: ${subscription.packageId.nameAr}` : 'باقة'} — رصيد {openingBalance?.remaining ?? '—'}
          </span>
        )}
        {days.length > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600 font-semibold">
            {days.map((d) => `${dayLabel(d.dayOfWeek)} ${formatTimeArabic12(d.time)}`).join('، ')} — {durationLabel(assignmentRequest.lessonDurationMinutes)}
          </span>
        )}
        {statusMeta && (
          <span className="px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: `${statusMeta.color}1a`, color: statusMeta.color }}>
            {statusMeta.label}
          </span>
        )}
        {student.credential?.mode === 'manual' && (
          <span className="px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-500 font-semibold">بيانات دخول يدوية</span>
        )}
      </div>
    </div>
  )
}

export default function AdminTeacherOnboardingWizardPage() {
  const queryClient = useQueryClient()
  const { hasPermission } = useAuthStore()
  const overrideAllowed = hasPermission('assignments.override')
  const [step, setStep] = useState(0)
  const [teacher, setTeacher] = useState(emptyTeacher)
  const [workingHours, setWorkingHours] = useState(buildDefaultWorkingHours())
  const [session, setSession] = useState(null) // { _id, ... } once the teacher is persisted
  const [persistedTeacher, setPersistedTeacher] = useState(null)
  const [temporaryPasswords, setTemporaryPasswords] = useState({})
  const [savedStudents, setSavedStudents] = useState([]) // backend summaries, one per saved student
  const [activeStudent, setActiveStudent] = useState(emptyStudent)
  const [lockConflict, setLockConflict] = useState(false)
  const [cancelReasonOpen, setCancelReasonOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [finalResult, setFinalResult] = useState(null)
  const [resumeCandidate, setResumeCandidate] = useState(null)
  const [lastCompleted, setLastCompleted] = useState(null) // sessionStorage fallback if the success page's state was lost on refresh
  const clientRequestIdRef = useRef(newClientRequestId())

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RESUME_STORAGE_KEY)
      if (raw) setResumeCandidate(JSON.parse(raw))
    } catch { /* ignore malformed/blocked storage */ }
    try {
      const raw = sessionStorage.getItem(LAST_COMPLETED_STORAGE_KEY)
      if (raw) setLastCompleted(JSON.parse(raw))
    } catch { /* ignore malformed/blocked storage */ }
  }, [])

  function rememberForResume(sessionId, teacherName) {
    try {
      localStorage.setItem(RESUME_STORAGE_KEY, JSON.stringify({ sessionId, teacherName, updatedAt: Date.now() }))
    } catch { /* best-effort only — resumability degrades gracefully without it */ }
  }
  function forgetResume() {
    try { localStorage.removeItem(RESUME_STORAGE_KEY) } catch { /* ignore */ }
    setResumeCandidate(null)
  }

  // Non-sensitive — teacher id/name only, never credentials or student data.
  // Lets a refresh right after finishing still offer a safe way back to the
  // teacher's profile instead of a dead end with no path forward.
  function rememberLastCompleted(teacherId, teacherName) {
    try {
      sessionStorage.setItem(LAST_COMPLETED_STORAGE_KEY, JSON.stringify({ teacherId, teacherName, at: Date.now() }))
    } catch { /* best-effort only */ }
  }
  function dismissLastCompleted() {
    try { sessionStorage.removeItem(LAST_COMPLETED_STORAGE_KEY) } catch { /* ignore */ }
    setLastCompleted(null)
  }

  const { data: packagesData } = useQuery({
    queryKey: ['packages', 'active'],
    queryFn: () => api.get('/packages').then((r) => r.data.data),
  })
  const packages = packagesData || []

  const steps = ['بيانات المعلم', 'التخصص والسعر', 'أوقات العمل', 'الطلاب', 'المراجعة']

  const teacherSet = (k, v) => setTeacher((p) => ({ ...p, [k]: v }))

  const step1Error = useMemo(() => {
    if (!teacher.firstNameAr.trim() || !teacher.lastNameAr.trim()) return 'الاسم الأول واسم العائلة مطلوبان'
    if (!teacher.email.trim()) return 'البريد الإلكتروني مطلوب'
    if (!teacher.gender) return 'يجب تحديد تصنيف المعلم'
    return validateCredentialValue(teacher.credential)
  }, [teacher])

  const step2Error = useMemo(() => {
    if (!teacher.specializations.length) return 'يجب تحديد تخصص تدريس واحد على الأقل'
    if (teacher.hourlyRate === '' || Number(teacher.hourlyRate) < 0 || Number.isNaN(Number(teacher.hourlyRate))) {
      return 'يرجى تحديد سعر ساعة تدريس صحيح'
    }
    return null
  }, [teacher])

  const step3Error = useMemo(() => validateWorkingHoursDays(workingHours), [workingHours])

  const activeStudentError = useMemo(() => {
    if (!activeStudent.firstNameAr.trim() || !activeStudent.lastNameAr.trim()) return 'الاسم مطلوب'
    if (!activeStudent.email.trim()) return 'البريد الإلكتروني مطلوب'
    if (!activeStudent.studentType) return 'يجب تحديد نوع الطالب'
    const credErr = validateCredentialValue(activeStudent.credential)
    if (credErr) return credErr
    if (activeStudent.packageId) {
      const pkg = packages.find((p) => p._id === activeStudent.packageId)
      const preview = computeSplitPreview(pkg?.sessionsPerMonth, activeStudent.splitMode, activeStudent.splitValue)
      if (preview.error) return preview.error
    }
    return validateScheduleForSubmit(activeStudent.schedule, activeStudent.studentType)
  }, [activeStudent, packages])
  const activeStudentTouched = activeStudent.firstNameAr || activeStudent.lastNameAr || activeStudent.email

  const stepErrors = [step1Error, step2Error, step3Error, null, null]

  // ── Persist the teacher (idempotent) the moment "Next" leaves step 2 ──────
  const startSessionMutation = useMutation({
    mutationFn: (payload) => api.post('/admin/onboarding/sessions', payload).then((r) => r.data),
    onSuccess: (res) => {
      const data = res.data
      setSession(data.session)
      setPersistedTeacher(data.teacher)
      setTemporaryPasswords((p) => ({ ...p, teacher: data.temporaryPasswords?.teacher }))
      rememberForResume(data.session._id, `${data.teacher.firstNameAr} ${data.teacher.lastNameAr}`)
      setStep(3)
      if (res.message?.includes('استئناف')) toast.success(res.message)
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'تعذّر حفظ بيانات المعلم')
    },
  })

  function goNext() {
    if (step === 2) {
      if (step1Error || step2Error || step3Error) return
      startSessionMutation.mutate({
        clientRequestId: clientRequestIdRef.current,
        teacher: { ...teacher, hourlyRate: Number(teacher.hourlyRate), credential: credentialPayload(teacher.credential), password: undefined },
        workingHours: { days: workingHours },
      })
      return
    }
    setStep((s) => Math.min(steps.length - 1, s + 1))
  }

  // ── Save the active student incrementally ─────────────────────────────────
  const saveStudentMutation = useMutation({
    mutationFn: ({ payload, key }) => api.post(`/admin/onboarding/sessions/${session._id}/students`, { clientRequestId: key, student: payload }).then((r) => r.data),
    onSuccess: (res, { andReview }) => {
      const data = res.data
      setSavedStudents((prev) => [...prev, data])
      queryClient.invalidateQueries({ queryKey: ['admin', 'teacher-availability', persistedTeacher?._id] })
      setLockConflict(false)
      if (data.temporaryPassword) setTemporaryPasswords((p) => ({ ...p, [data.student.email]: data.temporaryPassword }))
      setActiveStudent(emptyStudent())
      toast.success(
        data.assignmentRequest?.requiresTeacherApproval
          ? 'تم حفظ الطالب وحجز الموعد مؤقتًا لحين موافقة المعلم.'
          : (data.assignmentRequest ? 'تم حفظ الطالب وحجز الموعد. تم تحديث المواعيد المتاحة للطالب التالي.' : 'تم حفظ الطالب.')
      )
      if (andReview) setStep(4)
    },
    onError: (err) => {
      const body = err?.response?.data
      if (body?.lockConflict) {
        setLockConflict(true)
        toast.error(body.message || 'تم حجز هذا الموعد منذ لحظات. اخترنا لك أقرب المواعيد المتاحة.')
      } else {
        toast.error(body?.message || 'تعذّر حفظ الطالب')
      }
    },
  })

  function saveStudent(andReview) {
    if (activeStudentError || saveStudentMutation.isPending) return
    saveStudentMutation.mutate({ payload: buildStudentPayload(activeStudent), key: activeStudent._saveKey, andReview })
  }

  const removeStudentMutation = useMutation({
    mutationFn: (studentId) => api.delete(`/admin/onboarding/sessions/${session._id}/students/${studentId}`, { data: { reason: 'إزالة الطالب أثناء إعداد المعلم' } }).then((r) => r.data),
    onSuccess: (_res, studentId) => {
      setSavedStudents((prev) => prev.filter((s) => s.student._id !== studentId))
      queryClient.invalidateQueries({ queryKey: ['admin', 'teacher-availability', persistedTeacher?._id] })
      toast.success('تم حذف الطالب من هذه العملية')
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'تعذّر حذف الطالب'),
  })

  // A saved student's account is genuinely deleted by this — never fire it
  // without an explicit confirmation (the button itself has no undo).
  function confirmRemoveStudent(summary, mutateOptions) {
    const name = `${summary.student.firstNameAr} ${summary.student.lastNameAr}`.trim()
    if (window.confirm(`حذف الطالب "${name}" نهائيًا من هذه العملية؟ سيتم حذف حسابه وإلغاء حجز موعده.`)) {
      removeStudentMutation.mutate(summary.student._id, mutateOptions)
    }
  }

  // "تعديل الطالب المحفوظ" — reopens the saved student's data in the active
  // form; saving again creates a fresh record (the old one is removed first),
  // so there is never a moment with two live reservations for this student.
  function editSavedStudent(summary) {
    if (removeStudentMutation.isPending) return
    removeStudentMutation.mutate(summary.student._id, {
      onSuccess: () => {
        setSavedStudents((prev) => prev.filter((s) => s.student._id !== summary.student._id))
        setActiveStudent({
          ...emptyStudent(),
          firstNameAr: summary.student.firstNameAr, lastNameAr: summary.student.lastNameAr,
          email: summary.student.email, phone: summary.student.phone || '', gender: summary.student.gender || '',
          studentType: summary.student.studentType,
        })
        toast('تمت إزالة النسخة المحفوظة — عدّل البيانات ثم احفظ الطالب مجددًا', { icon: '✏️' })
      },
    })
  }

  const sessionReviewQuery = useQuery({
    queryKey: ['onboardingSession', session?._id],
    queryFn: () => api.get(`/admin/onboarding/sessions/${session._id}`).then((r) => r.data.data),
    enabled: step === 4 && !!session?._id,
  })

  const finalizeMutation = useMutation({
    mutationFn: () => api.post(`/admin/onboarding/sessions/${session._id}/finalize`).then((r) => r.data),
    onSuccess: (res) => {
      setFinalResult(res.data)
      forgetResume()
      if (res.data?.teacher?._id) rememberLastCompleted(res.data.teacher._id, `${res.data.teacher.firstNameAr} ${res.data.teacher.lastNameAr}`)
      toast.success(res.message || 'تم إنهاء إعداد المعلم بنجاح')
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'تعذّر إنهاء العملية'),
  })

  const cancelSessionMutation = useMutation({
    mutationFn: (reason) => api.post(`/admin/onboarding/sessions/${session._id}/cancel`, { reason }).then((r) => r.data),
    onSuccess: () => {
      forgetResume()
      toast.success('تم إلغاء عملية الإعداد وحذف كل ما تم حفظه فيها')
      resetWizard()
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'تعذّر إلغاء العملية'),
  })

  async function resumeSession() {
    if (!resumeCandidate?.sessionId) return
    try {
      const res = await api.get(`/admin/onboarding/sessions/${resumeCandidate.sessionId}`).then((r) => r.data)
      const data = res.data
      if (data.session.status === 'completed' || data.session.status === 'cancelled') {
        forgetResume()
        return
      }
      setSession(data.session)
      setPersistedTeacher(data.teacher)
      setSavedStudents(data.students)
      if (data.workingHours?.days) setWorkingHours(data.workingHours.days)
      setStep(3)
      toast.success('تم استئناف عملية الإعداد السابقة')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'تعذّر استئناف العملية — ابدأ عملية جديدة')
      forgetResume()
    }
  }

  function resetWizard() {
    setTeacher(emptyTeacher())
    setWorkingHours(buildDefaultWorkingHours())
    setSession(null)
    setPersistedTeacher(null)
    setSavedStudents([])
    setActiveStudent(emptyStudent())
    setTemporaryPasswords({})
    setFinalResult(null)
    setStep(0)
    clientRequestIdRef.current = newClientRequestId()
    queryClient.removeQueries({ queryKey: ['onboardingSession'] })
  }

  function copy(text) {
    navigator.clipboard?.writeText(text)
    toast.success('تم النسخ')
  }

  if (finalResult) {
    return (
      <div dir="rtl" className="max-w-2xl mx-auto space-y-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 size={26} />
          </div>
          <h1 className="font-heading font-extrabold text-xl text-gray-900">تم إنشاء المعلم بنجاح</h1>
          <p className="text-sm text-gray-500 mt-1">{finalResult.students?.length || 0} طالب تم إنشاؤهم وربطهم بالمعلم</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><User size={16} className="text-violet-600" /> المعلم</h2>
          <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3 text-sm">
            <span className="text-gray-700">{finalResult.teacher?.email}</span>
            {temporaryPasswords.teacher && (
              <button onClick={() => copy(temporaryPasswords.teacher)} className="flex items-center gap-1 text-violet-600 font-bold text-xs">
                <Copy size={12} /> {temporaryPasswords.teacher}
              </button>
            )}
          </div>
        </div>

        {finalResult.students?.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><GraduationCap size={16} className="text-violet-600" /> الطلاب</h2>
            <div className="space-y-2">
              {finalResult.students.map((s, i) => (
                <div key={i} className="rounded-xl bg-gray-50 p-3 text-sm space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">{s.student?.email}</span>
                    {temporaryPasswords[s.student?.email] && (
                      <button onClick={() => copy(temporaryPasswords[s.student.email])} className="flex items-center gap-1 text-violet-600 font-bold text-xs">
                        <Copy size={12} /> {temporaryPasswords[s.student.email]}
                      </button>
                    )}
                  </div>
                  {s.assignmentRequest && (
                    <div className="text-[11px] font-bold" style={{ color: ASSIGNMENT_STATUS_LABELS[s.assignmentRequest.status]?.color }}>
                      {s.assignmentRequest.requiresTeacherApproval
                        ? 'بانتظار موافقة المعلم على الجدول'
                        : ASSIGNMENT_STATUS_LABELS[s.assignmentRequest.status]?.label}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {finalResult.teacher?._id && (
          <p className="text-sm text-gray-600 text-center px-1">
            يمكنك الآن إضافة طلاب آخرين إلى أ. {finalResult.teacher.firstNameAr} {finalResult.teacher.lastNameAr} دون إعادة إدخال بيانات المعلم.
          </p>
        )}

        <div className="flex flex-col gap-2.5">
          {/* Primary — the strongest action, continues the current workflow */}
          <Link
            to={buildTeacherAddStudentUrl(finalResult.teacher?._id)}
            className="h-12 rounded-xl bg-violet-600 text-white font-bold text-sm hover:bg-violet-700 transition-colors flex items-center justify-center gap-2 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700"
          >
            <UserPlus size={17} /> إضافة المزيد من الطلاب لهذا المعلم
          </Link>

          {/* Secondary actions — visually subordinate to the primary above */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <Link
              to={finalResult.teacher?._id ? `/admin/teachers/${finalResult.teacher._id}` : ROUTES.ADMIN_TEACHERS}
              className="flex-1 h-11 rounded-xl bg-violet-50 text-violet-700 font-bold text-sm hover:bg-violet-100 transition-colors flex items-center justify-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
            >
              <User size={15} /> عرض ملف المعلم
            </Link>
            <Link
              to={ROUTES.ADMIN_TEACHERS}
              className="flex-1 h-11 rounded-xl bg-white border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
            >
              <Users size={15} /> الذهاب إلى قائمة المعلمين
            </Link>
          </div>

          {/* Tertiary — kept available, no longer competing visually */}
          <button
            type="button" onClick={resetWizard}
            className="h-9 rounded-xl text-gray-400 font-semibold text-xs hover:text-gray-600 hover:underline transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
          >
            إنشاء معلم آخر
          </button>
        </div>
      </div>
    )
  }

  const reviewData = sessionReviewQuery.data

  return (
    <div dir="rtl" className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-gray-900">إضافة معلم وطلابه</h1>
          <p className="text-sm text-gray-500 mt-0.5">إنشاء حساب المعلم وربط طلابه في تدفق واحد — يُحفظ كل طالب فور اعتماده</p>
        </div>
        {session && (
          <button type="button" onClick={() => setCancelReasonOpen((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors flex-none">
            <XCircle size={13} /> إلغاء العملية بالكامل
          </button>
        )}
      </div>

      {resumeCandidate && !session && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-amber-800">
            <History size={16} className="flex-none" />
            <span>لديك عملية إعداد سابقة لم تكتمل ({resumeCandidate.teacherName}) — هل تريد استئنافها؟</span>
          </div>
          <div className="flex items-center gap-2 flex-none">
            <button onClick={resumeSession} className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition-colors">استئناف</button>
            <button onClick={forgetResume} className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-amber-700 text-xs font-bold hover:bg-amber-100 transition-colors">تجاهل</button>
          </div>
        </div>
      )}

      {lastCompleted && !session && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-emerald-800">
            <CheckCircle2 size={16} className="flex-none" />
            <span>تم إنشاء المعلم {lastCompleted.teacherName} مسبقًا في هذه الجلسة — يمكنك متابعة إضافة طلاب له من ملفه الإداري.</span>
          </div>
          <div className="flex items-center gap-2 flex-none">
            <Link to={buildTeacherAddStudentUrl(lastCompleted.teacherId)} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors">
              فتح ملف المعلم
            </Link>
            <button type="button" onClick={dismissLastCompleted} aria-label="إغلاق" className="text-emerald-600 hover:bg-emerald-100 rounded-lg p-1.5 transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {cancelReasonOpen && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 space-y-2.5">
          <label className="text-xs font-bold text-red-700">سبب إلغاء العملية بالكامل (سيتم حذف المعلم وكل الطلاب المحفوظين في هذه العملية)</label>
          <textarea className="w-full rounded-xl border border-red-200 p-2.5 text-sm outline-none focus:ring-2 focus:ring-red-200" rows={2}
            value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
          <div className="flex justify-end gap-2">
            <button onClick={() => setCancelReasonOpen(false)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-100">تراجع</button>
            <button
              onClick={() => cancelReason.trim() && cancelSessionMutation.mutate(cancelReason.trim())}
              disabled={!cancelReason.trim() || cancelSessionMutation.isPending}
              className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 disabled:opacity-50"
            >
              {cancelSessionMutation.isPending ? 'جارٍ الإلغاء…' : 'تأكيد الإلغاء'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <StepHeader steps={steps} current={step} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        {step === 0 && (
          <div className="space-y-4">
            <GenderSegmentedControl value={teacher.gender} onChange={(v) => teacherSet('gender', v)} required />
            <div className="grid grid-cols-2 gap-4">
              <Input label="الاسم الأول" variant="light" value={teacher.firstNameAr} onChange={(e) => teacherSet('firstNameAr', e.target.value)} />
              <Input label="اسم العائلة" variant="light" value={teacher.lastNameAr} onChange={(e) => teacherSet('lastNameAr', e.target.value)} />
            </div>
            <Input label="البريد الإلكتروني" type="email" variant="light" value={teacher.email} onChange={(e) => teacherSet('email', e.target.value)} />
            <Input label="رقم الهاتف" variant="light" value={teacher.phone} onChange={(e) => teacherSet('phone', e.target.value)} />
            <div className="pt-1 border-t border-gray-100">
              <PasswordCredentialSection value={teacher.credential} onChange={(v) => teacherSet('credential', v)} />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <SpecializationsMultiSelect value={teacher.specializations} onChange={(v) => teacherSet('specializations', v)} required />
            <AudienceCategoriesMultiSelect value={teacher.audienceCategories} onChange={(v) => teacherSet('audienceCategories', v)} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="سعر ساعة التدريس" type="number" min="0" step="0.5" variant="light" value={teacher.hourlyRate} onChange={(e) => teacherSet('hourlyRate', e.target.value)} />
            </div>
            <ShiftsMultiSelect value={teacher.availableShifts} onChange={(v) => teacherSet('availableShifts', v)} />
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="text-xs text-gray-400 mb-4">
              حدد الأوقات المتاحة للمعلم في كل يوم — يمكن تعديلها لاحقًا من ملف المعلم، وتُستخدم لحساب المواعيد الشاغرة عند جدولة الطلاب في الخطوة التالية.
              بعد الانتقال للخطوة التالية سيتم حفظ حساب المعلم فورًا في النظام.
            </p>
            <WorkingHoursEditor value={workingHours} onChange={setWorkingHours} />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            {persistedTeacher && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-bold text-emerald-700 flex items-center gap-2">
                <CheckCircle2 size={14} /> تم حفظ المعلم: {persistedTeacher.firstNameAr} {persistedTeacher.lastNameAr} ({persistedTeacher.email})
              </div>
            )}

            {savedStudents.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-gray-400">الطلاب المحفوظون ({savedStudents.length})</div>
                {savedStudents.map((summary) => (
                  <SavedStudentCard
                    key={summary.student._id} summary={summary}
                    onEdit={() => editSavedStudent(summary)}
                    onRemove={() => confirmRemoveStudent(summary)}
                    removing={removeStudentMutation.isPending && removeStudentMutation.variables === summary.student._id}
                  />
                ))}
              </div>
            )}

            <ActiveStudentCard
              student={activeStudent} packages={packages} teacherId={session?.teacherId || persistedTeacher?._id}
              overrideAllowed={overrideAllowed} onChange={setActiveStudent}
              onDiscard={() => { setActiveStudent(emptyStudent()); setLockConflict(false) }}
              saving={saveStudentMutation.isPending} lockConflict={lockConflict}
            />
            {activeStudentTouched && activeStudentError && (
              <p className="text-xs text-amber-600 font-semibold flex items-center gap-1.5"><AlertCircle size={13} /> {activeStudentError}</p>
            )}

            <div className="flex flex-wrap gap-2.5 pt-1">
              <button type="button" onClick={() => saveStudent(false)}
                disabled={!!activeStudentError || saveStudentMutation.isPending}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 transition-colors disabled:opacity-50">
                {saveStudentMutation.isPending && <Spinner size="sm" color="border-white" />}
                <Plus size={15} /> حفظ الطالب وإضافة طالب آخر
              </button>
              <button type="button" onClick={() => saveStudent(true)}
                disabled={!!activeStudentError || saveStudentMutation.isPending}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors disabled:opacity-50">
                حفظ الطالب والمتابعة للمراجعة
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="font-bold text-gray-900">مراجعة نهائية</h2>
            {sessionReviewQuery.isLoading ? (
              <div className="py-8 flex justify-center"><Spinner /></div>
            ) : !reviewData ? (
              <p className="text-sm text-red-500">تعذّر تحميل بيانات المراجعة من الخادم</p>
            ) : (
              <>
                <div className="rounded-xl bg-gray-50 p-4 text-sm space-y-1">
                  <div className="font-bold text-gray-800">{reviewData.teacher.firstNameAr} {reviewData.teacher.lastNameAr}</div>
                  <div className="text-gray-500">{reviewData.teacher.email} {reviewData.teacher.phone && `— ${reviewData.teacher.phone}`}</div>
                  <div className="text-gray-500">سعر الساعة: {formatCurrency(Number(reviewData.teacher.hourlyRate) || 0, 'EGP')}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-400 mb-2">الطلاب المحفوظون فعليًا في النظام ({reviewData.students.length})</div>
                  {!reviewData.students.length ? (
                    <p className="text-sm text-gray-400">لم يتم حفظ أي طالب بعد — يمكن إضافتهم لاحقًا من ملف المعلم.</p>
                  ) : (
                    <div className="space-y-2">
                      {reviewData.students.map((summary) => (
                        <SavedStudentCard key={summary.student._id} summary={summary} onEdit={() => { setStep(3); editSavedStudent(summary) }}
                          onRemove={() => confirmRemoveStudent(summary, { onSuccess: () => sessionReviewQuery.refetch() })}
                          removing={removeStudentMutation.isPending && removeStudentMutation.variables === summary.student._id} />
                      ))}
                    </div>
                  )}
                </div>
                {reviewData.students.some((s) => ['rejected', 'time_change_requested'].includes(s.assignmentRequest?.status)) && (
                  <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600 font-semibold flex items-center gap-2">
                    <AlertCircle size={14} /> يوجد طلاب بحالة جدول تحتاج معالجة (رفض/اقتراح موعد آخر) — يجب حلها من صفحة طلبات الإسناد قبل إنهاء العملية
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {stepErrors[step] && step < 3 && (
          <p className="text-xs text-amber-600 font-semibold mt-3 flex items-center gap-1.5">
            <AlertCircle size={13} /> {stepErrors[step]}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || step === 3}
          title={step === 3 ? 'تم حفظ بيانات المعلم بالفعل — لا يمكن الرجوع لتعديلها من هنا' : undefined}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40"
        >
          <ChevronRight size={16} /> السابق
        </button>
        {step < 3 ? (
          <button
            onClick={goNext}
            disabled={!!stepErrors[step] || startSessionMutation.isPending}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 transition-colors disabled:opacity-50"
          >
            {startSessionMutation.isPending && <Spinner size="sm" color="border-white" />}
            التالي <ChevronLeft size={16} />
          </button>
        ) : step === 3 ? (
          <button
            onClick={() => setStep(4)}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 transition-colors disabled:opacity-50"
          >
            المراجعة النهائية <ChevronLeft size={16} />
          </button>
        ) : (
          <button
            onClick={() => finalizeMutation.mutate()}
            disabled={finalizeMutation.isPending || sessionReviewQuery.isLoading || !reviewData || reviewData.students.some((s) => ['rejected', 'time_change_requested'].includes(s.assignmentRequest?.status))}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 transition-colors disabled:opacity-50"
          >
            {finalizeMutation.isPending && <Spinner size="sm" color="border-white" />}
            تأكيد الإنشاء
          </button>
        )}
      </div>
    </div>
  )
}
