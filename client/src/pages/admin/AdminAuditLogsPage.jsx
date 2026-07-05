import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Shield } from 'lucide-react'
import api from '../../utils/api.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Pagination from '../../components/ui/Pagination.jsx'
import Badge from '../../components/ui/Badge.jsx'
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
  reset_password: { label: 'إعادة كلمة المرور', badge: 'warning' },
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
  'enrollment.approved': { label: 'الموافقة على طلب تسجيل', badge: 'success' },
  'enrollment.rejected': { label: 'رفض طلب تسجيل', badge: 'danger' },

  // Scheduling
  'schedule_rule.create': { label: 'إنشاء جدول دوري', badge: 'success' },

  // Review queue (Operations Center)
  'review.start_review': { label: 'بدء مراجعة حصة', badge: 'purple' },
  'review.resolve': { label: 'اعتماد مراجعة حصة', badge: 'success' },
  'review.dismiss': { label: 'تجاهل تنبيه مراجعة', badge: 'gray' },
  'review.reopen': { label: 'إعادة فتح مراجعة', badge: 'warning' },

  // Articles CMS
  'article.create': { label: 'إنشاء مقال', badge: 'success' },
  'article.update': { label: 'تعديل مقال', badge: 'purple' },
  'article.publish': { label: 'نشر مقال', badge: 'success' },
  'article.unpublish': { label: 'إلغاء نشر مقال', badge: 'warning' },
  'article.duplicate': { label: 'نسخ مقال', badge: 'purple' },
  'article.delete': { label: 'حذف مقال', badge: 'danger' },
  'article.restore': { label: 'استعادة مقال', badge: 'success' },
}

const FIELD_LABELS_AR = {
  status: 'الحالة', notes: 'ملاحظات', payrollStatus: 'حالة الاستحقاق', payrollStatusReason: 'السبب',
  reason: 'السبب', outcome: 'النتيجة', reviewState: 'حالة المراجعة', note: 'ملاحظة',
  teacherId: 'المعلم', studentId: 'الطالب', packageId: 'الباقة', scheduledAt: 'الموعد',
  from: 'من', to: 'إلى', delayMinutes: 'دقائق التأخر', delayReasonCode: 'سبب التأخر',
  lateMinutes: 'دقائق التأخر', selfResolvedFromAutoFlag: 'تصحيح ذاتي لتنبيه تلقائي',
  finalize: 'اعتماد نهائي', sessionCount: 'عدد الحصص', title: 'العنوان',
}

function formatValue(v) {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'boolean') return v ? 'نعم' : 'لا'
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) return formatDateTimeAr(v)
  if (typeof v === 'object') return null // handled separately (before/after)
  return String(v)
}

// Renders a log entry's `changes` payload as a short human-readable line
// instead of raw JSON — the primary UX per docs/INTELLIGENT_ATTENDANCE_SYSTEM.md
// "Audit Intelligence". Falls back to a generic key:value join for any
// action shape not explicitly modeled below, so a newly added audit call
// site never regresses to a wall of JSON.
function summarizeChanges(log) {
  const c = log.changes
  if (!c || typeof c !== 'object') return null

  if (c.before && c.after) {
    const parts = []
    for (const key of Object.keys(c.after)) {
      if (c.before[key] !== c.after[key]) {
        parts.push(`${FIELD_LABELS_AR[key] || key}: ${formatValue(c.before[key]) ?? '—'} ← ${formatValue(c.after[key]) ?? '—'}`)
      }
    }
    return parts.length ? parts.join(' • ') : null
  }

  const parts = Object.entries(c)
    .filter(([, v]) => v !== undefined && typeof v !== 'object')
    .map(([k, v]) => `${FIELD_LABELS_AR[k] || k}: ${formatValue(v)}`)
  return parts.length ? parts.join(' • ') : null
}

export default function AdminAuditLogsPage() {
  const [page, setPage] = useState(1)
  const [entity, setEntity] = useState('')
  const [action, setAction] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'audit-logs', page, entity, action],
    queryFn: () => {
      const p = new URLSearchParams({ page, limit: 30 })
      if (entity) p.set('entity', entity)
      if (action) p.set('action', action)
      return api.get(`/admin/audit-logs?${p}`).then(r => r.data)
    },
    placeholderData: (prev) => prev,
  })

  const logs = data?.data || []

  return (
    <div dir="rtl">
      <PageHeader title="سجل الأنشطة" subtitle={`${data?.total || 0} حدث مسجل`}
        actions={<Shield size={16} className="text-violet-400" />} />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select value={entity} onChange={e => { setEntity(e.target.value); setPage(1) }} className="field-light h-9 text-sm px-3">
          <option value="">كل الكيانات</option>
          <option value="User">المستخدمون</option>
          <option value="Session">الحصص</option>
          <option value="Evaluation">التقييمات</option>
          <option value="Attendance">الحضور</option>
          <option value="Subscription">الاشتراكات</option>
          <option value="EnrollmentRequest">طلبات التسجيل</option>
          <option value="ScheduleRule">الجداول الدورية</option>
          <option value="Article">المقالات</option>
        </select>
        <select value={action} onChange={e => { setAction(e.target.value); setPage(1) }} className="field-light h-9 text-sm px-3">
          <option value="">كل الإجراءات</option>
          {Object.entries(ACTION_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner color="border-brand-purple" /></div>
      ) : (
        <>
          <div className="card-light overflow-hidden">
            {!logs.length ? (
              <div className="text-center py-12 text-[#9b7fd6]">
                <Shield size={36} className="mx-auto mb-3 opacity-40" />
                لا توجد أنشطة مسجلة
              </div>
            ) : (
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-[#f0ecf8]">
                    {['الوقت', 'المنفذ', 'الإجراء', 'التفاصيل', 'الكيان', 'IP'].map(h => (
                      <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-[#9b7fd6]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => {
                    const cfg = ACTION_LABELS[log.action] || { label: log.action, badge: 'gray' }
                    const summary = summarizeChanges(log)
                    return (
                      <tr key={log._id} className="border-b border-[#f8f5ff] hover:bg-[#faf9ff] align-top">
                        <td className="px-4 py-3 text-xs text-[#9b7fd6] whitespace-nowrap">{formatDateTimeAr(log.createdAt)}</td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-semibold text-brand-textBody">{log.actorId?.firstNameAr} {log.actorId?.lastNameAr}</div>
                          <div className="text-xs text-[#9b7fd6]">{log.actorRole}</div>
                        </td>
                        <td className="px-4 py-3"><Badge variant={cfg.badge}>{cfg.label}</Badge></td>
                        <td className="px-4 py-3 text-xs text-brand-textBody max-w-xs">{summary || '—'}</td>
                        <td className="px-4 py-3 text-sm text-[#9b7fd6]">{log.entity} {log.entityId ? `#${log.entityId.toString().slice(-6)}` : ''}</td>
                        <td className="px-4 py-3 text-xs text-[#9b7fd6] font-mono">{log.ip || '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
          {data?.totalPages > 1 && (
            <div className="mt-4 flex justify-center">
              <Pagination current={page} total={data.totalPages} onChange={setPage} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
