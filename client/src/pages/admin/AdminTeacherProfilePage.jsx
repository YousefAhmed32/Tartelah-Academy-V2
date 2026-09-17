import { useState, useEffect, useMemo } from 'react'
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import {
  ArrowRight, Mail, Phone, Wallet, GraduationCap, Users, Calendar, Plus, Clock,
  User, KeyRound, CalendarClock, Lock, History, ClipboardCheck, TrendingUp,
  Settings, LayoutGrid, FileText, Power, PowerOff, MessageCircle, StickyNote,
  Video, RefreshCw, ExternalLink, Gift, RotateCcw, SlidersHorizontal, Trash2, AlertTriangle,
  Copy, CheckCircle2,
} from 'lucide-react'
import api from '../../utils/api.js'
import Avatar from '../../components/ui/Avatar.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Button from '../../components/ui/Button.jsx'
import Badge from '../../components/ui/Badge.jsx'
import BulkSyncLinksModal from '../../components/teacher/BulkSyncLinksModal.jsx'
import TeacherAdjustmentModal from '../../components/admin/TeacherAdjustmentModal.jsx'
import TeacherSessionsTab from '../../components/admin/TeacherSessionsTab.jsx'
import ErrorState from '../../components/shared/ErrorState.jsx'
import ConfirmDialog from '../../components/shared/ConfirmDialog.jsx'
import WorkingHoursEditor from '../../components/ui/WorkingHoursEditor.jsx'
import GenderSegmentedControl from '../../components/ui/GenderSegmentedControl.jsx'
import SpecializationsMultiSelect from '../../components/ui/SpecializationsMultiSelect.jsx'
import AudienceCategoriesMultiSelect from '../../components/ui/AudienceCategoriesMultiSelect.jsx'
import ShiftsMultiSelect from '../../components/ui/ShiftsMultiSelect.jsx'
import PasswordCredentialSection, { emptyCredential, validateCredentialValue, credentialPayload } from '../../components/ui/PasswordCredentialSection.jsx'
import StudentScheduleSection, { emptySchedule } from '../../components/ui/StudentScheduleSection.jsx'
import { formatDateAr, formatTimeAr } from '../../utils/date.js'
import { formatCurrency } from '../../utils/format.js'
import { exportReportToPDF } from '../../utils/exportUtils.js'
import { getFileUrl, ROUTES } from '../../config/constants.js'
import { resolveTeacherIdentity } from '../../utils/teacherIdentity.js'
import { subjectLabel, teacherShiftsLabel } from '../../utils/teacherProfile.js'
import { useTeachingSubjects } from '../../hooks/useTeachingSubjects.js'
import { payrollService } from '../../services/payroll.service.js'
import { audienceCategoriesLabel } from '../../utils/studentAudience.js'
import { buildDefaultWorkingHours, summarizeWorkingHoursDays } from '../../utils/workingHours.js'
import { useAuthStore } from '../../store/authStore.js'
import { deriveScheduleDays, validateScheduleForSubmit } from '../../utils/assignmentSchedule.js'

const inputCls = 'w-full h-10 bg-gray-50 border border-gray-200 rounded-xl px-3.5 text-sm text-gray-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all'
const labelCls = 'text-xs font-bold text-gray-500 mb-1 block'

function InfoRow({ label, value, icon }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-none text-gray-500">{icon}</div>
      <div className="min-w-0">
        <div className="text-xs text-gray-500 mb-0.5">{label}</div>
        <div className="text-sm font-semibold text-gray-800 break-words">{value}</div>
      </div>
    </div>
  )
}

// ── Tabs (deep-linkable via ?tab=) ────────────────────────────────────────────

const TABS = [
  { key: 'overview',    label: 'نظرة عامة',    Icon: LayoutGrid },
  { key: 'sessions',    label: 'الحصص والجدول', Icon: CalendarClock },
  { key: 'students',    label: 'الطلاب',        Icon: Users },
  { key: 'performance', label: 'الأداء',        Icon: TrendingUp },
  { key: 'payroll',     label: 'الرواتب',       Icon: Wallet, permission: 'payroll.view' },
  { key: 'account',     label: 'الحساب',        Icon: Settings },
]

// ── Add Student (unchanged from the previous full-profile page) ──────────────

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
  const [createdResult, setCreatedResult] = useState(null)
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  const { data: packages } = useQuery({
    queryKey: ['packages', 'active'],
    queryFn: () => api.get('/packages').then((r) => r.data.data),
    enabled: open,
  })

  function handleClose() {
    onClose()
    setForm(emptyAddStudentForm())
    setCreatedResult(null)
    setTab('info')
  }

  function copyToClipboard(text) {
    navigator.clipboard?.writeText(text)
    toast.success('تم النسخ إلى الحافظة')
  }

  const mut = useMutation({
    mutationFn: (payload) => api.post(`/admin/teachers/${teacherId}/students`, payload).then((r) => r.data),
    onSuccess: (res) => {
      toast.success(res.data.assignmentRequest?.requiresTeacherApproval ? 'تمت إضافة الطالب — بانتظار موافقة المعلم على الجدول' : 'تمت إضافة الطالب بنجاح')
      qc.invalidateQueries({ queryKey: ['admin', 'teacher-profile', teacherId] })
      qc.invalidateQueries({ queryKey: ['admin', 'teacher-availability', teacherId] })
      const tempPass = res.data?.temporaryPassword || res.temporaryPassword
      const initialPass = tempPass || (form.credential?.mode === 'manual' ? form.credential.password : 'كلمة المرور الموحدة للأكاديمية')
      setCreatedResult({
        email: form.email,
        password: initialPass,
        isDefault: form.credential?.mode === 'academy_default',
        isManual: form.credential?.mode === 'manual',
        isAuto: !!tempPass,
        name: `${form.firstNameAr} ${form.lastNameAr}`,
      })
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

  if (createdResult) {
    return (
      <Modal
        open={open}
        onClose={handleClose}
        title="تم إضافة الطالب بنجاح"
        size="sm"
        footer={<Button variant="purple" onClick={handleClose}>تم، إغلاق النافذة</Button>}
      >
        <div dir="rtl" className="space-y-4 text-center py-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <h4 className="font-heading font-extrabold text-gray-900 text-base">{createdResult.name}</h4>
            <div className="flex items-center justify-center gap-1.5 mt-1 text-xs text-gray-600">
              <span className="font-mono font-medium">{createdResult.email}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(createdResult.email)}
                className="text-violet-600 hover:text-violet-700 p-0.5"
                title="نسخ البريد الإلكتروني"
              >
                <Copy size={13} />
              </button>
            </div>
          </div>
          <div className="bg-violet-50/80 border border-violet-100 rounded-xl p-3 text-right space-y-1.5">
            <div className="text-xs text-violet-700 font-bold">
              {createdResult.isAuto ? 'كلمة المرور المؤقتة المُولّدة:' : createdResult.isManual ? 'كلمة المرور المحددة للحساب:' : 'كلمة مرور تسجيل الدخول:'}
            </div>
            <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-violet-200">
              <span className="font-mono text-sm font-bold text-gray-900 select-all">{createdResult.password}</span>
              {!createdResult.isDefault && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(createdResult.password)}
                  className="flex items-center gap-1 text-xs text-violet-600 font-bold hover:underline"
                >
                  <Copy size={13} /> نسخ
                </button>
              )}
            </div>
            <p className="text-[11px] text-gray-500">
              {createdResult.isDefault
                ? 'الحساب جاهز لتسجيل الدخول بكلمة مرور الأكاديمية الموحدة.'
                : 'انسخ بيانات الدخول لتسجيل الدخول بها أو تزويد الطالب بها.'}
            </p>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open={open} onClose={handleClose} title="إضافة طالب جديد" size="md"
      footer={<>
        <Button variant="ghost" onClick={handleClose}>إلغاء</Button>
        <Button variant="purple" onClick={submit} loading={mut.isPending}>إضافة الطالب</Button>
      </>}>
      <div className="space-y-3">
        {teacherContext && (
          <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3 flex items-start gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-none text-gray-500">
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${tab === t.key ? 'bg-violet-50 text-violet-700' : 'text-gray-500 hover:text-gray-600'}`}>
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
                {form.splitMode !== 'none' && form.splitValue !== '' && (
                  <div className="rounded-lg bg-violet-50/90 border border-violet-200 p-2 text-xs text-violet-950 font-bold flex items-center justify-between gap-2">
                    <span>
                      {form.splitMode === 'used'
                        ? `أول حصة للطالب على المنصة: رقم (${Number(form.splitValue) + 1} من ${pkg.sessionsPerMonth})`
                        : `أول حصة للطالب على المنصة: رقم (${Math.max(1, pkg.sessionsPerMonth - Number(form.splitValue) + 1)} من ${pkg.sessionsPerMonth})`}
                    </span>
                    <span className="text-[11px] bg-violet-200/70 text-violet-800 px-2 py-0.5 rounded font-bold shrink-0">
                      {form.splitMode === 'used'
                        ? `${Math.max(0, pkg.sessionsPerMonth - Number(form.splitValue))} حصص متبقية`
                        : `${form.splitValue} حصص متبقية`}
                    </span>
                  </div>
                )}
                <div><label htmlFor="addstudent-startDate" className={labelCls}>تاريخ بداية الاشتراك</label><input id="addstudent-startDate" type="date" className={inputCls} value={form.startDate} onChange={(e) => set('startDate', e.target.value)} /></div>
              </div>
            )}
          </div>
        )}

        <div className={tab === 'credential' ? '' : 'hidden'}>
          <PasswordCredentialSection value={form.credential} onChange={(v) => set('credential', v)} role="student" compact />
        </div>

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

// ── Overview tab ───────────────────────────────────────────────────────────

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
            <button onClick={() => setEditing(false)} className="flex-1 h-9 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold">إلغاء</button>
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

function OverviewTab({ teacher, workingHours, scheduleRules, subjects, id, onSyncLinks }) {
  const specializations = teacher.specializations?.length ? teacher.specializations : (teacher.category ? [teacher.category] : [])
  const weeklySessionCount = (scheduleRules || []).reduce((sum, r) => sum + (r.daysOfWeek?.length || (r.frequency === 'daily' ? 7 : 1)), 0)
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="space-y-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-900 mb-1">معلومات التواصل والمهنة</h3>
          <InfoRow label="البريد الإلكتروني" value={teacher.email} icon={<Mail size={14} />} />
          <InfoRow label="رقم الهاتف" value={teacher.phone} icon={<Phone size={14} />} />
          <InfoRow label="تخصصات التدريس" value={specializations.map((s) => subjectLabel(subjects, s)).filter(Boolean).join('، ') || null} icon={<GraduationCap size={14} />} />
          <InfoRow label="الفئات المستهدفة" value={audienceCategoriesLabel(teacher.audienceCategories)} icon={<Users size={14} />} />
          <InfoRow label="سعر ساعة التدريس" value={teacher.hourlyRate ? formatCurrency(teacher.hourlyRate, 'EGP') : null} icon={<Wallet size={14} />} />
          <InfoRow label="أوقات الشيفت المتاحة" value={teacherShiftsLabel(teacher.availableShifts)} icon={<Calendar size={14} />} />
          <InfoRow label="نبذة" value={teacher.bioAr} icon={<FileText size={14} />} />
          <InfoRow label="تاريخ الانضمام" value={formatDateAr(teacher.createdAt)} icon={<Calendar size={14} />} />
          <InfoRow label="عبء العمل الأسبوعي" value={weeklySessionCount ? `${weeklySessionCount} حصة/أسبوع عبر ${scheduleRules?.length || 0} جدول دوري نشط` : null} icon={<TrendingUp size={14} />} />
          {teacher.notes && <InfoRow label="ملاحظات إدارية" value={teacher.notes} icon={<StickyNote size={14} />} />}
        </div>

        {/* Meeting Links & Sync Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Video size={16} className="text-violet-600" />
              الرابط العمومي وفصول الاجتماعات
            </h3>
            <button
              type="button"
              onClick={onSyncLinks}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors flex items-center gap-1.5"
            >
              <RefreshCw size={13} />
              تعميم / تحديث الرابط على الكل
            </button>
          </div>
          {teacher.meetingLinks?.length > 0 ? (
            <div className="space-y-2.5">
              {teacher.meetingLinks.map((ml, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between gap-3 p-3 rounded-xl border text-xs transition-all ${
                    idx === 0
                      ? 'bg-violet-50/50 border-violet-200 ring-1 ring-violet-100'
                      : 'bg-gray-50 border-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-wrap sm:flex-nowrap">
                    <span className={`w-2 h-2 rounded-full flex-none ${idx === 0 ? 'bg-violet-600' : 'bg-emerald-500'}`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-800">
                          {ml.label || ml.title || (ml.provider === 'meet' ? 'Google Meet' : 'Zoom')}
                        </span>
                        {idx === 0 && (
                          <span className="text-[10px] font-bold text-violet-700 bg-violet-100 px-2 py-0.5 rounded-md">
                            الرابط العمومي المعتمد
                          </span>
                        )}
                      </div>
                      <a
                        href={ml.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-violet-600 hover:text-violet-800 truncate block max-w-[280px] font-mono mt-0.5"
                        dir="ltr"
                      >
                        {ml.link}
                      </a>
                    </div>
                  </div>
                  <a
                    href={ml.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-gray-600 p-1 flex-none"
                    title="فتح الرابط"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-100 text-xs text-amber-800 flex items-center justify-between gap-3">
              <span>لم يتم تعيين رابط عمومي بعد. يمكنك تعيين رابط وتعميمه على كافة الحصص بضغطة واحدة.</span>
              <button
                type="button"
                onClick={onSyncLinks}
                className="text-[11px] font-bold text-violet-700 bg-white px-2.5 py-1 rounded-lg border border-violet-200 hover:bg-violet-50 flex-none shadow-xs"
              >
                تعيين الآن
              </button>
            </div>
          )}
        </div>
      </div>
      <WorkingHoursCard teacherId={id} initialDays={workingHours?.days} />
    </div>
  )
}

// ── Students tab ───────────────────────────────────────────────────────────

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

function StudentsTab({ teacherId, students, onAddStudent, onSyncLinks }) {
  return (
    <div className="space-y-5">
      <PendingRequestsCard teacherId={teacherId} />
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2"><Users size={16} className="text-violet-600" /> الطلاب المسندون ({students?.length || 0})</h3>
          <div className="flex items-center gap-2">
            <button onClick={onSyncLinks}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors">
              <RefreshCw size={14} /> تعميم / تحديث الرابط
            </button>
            <button onClick={onAddStudent}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 transition-colors shadow-sm">
              <Plus size={14} /> إضافة طالب
            </button>
          </div>
        </div>

        {!students?.length ? (
          <div className="py-12 text-center text-gray-500">
            <Users size={28} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm font-semibold">لا يوجد طلاب مسندون لهذا المعلم بعد</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {students.map((s) => (
              <Link
                key={s.subscriptionId || `schedule-${s.student?._id}`}
                to={s.student?._id ? ROUTES.ADMIN_STUDENT_DETAIL.replace(':id', s.student._id) : '#'}
                className="rounded-xl border border-gray-100 p-3.5 flex items-center justify-between gap-3 hover:border-violet-300 hover:bg-violet-50/30 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar src={getFileUrl(s.student?.avatar)} firstName={s.student?.firstNameAr} lastName={s.student?.lastNameAr} size="sm" />
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 text-sm truncate">{s.student?.firstNameAr} {s.student?.lastNameAr}</div>
                    <div className="text-xs text-gray-500 truncate">{s.status === 'schedule_only' ? 'جدول بدون اشتراك بعد' : (s.package?.nameAr || 'بدون باقة')}</div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-none">
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
    </div>
  )
}

// ── Performance tab (absorbed from the old teacher-list drawer) ────────────

const SESSION_STATUS_LABELS_AR = {
  scheduled: { label: 'قادمة', color: '#0891b2' },
  ongoing: { label: 'جارية', color: '#7c3aed' },
  completed: { label: 'مكتملة', color: '#059669' },
  cancelled: { label: 'ملغاة', color: '#6b7280' },
  rescheduled: { label: 'أُجّلت', color: '#d97706' },
  missed: { label: 'فائتة', color: '#dc2626' },
  no_show: { label: 'غياب', color: '#dc2626' },
}

function getPeriodRange(preset) {
  const now = new Date()
  if (preset === 'week') {
    const from = new Date(now); from.setDate(now.getDate() - now.getDay()); from.setHours(0, 0, 0, 0)
    return { from: from.toISOString(), to: now.toISOString(), label: 'هذا الأسبوع' }
  }
  if (preset === 'quarter') {
    const from = new Date(now); from.setMonth(now.getMonth() - 3)
    return { from: from.toISOString(), to: now.toISOString(), label: 'آخر 3 أشهر' }
  }
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
  return { from: from.toISOString(), to: now.toISOString(), label: 'هذا الشهر' }
}

const CORRECTION_OPTIONS = [
  { value: 'on_time', label: 'في الموعد' },
  { value: 'late', label: 'متأخر' },
  { value: 'absent', label: 'غائب' },
  { value: 'excused', label: 'معذور' },
]

function AttendanceCorrectionMenu({ session }) {
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()
  const mut = useMutation({
    mutationFn: (status) => api.patch(`/teacher-performance/admin/session/${session._id}/attendance`, { status }),
    onSuccess: () => {
      toast.success('تم تحديث الحضور')
      qc.invalidateQueries({ queryKey: ['admin', 'teacher-performance'] })
      setOpen(false)
    },
    onError: () => toast.error('حدث خطأ'),
  })
  return (
    <div className="relative">
      <button onClick={() => setOpen((p) => !p)} className="text-[10px] font-semibold text-violet-600 hover:text-violet-800 transition-colors">
        تصحيح
      </button>
      {open && (
        <div className="absolute left-0 top-6 z-10 bg-white rounded-xl shadow-lg border border-gray-100 py-1 w-32">
          {CORRECTION_OPTIONS.map((o) => (
            <button key={o.value} onClick={() => mut.mutate(o.value)} disabled={mut.isPending}
              className="w-full text-right px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function PerformanceTab({ teacherId, recentSessions }) {
  const [period, setPeriod] = useState('month')
  const periodRange = useMemo(() => getPeriodRange(period), [period])

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['admin', 'teacher-performance', 'summary', teacherId, periodRange.from, periodRange.to],
    queryFn: () => api.get(`/teacher-performance/admin/${teacherId}/summary`, { params: { from: periodRange.from, to: periodRange.to } }).then((r) => r.data.data),
  })
  const { data: trend } = useQuery({
    queryKey: ['admin', 'teacher-performance', 'trend', teacherId],
    queryFn: () => api.get(`/teacher-performance/admin/${teacherId}/trend`, { params: { range: 'weekly' } }).then((r) => r.data.data),
  })
  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['admin', 'teacher-performance', 'attendance', teacherId, periodRange.from, periodRange.to],
    queryFn: () => api.get(`/teacher-performance/admin/${teacherId}/attendance`, { params: { from: periodRange.from, to: periodRange.to, limit: 10 } }).then((r) => r.data.data),
  })

  async function handleExport() {
    if (!summary?.salary) return toast.error('لا توجد بيانات')
    await exportReportToPDF({
      title: 'تقرير أداء المعلم',
      subtitle: `${summary.salary.teacherName} — الفترة: ${periodRange.label}`,
      meta: `تم إنشاء التقرير في ${formatDateAr(new Date())}`,
      columns: [{ key: 'label', label: 'البند' }, { key: 'value', label: 'القيمة' }],
      rows: [
        { label: 'إجمالي الحصص', value: summary.attendance.totalSessions },
        { label: 'نسبة الالتزام بالمواعيد', value: `${summary.attendance.punctualityRate}%` },
        { label: 'نسبة الإكمال', value: `${summary.attendance.completionRate}%` },
        { label: 'حصص مستحقة الدفع', value: summary.salary.payableSessions },
        { label: 'غياب بدون أجر', value: summary.salary.unpaidAbsences },
        { label: 'سعر الحصة', value: formatCurrency(summary.salary.salaryPerSession, 'EGP') },
      ],
      summary: `الإجمالي المستحق: ${formatCurrency(summary.salary.totalAmount, 'EGP')}`,
      filename: 'تقرير-أداء-المعلم',
    })
    toast.success('تم إنشاء ملف PDF')
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex gap-1 p-0.5 bg-gray-100 rounded-lg">
            {[['week', 'أسبوع'], ['month', 'شهر'], ['quarter', '3 أشهر']].map(([k, l]) => (
              <button key={k} onClick={() => setPeriod(k)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${period === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}>
                {l}
              </button>
            ))}
          </div>
          <button onClick={handleExport} className="flex items-center gap-1.5 text-xs font-bold text-violet-600 hover:text-violet-800 transition-colors">
            <FileText size={13} /> تصدير PDF
          </button>
        </div>

        {summaryLoading ? <div className="flex justify-center py-10"><Spinner color="border-violet-600" /></div> : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col items-center p-4 rounded-xl bg-emerald-50">
                <div className="font-heading font-extrabold text-2xl text-emerald-700">{summary?.attendance?.punctualityRate ?? 0}%</div>
                <div className="text-xs text-emerald-600 mt-0.5">الالتزام بالموعد</div>
              </div>
              <div className="flex flex-col items-center p-4 rounded-xl bg-violet-50">
                <div className="font-heading font-extrabold text-2xl text-violet-700">{summary?.attendance?.completionRate ?? 0}%</div>
                <div className="text-xs text-violet-600 mt-0.5">نسبة الإكمال</div>
              </div>
              <div className="flex flex-col items-center p-4 rounded-xl bg-blue-50 min-w-0 w-full">
                <div className="font-heading font-extrabold text-lg text-blue-700 whitespace-nowrap" dir="ltr">{formatCurrency(summary?.salary?.totalAmount || 0, 'EGP')}</div>
                <div className="text-xs text-blue-600 mt-0.5">الراتب المستحق (الفترة)</div>
              </div>
            </div>

            {trend?.length > 0 && (
              <div className="mt-5">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">اتجاه الحضور (أسبوعي)</h4>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={trend} barSize={14}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f0fc" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip />
                    <Bar dataKey="onTime" name="في الموعد" stackId="a" fill="#22c55e" />
                    <Bar dataKey="late" name="متأخر" stackId="a" fill="#f59e0b" />
                    <Bar dataKey="absent" name="غياب" stackId="a" fill="#ef4444" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h4 className="text-sm font-bold text-gray-800 mb-3">سجل الحضور (الفترة المحددة)</h4>
          {historyLoading ? <Spinner size="sm" color="border-violet-600" /> : !history?.sessions?.length ? (
            <p className="text-xs text-gray-500 py-3">لا توجد سجلات لهذه الفترة</p>
          ) : (
            <div className="space-y-1.5">
              {history.sessions.map((s) => (
                <div key={s._id} className="flex items-center justify-between gap-2 py-2 border-b border-gray-50 last:border-0">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-gray-700 truncate">{s.studentId?.firstNameAr} {s.studentId?.lastNameAr}</div>
                    <div className="text-[10px] text-gray-500">{formatDateAr(s.scheduledAt)} • {formatTimeAr(s.scheduledAt)}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-none">
                    <Badge variant={s.teacherAttendanceStatus === 'on_time' ? 'success' : s.teacherAttendanceStatus === 'late' ? 'warning' : s.teacherAttendanceStatus === 'absent' ? 'danger' : 'gray'}>
                      {{ on_time: 'في الموعد', late: 'متأخر', absent: 'غائب', excused: 'معذور' }[s.teacherAttendanceStatus] || s.teacherAttendanceStatus || 'قيد الانتظار'}
                    </Badge>
                    <AttendanceCorrectionMenu session={s} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2"><History size={15} className="text-violet-600" /> آخر الحصص</h4>
          {!recentSessions?.length ? (
            <p className="text-xs text-gray-500 py-3">لا توجد حصص بعد</p>
          ) : (
            <div className="space-y-1.5">
              {recentSessions.slice(0, 10).map((s) => {
                const cfg = SESSION_STATUS_LABELS_AR[s.status] || { label: s.status, color: '#6b7280' }
                return (
                  <div key={s._id} className="flex items-center justify-between gap-2 text-xs py-1.5 border-b border-gray-50 last:border-0">
                    <span className="text-gray-700 truncate">{s.studentId?.firstNameAr} {s.studentId?.lastNameAr}</span>
                    <span className="text-gray-500 flex-none">{formatDateAr(s.scheduledAt)}</span>
                    <span className="font-bold flex-none" style={{ color: cfg.color }}>{cfg.label}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Payroll tab ──────────────────────────────────────────────────────────────

function PayrollTab({ teacherId, teacherName, hourlyRate }) {
  const { hasPermission } = useAuthStore()
  const canViewPayroll = hasPermission('payroll.view')
  const canManagePayroll = hasPermission('payroll.manage')
  const qc = useQueryClient()

  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false)
  const [reversingEntry, setReversingEntry] = useState(null)
  const [reverseReason, setReverseReason] = useState('')

  const { data: payrollPeriods } = useQuery({
    queryKey: ['admin', 'payroll', 'teacher-periods', teacherId],
    queryFn: () => payrollService.listTeacherPeriods(teacherId, { limit: 12 }).then((r) => r.data.data.rows),
    enabled: canViewPayroll,
  })

  const { data: adjustmentsData, isLoading: adjustmentsLoading } = useQuery({
    queryKey: ['admin', 'payroll', 'adjustments', teacherId],
    queryFn: () => payrollService.listAdjustments({ teacherId, limit: 30 }).then((r) => r.data.data),
    enabled: canViewPayroll,
  })

  const reverseMut = useMutation({
    mutationFn: async ({ entryId, reason }) => {
      if (!reason?.trim()) throw new Error('يرجى كتابة سبب إلغاء الحركة المالية')
      return payrollService.reverseAdjustment(entryId, reason.trim())
    },
    onSuccess: () => {
      toast.success('تم إلغاء الحركة المالية وتوثيق العكس بنجاح')
      qc.invalidateQueries({ queryKey: ['admin', 'payroll', 'teacher-periods', teacherId] })
      qc.invalidateQueries({ queryKey: ['admin', 'payroll', 'adjustments', teacherId] })
      setReversingEntry(null)
      setReverseReason('')
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || err.message || 'حدث خطأ أثناء إلغاء الحركة')
    },
  })

  if (!canViewPayroll) {
    return <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-sm text-gray-500">لا تملك صلاحية عرض بيانات الرواتب.</div>
  }

  const adjustments = adjustmentsData?.rows || adjustmentsData?.adjustments || []

  return (
    <div className="space-y-5">
      {/* Header with Quick Action */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-heading font-bold text-gray-900 text-base">إدارة مستحقات ورواتب المعلم</h3>
          <p className="text-xs text-gray-500 mt-0.5">تسجيل المكافآت التشجيعية، الخصومات والجزاءات، وحساب الحصص الإضافية</p>
        </div>

        {canManagePayroll && (
          <Button
            variant="purple"
            size="sm"
            onClick={() => setShowAdjustmentModal(true)}
            icon={<SlidersHorizontal size={14} />}
          >
            إجراء مالي (مكافأة / خصم / حصة)
          </Button>
        )}
      </div>

      {/* 2-Col: Hourly Rate breakdown + Payroll Periods */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <h3 className="font-bold text-gray-900 flex items-center gap-2"><Wallet size={16} className="text-violet-600" /> سعر الحصة حسب المدة</h3>
          {!hourlyRate ? (
            <p className="text-xs text-gray-500">لم يتم تحديد سعر ساعة تدريس لهذا المعلم بعد.</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {[30, 45, 60, 90].map((mins) => (
                <div key={mins} className="text-center rounded-lg bg-gray-50 py-2">
                  <div className="text-sm font-bold text-gray-800">{formatCurrency(Math.round(hourlyRate * mins / 60), 'EGP')}</div>
                  <div className="text-[11px] text-gray-500">{mins} د</div>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2 pt-2 border-t border-gray-100">
            {hasPermission('monthlyReports.view') && (
              <Link to={`${ROUTES.ADMIN_MONTHLY_REPORTS}?teacherId=${teacherId}`} className="flex-1 text-center text-xs font-bold text-violet-600 border border-violet-100 rounded-lg py-2 hover:bg-violet-50">التقارير الشهرية</Link>
            )}
            {hasPermission('quranReports.view') && (
              <Link to={`${ROUTES.ADMIN_QURAN_REPORTS}?teacherId=${teacherId}`} className="flex-1 text-center text-xs font-bold text-violet-600 border border-violet-100 rounded-lg py-2 hover:bg-violet-50">تقارير الحلقات</Link>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">فترات الراتب الشهرية</h3>
            <Link to={ROUTES.ADMIN_PAYROLL} className="text-xs font-bold text-violet-600 hover:text-violet-800">عرض لوحة الرواتب</Link>
          </div>
          {!payrollPeriods?.length ? (
            <p className="text-xs text-gray-500 py-3">لا توجد فترات راتب بعد لهذا المعلم</p>
          ) : (
            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {payrollPeriods.map((p) => (
                <Link key={p._id} to={ROUTES.ADMIN_PAYROLL_PERIOD.replace(':periodId', p._id)}
                  className="flex items-center justify-between text-sm rounded-lg px-2.5 py-2 hover:bg-gray-50 transition-colors">
                  <span className="text-gray-700 font-semibold">{p.periodKey}</span>
                  <span className="flex items-center gap-2">
                    <Badge variant={{ open: 'gray', pending_review: 'warning', approved: 'blue', paid: 'success' }[p.status] || 'gray'}>
                      {{ open: 'مفتوحة', pending_review: 'بانتظار المراجعة', approved: 'معتمدة', paid: 'مدفوعة' }[p.status] || p.status}
                    </Badge>
                    <span className="font-bold text-gray-900" dir="ltr">{formatCurrency(p.netPayable, 'EGP')}</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Adjustments & Bonuses Ledger Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="font-heading font-bold text-gray-900 text-sm">سجل المكافآت والخصومات والتسويات المالية</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-bold">
              {adjustments.length}
            </span>
          </div>
          {canManagePayroll && (
            <button
              type="button"
              onClick={() => setShowAdjustmentModal(true)}
              className="text-xs font-bold text-violet-600 hover:text-violet-800 flex items-center gap-1 transition-colors"
            >
              <Plus size={13} /> إضافة حركة جديدة
            </button>
          )}
        </div>

        {adjustmentsLoading ? (
          <div className="flex justify-center py-8"><Spinner color="border-violet-600" /></div>
        ) : !adjustments.length ? (
          <div className="text-center py-8 text-xs text-gray-500 border border-dashed border-gray-200 rounded-xl">
            لا توجد مكافآت أو خصومات مسجلة لهذا المعلم بعد.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-bold">
                  <th className="pb-2.5 pr-2">التاريخ</th>
                  <th className="pb-2.5">النوع</th>
                  <th className="pb-2.5">القيمة</th>
                  <th className="pb-2.5">السبب والتفاصيل</th>
                  <th className="pb-2.5">بواسطة</th>
                  <th className="pb-2.5 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {adjustments.map((entry) => {
                  const isBonus = entry.type === 'bonus' || entry.amount > 0
                  const isReversal = entry.type === 'reversal' || !!entry.reversedBy
                  return (
                    <tr key={entry._id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3 pr-2 text-gray-500 whitespace-nowrap">
                        {formatDateAr(entry.createdAt)}
                      </td>
                      <td className="py-3 whitespace-nowrap">
                        <Badge variant={entry.type === 'bonus' ? 'success' : entry.type === 'penalty' ? 'danger' : 'purple'}>
                          {entry.type === 'bonus' ? 'مكافأة +' : entry.type === 'penalty' ? 'خصم -' : 'تسوية'}
                        </Badge>
                      </td>
                      <td className="py-3 font-bold whitespace-nowrap" dir="ltr">
                        <span className={isBonus ? 'text-emerald-600 font-extrabold' : 'text-rose-600 font-extrabold'}>
                          {entry.amount > 0 ? `+${entry.amount}` : entry.amount} EGP
                        </span>
                      </td>
                      <td className="py-3 text-gray-700 max-w-xs">
                        <div className="truncate font-medium">{entry.reason || '—'}</div>
                        {entry.periodId?.periodKey && (
                          <span className="text-[10px] text-gray-400">فترة: {entry.periodId.periodKey}</span>
                        )}
                      </td>
                      <td className="py-3 text-gray-500 whitespace-nowrap">
                        {entry.createdBy?.firstNameAr ? `${entry.createdBy.firstNameAr} ${entry.createdBy.lastNameAr || ''}` : 'الإدارة'}
                      </td>
                      <td className="py-3 text-center whitespace-nowrap">
                        {canManagePayroll && !isReversal && (
                          <button
                            type="button"
                            onClick={() => setReversingEntry(entry)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="إلغاء / عكس هذه الحركة"
                          >
                            <RotateCcw size={14} />
                          </button>
                        )}
                        {isReversal && (
                          <span className="text-[10px] font-bold text-gray-400">معكوسة</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Adjustment Modal */}
      {showAdjustmentModal && (
        <TeacherAdjustmentModal
          open={showAdjustmentModal}
          onClose={() => setShowAdjustmentModal(false)}
          teacherId={teacherId}
          teacherName={teacherName}
          hourlyRate={hourlyRate}
        />
      )}

      {/* Reversal Confirmation Modal */}
      {reversingEntry && (
        <Modal
          open={Boolean(reversingEntry)}
          onClose={() => setReversingEntry(null)}
          title="إلغاء حركة مالية (عكس القيد)"
          size="sm"
          footer={
            <div className="flex items-center justify-between w-full">
              <Button variant="ghost" onClick={() => setReversingEntry(null)} disabled={reverseMut.isPending}>
                تراجع
              </Button>
              <Button
                variant="danger"
                onClick={() => reverseMut.mutate({ entryId: reversingEntry._id, reason: reverseReason })}
                loading={reverseMut.isPending}
                disabled={!reverseReason.trim()}
              >
                تأكيد الإلغاء والعكس
              </Button>
            </div>
          }
        >
          <div className="space-y-3 text-xs" dir="rtl">
            <p className="text-gray-600 leading-relaxed">
              سيتم إنشاء حركة عكسية تلغي أثر هذه الحركة المالية بالكامل بقيمة{' '}
              <b className="text-gray-900 font-bold" dir="ltr">{reversingEntry.amount} EGP</b>.
            </p>
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">سبب الإلغاء (إلزامي للتوثيق):</label>
              <input
                type="text"
                className="field-light w-full"
                placeholder="اكتب سبب إلغاء هذه الحركة..."
                value={reverseReason}
                onChange={(e) => setReverseReason(e.target.value)}
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Account tab (edit / reset password / activate-deactivate — absorbed
//    from the old teacher-list drawer, the only place these used to live) ──

function AccountTab({ teacher, onUpdate }) {
  const qc = useQueryClient()
  const [confirmDeactivate, setConfirmDeactivate] = useState(false)
  const [form, setForm] = useState(() => ({
    firstNameAr: teacher.firstNameAr || '', lastNameAr: teacher.lastNameAr || '',
    email: teacher.email || '', phone: teacher.phone || '', specialization: teacher.specialization || '',
    bioAr: teacher.bioAr || '', notes: teacher.notes || '', salaryPerSession: teacher.salaryPerSession || '',
    gender: teacher.gender || '',
    specializations: teacher.specializations?.length ? teacher.specializations : (teacher.category ? [teacher.category] : []),
    audienceCategories: teacher.audienceCategories || [], hourlyRate: teacher.hourlyRate ?? '',
    availableShifts: teacher.availableShifts || [],
  }))
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))
  const [pw, setPw] = useState('')

  const updateMut = useMutation({
    mutationFn: (data) => api.patch(`/admin/teachers/${teacher._id}`, data).then((r) => r.data),
    onSuccess: (res) => { toast.success('تم تحديث بيانات المعلم'); qc.invalidateQueries({ queryKey: ['admin', 'teacher-profile', teacher._id] }); qc.invalidateQueries({ queryKey: ['admin', 'teachers'] }); onUpdate(res.data) },
    onError: (err) => toast.error(err?.response?.data?.message || 'حدث خطأ'),
  })
  const toggleMut = useMutation({
    mutationFn: (isActive) => api.patch(`/admin/teachers/${teacher._id}`, { isActive }).then((r) => r.data),
    onSuccess: (res) => { toast.success(res.data?.isActive ? 'تم تفعيل الحساب' : 'تم إيقاف الحساب'); qc.invalidateQueries({ queryKey: ['admin', 'teacher-profile', teacher._id] }); qc.invalidateQueries({ queryKey: ['admin', 'teachers'] }); onUpdate(res.data) },
    onError: () => toast.error('حدث خطأ'),
  })
  const resetPwMut = useMutation({
    mutationFn: () => api.post(`/admin/teachers/${teacher._id}/reset-password`, { newPassword: pw }).then((r) => r.data),
    onSuccess: () => { toast.success('تم إعادة تعيين كلمة المرور'); setPw('') },
    onError: (err) => toast.error(err?.response?.data?.message || 'حدث خطأ'),
  })

  const [confirmDelete, setConfirmDelete] = useState(false)
  const navigate = useNavigate()

  const deleteMut = useMutation({
    mutationFn: () => api.delete(`/admin/teachers/${teacher._id}/permanent?force=true`).then((r) => r.data),
    onSuccess: () => {
      toast.success('تم حذف حساب المعلم وسجلاته نهائيًا')
      qc.invalidateQueries({ queryKey: ['admin', 'teachers'] })
      navigate(ROUTES.ADMIN_TEACHERS)
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'حدث خطأ أثناء حذف المعلم'),
  })

  function requestToggle() {
    if (teacher.isActive) setConfirmDeactivate(true)
    else toggleMut.mutate(true)
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <h3 className="font-bold text-gray-900 mb-1">تعديل بيانات المعلم</h3>
          <GenderSegmentedControl value={form.gender} onChange={(v) => set('gender', v)} />
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>الاسم الأول</label><input className={inputCls} value={form.firstNameAr} onChange={(e) => set('firstNameAr', e.target.value)} /></div>
            <div><label className={labelCls}>الاسم الأخير</label><input className={inputCls} value={form.lastNameAr} onChange={(e) => set('lastNameAr', e.target.value)} /></div>
          </div>
          <div><label className={labelCls}>البريد الإلكتروني</label><input type="email" dir="ltr" className={inputCls} value={form.email} onChange={(e) => set('email', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>رقم الهاتف</label><input dir="ltr" className={inputCls} value={form.phone} onChange={(e) => set('phone', e.target.value)} /></div>
            <div><label className={labelCls}>الراتب / الحصة (قديم، اختياري)</label><input type="number" className={inputCls} value={form.salaryPerSession} onChange={(e) => set('salaryPerSession', e.target.value)} placeholder="0" /></div>
          </div>
          <SpecializationsMultiSelect value={form.specializations} onChange={(v) => set('specializations', v)} required />
          <AudienceCategoriesMultiSelect value={form.audienceCategories} onChange={(v) => set('audienceCategories', v)} />
          <div><label className={labelCls}>سعر ساعة التدريس</label><input type="number" min="0" step="0.5" className={inputCls} value={form.hourlyRate} onChange={(e) => set('hourlyRate', e.target.value)} placeholder="0" /></div>
          <ShiftsMultiSelect value={form.availableShifts} onChange={(v) => set('availableShifts', v)} />
          <div><label className={labelCls}>نبذة (تظهر للطلاب)</label><textarea className={`${inputCls} h-16 resize-none py-2`} value={form.bioAr} onChange={(e) => set('bioAr', e.target.value)} /></div>
          <div>
            <label className={labelCls}>ملاحظات إدارية (داخلية، لا تظهر للمعلم)</label>
            <textarea className={`${inputCls} h-16 resize-none py-2`} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="ملاحظات للفريق الإداري فقط..." />
          </div>
          <button onClick={() => updateMut.mutate(form)} disabled={updateMut.isPending}
            className="w-full h-11 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
            {updateMut.isPending && <Spinner size="sm" color="border-white" />} حفظ التعديلات
          </button>
        </div>

        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <h3 className="font-bold text-gray-900 flex items-center gap-2"><KeyRound size={16} className="text-violet-600" /> إعادة تعيين كلمة المرور</h3>
            <p className="text-xs text-gray-500">أدخل كلمة مرور جديدة للمعلم — سيُطلب منه تسجيل الدخول بها.</p>
            <input type="password" className={inputCls} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="كلمة مرور جديدة (8 أحرف على الأقل)" dir="ltr" />
            <button onClick={() => resetPwMut.mutate()} disabled={pw.length < 8 || resetPwMut.isPending}
              className="w-full h-10 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
              {resetPwMut.isPending && <Spinner size="sm" color="border-white" />} تعيين كلمة المرور
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <h3 className="font-bold text-gray-900">حالة الحساب</h3>
            <p className="text-xs text-gray-500">
              {teacher.isActive ? 'الحساب نشط حاليًا ويستطيع المعلم الدخول وإدارة حصصه.' : 'الحساب موقوف حاليًا — لا يستطيع المعلم الدخول.'}
            </p>
            <button onClick={requestToggle} disabled={toggleMut.isPending}
              className={`w-full h-11 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60 ${teacher.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
              {toggleMut.isPending ? <Spinner size="sm" color={teacher.isActive ? 'border-red-500' : 'border-emerald-600'} /> : (teacher.isActive ? <PowerOff size={15} /> : <Power size={15} />)}
              {teacher.isActive ? 'إيقاف حساب المعلم' : 'تفعيل حساب المعلم'}
            </button>
          </div>

          {/* Danger Zone: Permanent Delete */}
          <div className="bg-red-50/40 rounded-2xl border border-red-200 p-5 space-y-3">
            <h3 className="font-bold text-red-900 flex items-center gap-1.5">
              <AlertTriangle size={16} className="text-red-600" /> منطقة الخطر: الحذف النهائي للمعلم
            </h3>
            <p className="text-xs text-red-700 leading-relaxed">
              حذف حساب المعلم وساعاته ومواعيده غير المكتملة نهائيًا من قاعدة البيانات. لا يمكن التراجع عن هذا الإجراء بعد تنفيذه.
            </p>
            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={deleteMut.isPending}
                className="px-5 h-10 rounded-xl font-bold text-xs bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm"
              >
                {deleteMut.isPending ? <Spinner size="sm" color="border-white" /> : <Trash2 size={14} />}
                حذف المعلم وسجلاته نهائيًا
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDeactivate}
        onClose={() => setConfirmDeactivate(false)}
        onConfirm={() => { toggleMut.mutate(false); setConfirmDeactivate(false) }}
        title="إيقاف حساب المعلم"
        message={`سيتم إيقاف حساب "${teacher.firstNameAr} ${teacher.lastNameAr}" فوراً، ولن يتمكن من الدخول أو إدارة حصصه حتى يُعاد تفعيله. هل تريد المتابعة؟`}
        confirmLabel="إيقاف الحساب"
        variant="danger"
      />

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => { deleteMut.mutate(); setConfirmDelete(false) }}
        title="تأكيد الحذف النهائي للمعلم"
        message={`هل أنت متأكد من رغبتك في حذف المعلم "${teacher.firstNameAr} ${teacher.lastNameAr}" نهائيًا؟ سيتم مسح حسابه وساعاته ومواعيده غير المكتملة فوراً.`}
        confirmLabel="نعم، احذف المعلم نهائيًا"
        variant="danger"
      />
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function AdminTeacherProfilePage() {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [showBulkSync, setShowBulkSync] = useState(false)
  const { hasPermission } = useAuthStore()
  const { data: subjects = [] } = useTeachingSubjects()
  const qc = useQueryClient()

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'teacher-profile', id],
    queryFn: () => api.get(`/admin/teachers/${id}`).then((r) => r.data.data),
  })

  const tab = TABS.some((t) => t.key === searchParams.get('tab')) ? searchParams.get('tab') : 'overview'
  function setTab(key) {
    const next = new URLSearchParams(searchParams)
    if (key === 'overview') next.delete('tab')
    else next.set('tab', key)
    setSearchParams(next)
  }

  // Continuation from the onboarding wizard's success page
  // (`/admin/teachers/:id?action=add`).
  useEffect(() => {
    if (!isLoading && !isError && data && searchParams.get('action') === 'add') {
      setShowAddStudent(true)
      const next = new URLSearchParams(searchParams)
      next.delete('action')
      setSearchParams(next, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isError, data])

  if (isLoading) return <div className="flex justify-center py-24"><Spinner color="border-violet-600" /></div>
  if (isError || !data) return <ErrorState title="تعذّر تحميل الملف الإداري للمعلم" onRetry={refetch} />

  const { teacher, students, workingHours, recentSessions, scheduleRules } = data
  const identity = resolveTeacherIdentity(teacher)
  const specializations = teacher.specializations?.length ? teacher.specializations : (teacher.category ? [teacher.category] : [])
  const statusColor = teacher.isActive ? '#10b981' : '#ef4444'

  function handleUpdate(updated) {
    if (!updated) return
    qc.setQueryData(['admin', 'teacher-profile', id], (old) => old ? { ...old, teacher: { ...old.teacher, ...updated } } : old)
  }

  return (
    <div dir="rtl" className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-start gap-3 mb-4">
          <Link to={ROUTES.ADMIN_TEACHERS} className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors flex-none">
            <ArrowRight size={18} />
          </Link>
          <Avatar src={identity.displayAvatar} firstName={teacher.firstNameAr} lastName={teacher.lastNameAr} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-heading font-extrabold text-xl sm:text-2xl text-gray-900 truncate">{teacher.firstNameAr} {teacher.lastNameAr}</h1>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: `${statusColor}18`, color: statusColor }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} />
                {teacher.isActive ? 'نشط' : 'موقوف'}
              </span>
              {!teacher.gender && <Badge variant="warning">التصنيف غير محدد</Badge>}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {specializations.map((s) => subjectLabel(subjects, s)).filter(Boolean).join('، ') || 'بدون تخصص محدد'}
              {' · '}عضو منذ {formatDateAr(teacher.createdAt)}
            </p>
            <div className="flex items-center gap-4 mt-3 flex-wrap">
              <div className="text-center"><div className="font-heading font-extrabold text-lg text-violet-700">{students?.length || 0}</div><div className="text-[11px] text-gray-500">طالب</div></div>
              <div className="text-center"><div className="font-heading font-extrabold text-lg text-amber-600">{(recentSessions || []).length}</div><div className="text-[11px] text-gray-500">آخر الحصص</div></div>
              {!!teacher.hourlyRate && <div className="text-center"><div className="font-heading font-extrabold text-lg text-emerald-600">{formatCurrency(teacher.hourlyRate, 'EGP')}</div><div className="text-[11px] text-gray-500">/ ساعة</div></div>}
            </div>
          </div>
          <div className="hidden sm:flex flex-col gap-2 flex-none">
            <button
              type="button"
              onClick={() => setShowBulkSync(true)}
              title="تعميم الرابط العمومي على كافة المحاضرات والحصص"
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-violet-100 text-violet-700 hover:bg-violet-200 transition-colors shadow-xs"
            >
              <Video size={15} />
            </button>
            {teacher.email && (
              <button onClick={() => window.open(`mailto:${teacher.email}`)} title="مراسلة" className="w-9 h-9 rounded-xl flex items-center justify-center bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors">
                <Mail size={15} />
              </button>
            )}
            {teacher.phone && (
              <button onClick={() => window.open(`https://wa.me/${teacher.phone}`)} title="واتساب" className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors">
                <MessageCircle size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl overflow-x-auto no-scrollbar">
          {TABS.filter((t) => !t.permission || hasPermission(t.permission)).map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-sm font-bold whitespace-nowrap transition-all ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
              <t.Icon size={14} /> {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <OverviewTab
          teacher={teacher}
          workingHours={workingHours}
          scheduleRules={scheduleRules}
          subjects={subjects}
          id={id}
          onSyncLinks={() => setShowBulkSync(true)}
        />
      )}
      {tab === 'sessions' && (
        <TeacherSessionsTab
          teacherId={id}
          teacher={teacher}
          students={students}
          workingHours={workingHours}
          scheduleRules={scheduleRules}
          onSyncLinks={() => setShowBulkSync(true)}
        />
      )}
      {tab === 'students' && (
        <StudentsTab
          teacherId={id}
          students={students}
          onAddStudent={() => setShowAddStudent(true)}
          onSyncLinks={() => setShowBulkSync(true)}
        />
      )}
      {tab === 'performance' && <PerformanceTab teacherId={id} recentSessions={recentSessions} />}
      {tab === 'payroll' && hasPermission('payroll.view') && (
        <PayrollTab
          teacherId={id}
          teacherName={`${teacher.firstNameAr} ${teacher.lastNameAr}`}
          hourlyRate={teacher.hourlyRate}
        />
      )}
      {tab === 'account' && <AccountTab teacher={teacher} onUpdate={handleUpdate} />}

      <AddStudentModal
        teacherId={id} open={showAddStudent} onClose={() => setShowAddStudent(false)}
        teacherContext={{
          name: `${teacher.firstNameAr} ${teacher.lastNameAr}`,
          specializationsLabel: specializations.map((s) => subjectLabel(subjects, s)).filter(Boolean).join('، '),
          workingHoursSummary: summarizeWorkingHoursDays(workingHours?.days),
          studentsCount: students?.length || 0,
        }}
      />

      {showBulkSync && (
        <BulkSyncLinksModal
          open={showBulkSync}
          onClose={() => setShowBulkSync(false)}
          isAdmin={true}
          teacherId={id}
          preloadedStudents={students?.map((s) => s.student || s).filter(Boolean)}
          savedLinks={teacher.meetingLinks}
        />
      )}
    </div>
  )
}
