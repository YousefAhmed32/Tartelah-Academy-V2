import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Shield, Activity, Users, CalendarClock, TrendingUp } from 'lucide-react'
import api from '../../utils/api.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import StatCard from '../../components/shared/StatCard.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Pagination from '../../components/ui/Pagination.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Select from '../../components/ui/Select.jsx'
import { formatDateTimeAr } from '../../utils/date.js'

// Every action code any controller currently logs via audit.service's
// logAction(). Kept as one flat map (rather than scattered per-controller)
// so this page is the single place that has to stay in sync when a new
// audit-logged action is added — see docs/INTELLIGENT_ATTENDANCE_SYSTEM.md
// "Audit Intelligence".
const ACTION_LABELS = {
  // Legacy flat-style actions (admin.controller.js)
  update_student: { label: 'تعديل طالب', badge: 'purple' },
  deactivate_student: { label: 'إيقاف طالب', badge: 'danger' },
  update_teacher: { label: 'تعديل معلم', badge: 'purple' },
  reset_password: { label: 'إعادة تعيين كلمة المرور', badge: 'warning' },
  update_evaluation: { label: 'تعديل تقييم', badge: 'purple' },
  delete_evaluation: { label: 'حذف تقييم', badge: 'danger' },
  cancel_session: { label: 'إلغاء حصة', badge: 'danger' },
  update_attendance: { label: 'تعديل حضور', badge: 'purple' },

  // Session lifecycle
  'session.check_in': { label: 'تسجيل حضور معلم', badge: 'purple' },
  'session.report_delay': { label: 'إبلاغ عن تأخر حصة', badge: 'warning' },
  'session.complete': { label: 'إكمال حصة', badge: 'success' },
  'session.cancel': { label: 'إلغاء حصة', badge: 'danger' },
  'session.reschedule': { label: 'إعادة جدولة حصة', badge: 'warning' },
  'session.admin_update': { label: 'تعديل إداري لحصة', badge: 'purple' },
  'session.admin_create': { label: 'إنشاء حصة (إدارة)', badge: 'purple' },
  'session.admin_delete': { label: 'حذف حصة (إدارة)', badge: 'danger' },

  // Attendance
  'attendance.save': { label: 'حفظ حضور طالب (مسودة)', badge: 'gray' },
  'attendance.finalize': { label: 'اعتماد حضور طالب نهائياً', badge: 'success' },
  'attendance.update': { label: 'تعديل سجل حضور', badge: 'purple' },
  'attendance.admin_override': { label: 'تصحيح إداري لحضور طالب', badge: 'warning' },
  'attendance.admin_correction': { label: 'تصحيح حضور/راتب معلم', badge: 'warning' },

  // Subscriptions & enrollment
  'subscription.create': { label: 'إنشاء اشتراك', badge: 'success' },
  'subscription.update': { label: 'تعديل اشتراك', badge: 'purple' },
  'subscription.pause': { label: 'إيقاف اشتراك مؤقتاً', badge: 'warning' },
  'subscription.resume': { label: 'استئناف اشتراك', badge: 'success' },
  'enrollment.approved': { label: 'الموافقة على طلب تسجيل', badge: 'success' },
  'enrollment.rejected': { label: 'رفض طلب تسجيل', badge: 'danger' },
  'enrollment.approve': { label: 'الموافقة على طلب تسجيل', badge: 'success' },
  'enrollment.reject': { label: 'رفض طلب تسجيل', badge: 'danger' },

  // Scheduling
  'schedule_rule.create': { label: 'إنشاء جدول دوري', badge: 'success' },
  'schedule_rule.admin_update': { label: 'تعديل جدول دوري', badge: 'purple' },
  'schedule_rule.admin_delete': { label: 'حذف جدول دوري', badge: 'danger' },
  'schedule_rule.admin_generate_more': { label: 'توليد حصص إضافية', badge: 'success' },

  // Review queue (Operations Center)
  'review.start_review': { label: 'بدء مراجعة حصة', badge: 'purple' },
  'review.resolve': { label: 'اعتماد مراجعة حصة', badge: 'success' },
  'review.dismiss': { label: 'تجاهل تنبيه مراجعة', badge: 'gray' },
  'review.reopen': { label: 'إعادة فتح مراجعة', badge: 'warning' },

  // Monthly Teacher Reports
  'monthlyReport.submit': { label: 'تسليم تقرير شهري', badge: 'purple' },
  'monthlyReport.generate': { label: 'توليد تقرير شهري', badge: 'purple' },
  'monthlyReport.generate_all': { label: 'توليد تقارير شهرية للجميع', badge: 'purple' },
  'monthlyReport.request_completion': { label: 'طلب إكمال تقرير شهري', badge: 'warning' },
  'monthlyReport.reviewed': { label: 'مراجعة تقرير شهري', badge: 'info' },
  'monthlyReport.approve': { label: 'اعتماد تقرير شهري', badge: 'success' },

  // Quran Session Reports
  'quranReport.submit': { label: 'تسليم تقرير حلقة', badge: 'purple' },
  'quranReport.request_correction': { label: 'طلب تصحيح تقرير حلقة', badge: 'warning' },
  'quranReport.approve': { label: 'اعتماد تقرير حلقة', badge: 'success' },

  // Teacher Payroll
  'payroll.submit_period': { label: 'رفع مسير رواتب', badge: 'purple' },
  'payroll.approve_period': { label: 'اعتماد مسير رواتب', badge: 'success' },
  'payroll.settle_period': { label: 'تسوية وصرف رواتب', badge: 'success' },
  'payroll.create_adjustment': { label: 'إضافة تسوية مالية', badge: 'warning' },
  'payroll.delete_adjustment': { label: 'حذف تسوية مالية', badge: 'danger' },

  // Assignment Requests
  'assignment.create': { label: 'إنشاء طلب إسناد', badge: 'purple' },
  'assignment.activate': { label: 'تفعيل إسناد الطالب', badge: 'success' },
  'assignment.accept': { label: 'قبول طلب الإسناد', badge: 'success' },
  'assignment.reject': { label: 'رفض طلب الإسناد', badge: 'danger' },
  'assignment.time_change': { label: 'طلب تغيير موعد الإسناد', badge: 'warning' },
  'assignment.edit_resend': { label: 'تعديل وإعادة إرسال الإسناد', badge: 'purple' },
  'assignment.reassign': { label: 'إعادة إسناد لمعلم آخر', badge: 'warning' },
  'assignment.cancel': { label: 'إلغاء طلب الإسناد', badge: 'danger' },

  // Transfers & Replacements
  'transfer.student': { label: 'نقل طالب لمعلم آخر', badge: 'purple' },
  'transfer.teacher': { label: 'استبدال معلم لجميع طلابه', badge: 'warning' },

  // Credentials
  'credentials.set_default_password': { label: 'تعيين كلمة مرور افتراضية', badge: 'warning' },
  'credentials.clear_default_password': { label: 'إلغاء كلمة المرور الافتراضية', badge: 'danger' },

  // Onboarding & Admin User Management
  'admin.create_student': { label: 'إنشاء حساب طالب', badge: 'success' },
  'admin.add_student_to_teacher': { label: 'إضافة طالب للمعلم', badge: 'success' },
  'admin.create_subscription': { label: 'إنشاء اشتراك جديد', badge: 'success' },
  'onboarding.create_teacher_with_students': { label: 'تسجيل معلم مع طلابه', badge: 'success' },
  'teacher.update_working_hours': { label: 'تعديل ساعات عمل المعلم', badge: 'purple' },
  'admin.create_teacher': { label: 'إنشاء حساب معلم', badge: 'success' },
  'admin.update_teacher': { label: 'تعديل بيانات المعلم', badge: 'purple' },
  'admin.update_teacher_hourly_rate': { label: 'تعديل سعر حصة المعلم', badge: 'warning' },

  // Articles CMS
  'article.create': { label: 'إنشاء مقال', badge: 'success' },
  'article.update': { label: 'تعديل مقال', badge: 'purple' },
  'article.publish': { label: 'نشر مقال', badge: 'success' },
  'article.unpublish': { label: 'إلغاء نشر مقال', badge: 'warning' },
  'article.duplicate': { label: 'نسخ مقال', badge: 'purple' },
  'article.delete': { label: 'حذف مقال', badge: 'danger' },
  'article.restore': { label: 'استعادة مقال', badge: 'success' },
}

const ENTITY_LABELS_AR = {
  User: 'مستخدم',
  Session: 'حصة',
  Evaluation: 'تقييم',
  Attendance: 'سجل حضور',
  Subscription: 'اشتراك',
  EnrollmentRequest: 'طلب تسجيل',
  ScheduleRule: 'جدول دوري',
  Article: 'مقال',
  MonthlyTeacherReport: 'تقرير شهري',
  QuranSessionReport: 'تقرير حلقة',
  AssignmentRequest: 'طلب إسناد',
  TeacherPayrollPeriod: 'مسير رواتب',
  TeachingSubject: 'مادة دراسية',
  TeacherWorkingHours: 'ساعات عمل',
  SubscriptionPause: 'إيقاف اشتراك',
  SubscriptionRenewalRequest: 'طلب تجديد',
}

const ACTION_SUMMARIES_AR = {
  'monthlyReport.reviewed': 'تمت مراجعة التقرير الشهري للمعلم والتحقق من كشف الحصص',
  'monthlyReport.approve': 'تم اعتماد التقرير الشهري وإقراره نهائياً',
  'monthlyReport.submit': 'قام المعلم بتسليم التقرير الشهري للإدارة',
  'monthlyReport.request_completion': 'طُلب من المعلم استكمال ومراجعة بيانات التقرير الشهري',
  'monthlyReport.generate': 'تم توليد التقرير الشهري واحتساب إحصائيات المعلم',
  'monthlyReport.generate_all': 'تم توليد التقارير الشهرية لكافة المعلمين',
  'quranReport.approve': 'تمت مراجعة واعتماد تقرير الحلقة القرآنية',
  'quranReport.request_correction': 'طُلب من المعلم تصحيح وتدقيق بيانات تقرير الحلقة',
  'quranReport.submit': 'تم رفع تقرير الحلقة القرآنية وملاحظات التجويد',
  'payroll.approve_period': 'تم اعتماد مسير رواتب المعلمين للشهر',
  'payroll.settle_period': 'تمت تسوية وصرف مستحقات المعلمين بالكامل',
  'payroll.submit_period': 'تم رفع مسير الرواتب للاعتماد',
  'assignment.accept': 'وافق المعلم على إسناد الطالب وبدء التدريس',
  'assignment.reject': 'اعتذر المعلم عن قبول إسناد الطالب',
  'assignment.time_change': 'طلب المعلم مواعيد بديلة لتجنب التعارض',
  'assignment.activate': 'تم تفعيل جدول الحصص والاشتراك للطالب بنجاح',
  'assignment.create': 'تم إنشاء وإرسال طلب إسناد جديد للمعلم',
  'assignment.cancel': 'تم إلغاء طلب الإسناد',
  'subscription.pause': 'تم إيقاف الاشتراك مؤقتاً بناءً على طلب المشترك',
  'subscription.resume': 'تم استئناف تفعيل اشتراك الطالب واحتساب الحصص',
  'subscription.create': 'تم إنشاء وتفعيل اشتراك جديد',
  'credentials.set_default_password': 'تم ضبط كلمة مرور افتراضية موحدة للنظام',
  'credentials.clear_default_password': 'تم إلغاء كلمة المرور الافتراضية للنظام',
  'transfer.student': 'تم نقل الطالب إلى جدول المعلم الجديد',
  'transfer.teacher': 'تم تنفيذ عملية استبدال المعلم لطلابه',
}

const FIELD_LABELS_AR = {
  status: 'الحالة', notes: 'ملاحظات', payrollStatus: 'حالة الاستحقاق', payrollStatusReason: 'السبب',
  reason: 'السبب', outcome: 'النتيجة', reviewState: 'حالة المراجعة', note: 'ملاحظة',
  teacherId: 'المعلم', studentId: 'الطالب', packageId: 'الباقة', scheduledAt: 'الموعد',
  from: 'من', to: 'إلى', delayMinutes: 'دقائق التأخر', delayReasonCode: 'سبب التأخر',
  lateMinutes: 'دقائق التأخر', selfResolvedFromAutoFlag: 'تصحيح ذاتي لتنبيه تلقائي',
  finalize: 'اعتماد نهائي', sessionCount: 'عدد الحصص', title: 'العنوان',
  teacherAttendanceStatus: 'حضور المعلم', isFinalized: 'الاعتماد النهائي',
  subscriptionId: 'الاشتراك', field: 'الحقل', action: 'الإجراء',
  periodKey: 'الفترة الشهرية', year: 'السنة', month: 'الشهر',
  scheduledSessions: 'الحصص المجدولة', completedSessions: 'الحصص المكتملة',
  grossEntitlement: 'إجمالي الاستحقاق', netPayable: 'صافي المستحق',
  proposedSchedule: 'المواعيد المقترحة', studentType: 'نوع الطالب',
  lessonDurationMinutes: 'مدة الحصة بالدقائق', specialization: 'التخصص',
}

// Translates enum-style values found across the schema (Session/Subscription/
// EnrollmentRequest/Attendance/... status fields) into Arabic so the log never
// shows a raw backend code like "pending_review" to an admin.
const VALUE_LABELS_AR = {
  present: 'حاضر', absent: 'غائب', late: 'متأخر', excused: 'معذور', left_early: 'غادر مبكراً', technical_issue: 'مشكلة تقنية',
  scheduled: 'مجدولة', ongoing: 'جارية', completed: 'مكتملة', cancelled: 'ملغاة', rescheduled: 'أعيدت جدولتها', missed: 'فائتة', no_show: 'غياب بدون إذن',
  pending: 'قيد الانتظار', on_time: 'في الوقت المحدد',
  payable: 'مستحق الدفع', non_payable: 'غير مستحق', pending_review: 'قيد المراجعة', excluded: 'مستبعد',
  open: 'مفتوحة', in_review: 'قيد المراجعة', resolved: 'محلولة', dismissed: 'متجاهلة',
  active: 'نشط', expired: 'منتهي', paused: 'متوقف مؤقتاً',
  draft: 'مسودة', published: 'منشور', archived: 'مؤرشف',
  submitted: 'مُسلَّم', graded: 'مُقيَّم', returned: 'مُعاد', closed: 'مغلق',
  reviewed: 'مُراجَع', needs_completion: 'بحاجة لإكمال', correction_requested: 'مطلوب تصحيح',
  time_change_requested: 'مطلوب تعديل موعد', reassigned: 'مُعاد إسناده',
  new: 'جديدة', read: 'مقروءة', replied: 'تم الرد',
  under_review: 'قيد المراجعة', approved: 'موافق عليه', rejected: 'مرفوض',
  dropped: 'منسحب',
  excellent: 'ممتاز', good: 'جيد', fair: 'مقبول', weak: 'ضعيف',
  helpful: 'مفيد', not_helpful: 'غير مفيد',
  male: 'ذكر', female: 'أنثى',
}

const ENTITY_OPTIONS = [
  { value: 'all', label: 'كل الكيانات' },
  { value: 'MonthlyTeacherReport', label: 'التقارير الشهرية' },
  { value: 'QuranSessionReport', label: 'تقارير الحلقات' },
  { value: 'Session', label: 'الحصص' },
  { value: 'Attendance', label: 'الحضور' },
  { value: 'User', label: 'المستخدمون' },
  { value: 'AssignmentRequest', label: 'طلبات الإسناد' },
  { value: 'EnrollmentRequest', label: 'طلبات التسجيل' },
  { value: 'Subscription', label: 'الاشتراكات' },
  { value: 'TeacherPayrollPeriod', label: 'مسيرات الرواتب' },
  { value: 'Evaluation', label: 'التقييمات' },
  { value: 'ScheduleRule', label: 'الجداول الدورية' },
  { value: 'Article', label: 'المقالات' },
]

const ACTION_OPTIONS = [
  { value: 'all', label: 'كل الإجراءات' },
  ...Object.entries(ACTION_LABELS).map(([k, v]) => ({ value: k, label: v.label })),
]

function translateValue(v) {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'boolean') return v ? 'نعم' : 'لا'
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) return formatDateTimeAr(v)
  if (typeof v === 'string' && VALUE_LABELS_AR[v]) return VALUE_LABELS_AR[v]
  if (typeof v === 'object') return null
  return String(v)
}

// Renders a single changed field as a natural Arabic sentence, e.g.
// "تم تغيير الحالة من قيد الانتظار إلى نشط" instead of "status: pending -> active".
function describeField(key, newVal, oldVal) {
  if (key === 'field' && newVal === 'password') return 'تم تغيير كلمة المرور'
  const newStr = translateValue(newVal)
  if (newStr === null) return null
  const label = FIELD_LABELS_AR[key] || key
  if (oldVal !== undefined) {
    const oldStr = translateValue(oldVal)
    if (oldStr === newStr) return null
    return `تم تغيير ${label} من ${oldStr} إلى ${newStr}`
  }
  return `تم تغيير ${label} إلى ${newStr}`
}

// Renders a log entry's `changes` payload as a short human-readable line
// instead of raw JSON — the primary UX per docs/INTELLIGENT_ATTENDANCE_SYSTEM.md
// "Audit Intelligence". Falls back to a generic key:value join for any
// action shape not explicitly modeled below, so a newly added audit call
// site never regresses to a wall of JSON.
function summarizeChanges(log) {
  if (log.action === 'reset_password') return 'تم تغيير كلمة المرور'

  const c = log.changes
  if (c && typeof c === 'object') {
    if (c.before && c.after && typeof c.before === 'object' && typeof c.after === 'object') {
      const parts = []
      for (const key of Object.keys(c.after)) {
        if (c.before[key] !== c.after[key]) {
          const line = describeField(key, c.after[key], c.before[key])
          if (line) parts.push(line)
        }
      }
      if (parts.length) return parts.join(' • ')
    }

    const parts = []
    for (const [key, val] of Object.entries(c)) {
      if (val === undefined) continue
      if (val && typeof val === 'object' && ('from' in val || 'to' in val)) {
        const line = describeField(key, val.to, val.from)
        if (line) parts.push(line)
      } else if (typeof val !== 'object') {
        const line = describeField(key, val)
        if (line) parts.push(line)
      }
    }
    if (parts.length) return parts.join(' • ')
  }

  // Natural language description fallback for actions that store no explicit delta
  return ACTION_SUMMARIES_AR[log.action] || null
}

export default function AdminAuditLogsPage() {
  const [page, setPage] = useState(1)
  const [entity, setEntity] = useState('all')
  const [action, setAction] = useState('all')

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'audit-logs', page, entity, action],
    queryFn: () => {
      const p = new URLSearchParams({ page, limit: 30 })
      if (entity !== 'all') p.set('entity', entity)
      if (action !== 'all') p.set('action', action)
      return api.get(`/admin/audit-logs?${p}`).then(r => r.data)
    },
    placeholderData: (prev) => prev,
  })

  const { data: stats } = useQuery({
    queryKey: ['admin', 'audit-logs', 'stats'],
    queryFn: () => api.get('/admin/audit-logs/stats').then(r => r.data.data),
  })

  const logs = data?.data || []
  const topActionLabel = stats?.topAction ? (ACTION_LABELS[stats.topAction.action]?.label || stats.topAction.action) : '—'

  return (
    <div dir="rtl">
      <PageHeader title="سجل الأنشطة" subtitle={`${data?.total ?? 0} حدث مسجل`}
        actions={<Shield size={16} className="text-violet-400" />} />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard value={stats?.total ?? '—'} label="إجمالي الأحداث" color="#7c3aed" icon={<Shield size={20} />} />
        <StatCard value={stats?.today ?? '—'} label="اليوم" color="#059669" icon={<Activity size={20} />} />
        <StatCard value={stats?.uniqueActors ?? '—'} label="مستخدمون نشطون" color="#2563eb" icon={<Users size={20} />} />
        <StatCard value={stats?.last7Days ?? '—'} label="آخر ٧ أيام" color="#d97706" icon={<CalendarClock size={20} />} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="w-full sm:w-56">
          <Select size="sm" value={entity} onValueChange={(v) => { setEntity(v); setPage(1) }} options={ENTITY_OPTIONS} />
        </div>
        <div className="w-full sm:w-64">
          <Select size="sm" value={action} onValueChange={(v) => { setAction(v); setPage(1) }} options={ACTION_OPTIONS} />
        </div>
        {stats?.topAction && (
          <div className="flex items-center gap-2 text-xs text-[#7c6aaa] mr-auto">
            <TrendingUp size={14} />
            الأكثر تكراراً: <span className="font-semibold text-brand-textBody">{topActionLabel}</span> ({stats.topAction.count})
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner color="border-brand-purple" /></div>
      ) : (
        <>
          <div className="card-light overflow-hidden">
            {!logs.length ? (
              <div className="text-center py-12 text-[#7c6aaa]">
                <Shield size={36} className="mx-auto mb-3 opacity-40" />
                لا توجد أنشطة مسجلة
              </div>
            ) : (
              <div className="overflow-x-auto custom-scroll">
                <table className="w-full min-w-[760px] border-collapse">
                  <thead className="sticky top-0 z-10 bg-white">
                    <tr className="border-b border-[#f0ecf8]">
                      {['الوقت', 'المنفذ', 'الإجراء', 'التفاصيل', 'الكيان', 'IP'].map(h => (
                        <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-[#7c6aaa] bg-white">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map(log => {
                      const cfg = ACTION_LABELS[log.action] || { label: log.action, badge: 'gray' }
                      const summary = summarizeChanges(log)
                      const entityName = ENTITY_LABELS_AR[log.entity] || log.entity
                      return (
                        <tr key={log._id} className="border-b border-[#f8f5ff] hover:bg-[#faf9ff] transition-colors align-top">
                          <td className="px-4 py-3 text-xs text-[#7c6aaa] whitespace-nowrap">{formatDateTimeAr(log.createdAt)}</td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-semibold text-brand-textBody">{log.actorId?.firstNameAr} {log.actorId?.lastNameAr}</div>
                            <div className="text-xs text-[#7c6aaa]">{log.actorRole}</div>
                          </td>
                          <td className="px-4 py-3"><Badge variant={cfg.badge}>{cfg.label}</Badge></td>
                          <td className="px-4 py-3 text-xs text-brand-textBody max-w-xs">
                            <span className="line-clamp-2" title={summary || undefined}>{summary || '—'}</span>
                          </td>
                          <td className="px-4 py-3 text-sm whitespace-nowrap overflow-hidden text-ellipsis max-w-[160px]" title={`${entityName} ${log.entityId ? `#${log.entityId.toString().slice(-6)}` : ''}`}>
                            <span className="font-medium text-brand-textBody">{entityName}</span>
                            {log.entityId && <span className="text-xs text-[#7c6aaa] mr-1 font-mono">#{log.entityId.toString().slice(-6)}</span>}
                          </td>
                          <td className="px-4 py-3 text-xs text-[#7c6aaa] font-mono whitespace-nowrap">{log.ip || '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {data?.totalPages > 1 && (
            <div className="mt-4 flex justify-center">
              <Pagination page={page} pages={data.totalPages} total={data.total} onPageChange={setPage} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
