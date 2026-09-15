import { useState } from 'react'
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  ArrowRight, Star, CheckCircle, XCircle, Clock, Edit2, Trash2, ArrowLeftRight,
  Mail, Phone, Calendar, User, KeyRound, Power, PowerOff, LayoutGrid, Wallet, BookOpen,
  StickyNote, MessageCircle, Gift, RefreshCw, Eye, Sparkles, SlidersHorizontal,
  CalendarClock, ExternalLink, AlertTriangle, Plus,
} from 'lucide-react'
import api from '../../utils/api.js'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import ConfirmDialog from '../../components/shared/ConfirmDialog.jsx'
import WalletBalanceCard from '../../components/shared/WalletBalanceCard.jsx'
import LessonTransactionTable from '../../components/shared/LessonTransactionTable.jsx'
import StudentTransferModal from '../../components/admin/StudentTransferModal.jsx'
import DirectRenewalModal from '../../components/admin/DirectRenewalModal.jsx'
import WalletOperationsModal from '../../components/admin/WalletOperationsModal.jsx'
import QuranReportDetailModal from '../../components/admin/QuranReportDetailModal.jsx'
import EditScheduleRuleModal from '../../components/admin/EditScheduleRuleModal.jsx'
import { formatDateAr, formatDateTimeAr } from '../../utils/date.js'
import { ROUTES, getFileUrl, DAYS_OF_WEEK } from '../../config/constants.js'
import { quranReportService } from '../../services/quranReport.service.js'
import { renewalService } from '../../services/renewal.service.js'
import { transferService } from '../../services/transfer.service.js'
import { useAuthStore } from '../../store/authStore.js'

const inputCls = 'w-full h-10 bg-gray-50 border border-gray-200 rounded-xl px-3.5 text-sm text-gray-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all'
const labelCls = 'text-xs font-bold text-gray-500 mb-1 block'

const ACADEMIC_TAB_KEYS = ['sessions', 'evaluations', 'attendance', 'homework', 'memorization', 'revision', 'quranReports']
const ACADEMIC_TAB_LABELS = {
  sessions: 'الحصص', evaluations: 'التقييمات', attendance: 'الحضور', homework: 'الواجبات',
  memorization: 'الحفظ', revision: 'المراجعة', quranReports: 'تقارير الحلقات',
}

const SESSION_STATUS_CFG = {
  scheduled: { label: 'قادمة', badge: 'purple' },
  ongoing: { label: 'جارية', badge: 'purple' },
  completed: { label: 'مكتملة', badge: 'success' },
  cancelled: { label: 'ملغاة', badge: 'gray' },
  rescheduled: { label: 'أُجّلت', badge: 'warning' },
  missed: { label: 'فائتة', badge: 'danger' },
  no_show: { label: 'غياب', badge: 'danger' },
}
const ATT_CFG = {
  present: { label: 'حاضر', badge: 'success', Icon: CheckCircle },
  absent:  { label: 'غائب',  badge: 'danger',  Icon: XCircle },
  late:    { label: 'متأخر', badge: 'warning', Icon: Clock },
  excused: { label: 'معذور', badge: 'purple',  Icon: Clock },
}
const RENEWAL_STATUS_CFG = {
  pending: { label: 'بانتظار المراجعة', variant: 'warning' },
  under_review: { label: 'قيد المراجعة', variant: 'blue' },
  approved: { label: 'موافق عليه', variant: 'success' },
  rejected: { label: 'مرفوض', variant: 'danger' },
  cancelled: { label: 'ملغى', variant: 'gray' },
}
const TRANSFER_STATUS_CFG = {
  completed: { label: 'تم بنجاح', variant: 'success' },
  failed: { label: 'فشل', variant: 'danger' },
  rolled_back: { label: 'تم التراجع', variant: 'gray' },
}

const TOP_TABS = [
  { key: 'overview', label: 'نظرة عامة', Icon: LayoutGrid },
  { key: 'subscription', label: 'الاشتراك والمحفظة', Icon: Wallet },
  { key: 'academic', label: 'الأكاديمي', Icon: BookOpen },
  { key: 'transfers', label: 'النقل', Icon: ArrowLeftRight, permission: 'transfers.view' },
  { key: 'account', label: 'الحساب', Icon: User },
]

// ── Edit Evaluation / Attendance modals (unchanged) ──────────────────────────

function EditEvalModal({ ev, onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    score: ev.score || '', notesAr: ev.notesAr || '', type: ev.type || 'monthly',
    isSharedWithStudent: ev.isSharedWithStudent ?? true,
  })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const mut = useMutation({
    mutationFn: (data) => api.patch(`/admin/evaluations/${ev._id}`, data).then(r => r.data),
    onSuccess: () => { toast.success('تم تحديث التقييم'); qc.invalidateQueries({ queryKey: ['admin', 'student', 'academics'] }); onClose() },
    onError: (e) => toast.error(e?.response?.data?.message || 'خطأ'),
  })
  return (
    <Modal open onClose={onClose} title="تعديل التقييم" size="sm"
      footer={<><Button variant="ghost" onClick={onClose}>إلغاء</Button><Button variant="purple" onClick={() => mut.mutate(form)} loading={mut.isPending}>حفظ</Button></>}>
      <div className="space-y-4" dir="rtl">
        <div><label className={labelCls}>الدرجة (من 10)</label><input type="number" min="0" max="10" step="0.5" value={form.score} onChange={e => set('score', e.target.value)} className="field-light w-full" /></div>
        <div>
          <label className={labelCls}>النوع</label>
          <select value={form.type} onChange={e => set('type', e.target.value)} className="field-light w-full">
            <option value="monthly">شهري</option><option value="weekly">أسبوعي</option><option value="session">حصة</option><option value="final">نهائي</option>
          </select>
        </div>
        <div><label className={labelCls}>ملاحظات</label><textarea value={form.notesAr} onChange={e => set('notesAr', e.target.value)} className="field-light w-full h-20 resize-none" placeholder="ملاحظات التقييم..." /></div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.isSharedWithStudent} onChange={e => set('isSharedWithStudent', e.target.checked)} className="rounded" />
          <span className="text-sm text-gray-700">مشترك مع الطالب</span>
        </label>
      </div>
    </Modal>
  )
}

function EditAttModal({ att, onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ status: att.status, notes: att.notes || '' })
  const mut = useMutation({
    mutationFn: (data) => api.patch(`/admin/attendance/${att._id}`, data).then(r => r.data),
    onSuccess: () => { toast.success('تم تحديث الحضور'); qc.invalidateQueries({ queryKey: ['admin', 'student', 'academics'] }); onClose() },
    onError: (e) => toast.error(e?.response?.data?.message || 'خطأ'),
  })
  return (
    <Modal open onClose={onClose} title="تعديل سجل الحضور" size="sm"
      footer={<><Button variant="ghost" onClick={onClose}>إلغاء</Button><Button variant="purple" onClick={() => mut.mutate(form)} loading={mut.isPending}>حفظ</Button></>}>
      <div className="space-y-4" dir="rtl">
        <div>
          <label className={labelCls}>الحالة</label>
          <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="field-light w-full">
            <option value="present">حاضر</option><option value="absent">غائب</option><option value="late">متأخر</option><option value="excused">معذور</option>
          </select>
        </div>
        <div><label className={labelCls}>ملاحظات</label><input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="field-light w-full" placeholder="ملاحظات..." /></div>
      </div>
    </Modal>
  )
}

// ── Overview tab ─────────────────────────────────────────────────────────────

function InfoRow({ label, value, icon }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-none text-gray-500">{icon}</div>
      <div className="min-w-0"><div className="text-xs text-gray-500 mb-0.5">{label}</div><div className="text-sm font-semibold text-gray-800 break-words">{value}</div></div>
    </div>
  )
}

function formatTime12h(timeStr) {
  if (!timeStr) return ''
  const [hStr, mStr] = timeStr.split(':')
  let h = parseInt(hStr, 10)
  const m = mStr || '00'
  if (isNaN(h)) return timeStr
  const period = h >= 12 ? 'م' : 'ص'
  h = h % 12 || 12
  return `${h.toString().padStart(2, '0')}:${m} ${period}`
}

function OverviewTab({ student, assignedTeacher, subscription }) {
  const qc = useQueryClient()
  const [editingRule, setEditingRule] = useState(null)

  const { data: scheduleData, isLoading: scheduleLoading } = useQuery({
    queryKey: ['admin', 'student', 'schedule-rules', student._id],
    queryFn: () => api.get('/admin/schedule-rules', { params: { studentId: student._id, limit: 10 } }).then(r => r.data),
  })

  const rules = scheduleData?.data || []

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-900 mb-1">معلومات التواصل والحساب</h3>
          <InfoRow label="البريد الإلكتروني" value={student.email} icon={<Mail size={14} />} />
          <InfoRow label="رقم الهاتف" value={student.phone} icon={<Phone size={14} />} />
          <InfoRow label="نوع الطالب" value={student.studentType === 'new' ? 'طالب جديد' : 'طالب قديم'} icon={<User size={14} />} />
          <InfoRow label="تاريخ التسجيل" value={formatDateAr(student.createdAt)} icon={<Calendar size={14} />} />
          <InfoRow label="نبذة" value={student.bioAr} icon={<BookOpen size={14} />} />
          {student.notes && <InfoRow label="ملاحظات إدارية" value={student.notes} icon={<StickyNote size={14} />} />}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900">المعلم المسؤول</h3>
              {assignedTeacher && (
                <Link to={ROUTES.ADMIN_TEACHERS} className="text-xs text-violet-600 hover:text-violet-700 font-medium">
                  كل المعلمين ←
                </Link>
              )}
            </div>
            {assignedTeacher ? (
              <Link to={ROUTES.ADMIN_TEACHER_PROFILE.replace(':id', assignedTeacher._id)}
                className="flex items-center gap-3 rounded-xl border border-gray-100 p-3.5 hover:border-violet-300 hover:bg-violet-50/30 transition-colors">
                <Avatar src={getFileUrl(assignedTeacher.avatar)} firstName={assignedTeacher.firstNameAr} lastName={assignedTeacher.lastNameAr} size="md" />
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900 text-sm truncate">{assignedTeacher.firstNameAr} {assignedTeacher.lastNameAr}</div>
                  <div className="text-xs text-gray-500">عرض الملف الإداري الكامل ‹</div>
                </div>
              </Link>
            ) : (
              <div className="p-4 bg-gray-50 rounded-xl text-center text-sm text-gray-500">
                لا يوجد معلم مسؤول حاليًا
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>هل ترغب بنقل الطالب لمعلم آخر؟</span>
            <span className="text-violet-600 font-semibold">استخدم تبويب «النقل» أعلاه</span>
          </div>
        </div>
      </div>

      {/* Schedule Rules Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600">
              <CalendarClock size={18} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">الجدول والمواعيد الدورية للحصص</h3>
              <p className="text-xs text-gray-500 mt-0.5">مواعيد الحصص الأسبوعية الثابتة وإمكانية تعديل الأيام والتوقيت والمعلم مباشرة</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="purple"
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => setEditingRule({ isNew: true })}
            >
              إضافة جدول دوري
            </Button>
            <Link
              to={ROUTES.ADMIN_SCHEDULE_RULES}
              className="text-xs font-semibold text-violet-600 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              صفحة الجداول الدورية العامة ←
            </Link>
          </div>
        </div>

        {scheduleLoading ? (
          <div className="flex justify-center py-8"><Spinner color="border-violet-600" /></div>
        ) : !rules.length ? (
          <div className="text-center py-8 px-4 bg-gray-50/60 rounded-xl border border-dashed border-gray-200 space-y-3">
            <CalendarClock className="mx-auto text-gray-400" size={32} />
            <div>
              <p className="text-sm font-bold text-gray-800">لا يوجد جدول أسبوعي دوري مسجل لهذا الطالب حالياً</p>
              <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                يمكنك كإدارة تعيين وتفعيل جدول دوري فوري للطالب مع المعلم المسؤول وتحديد مواعيد الحصص والرابط وتوليد الحصص مباشرة.
              </p>
            </div>
            <Button
              variant="purple"
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => setEditingRule({ isNew: true })}
            >
              + تعيين جدول دوري لهذا الطالب
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rules.map((rule) => {
              const statusCfg = {
                active: { label: 'نشط ومستمر', badge: 'success' },
                paused: { label: 'موقوف مؤقتاً', badge: 'warning' },
                ended: { label: 'منتهٍ', badge: 'gray' },
              }[rule.status] || { label: rule.status, badge: 'gray' }

              const daysNames = rule.daysOfWeek?.map((d) => DAYS_OF_WEEK.find((x) => x.value === d)?.label || d) || []
              const ruleTeacher = rule.teacherId || assignedTeacher

              return (
                <div key={rule._id} className="rounded-xl border border-gray-100 p-4 bg-gray-50/40 hover:bg-white hover:border-violet-200 transition-all space-y-3.5 shadow-none hover:shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <Avatar src={getFileUrl(ruleTeacher?.avatar)} firstName={ruleTeacher?.firstNameAr} lastName={ruleTeacher?.lastNameAr} size="sm" />
                      <div>
                        <div className="text-xs text-gray-500">المعلم المخصص للجدول</div>
                        <div className="text-sm font-bold text-gray-800">
                          {ruleTeacher ? `${ruleTeacher.firstNameAr || ''} ${ruleTeacher.lastNameAr || ''}` : 'غير محدد'}
                        </div>
                      </div>
                    </div>
                    <Badge variant={statusCfg.badge}>{statusCfg.label}</Badge>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-gray-100 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 flex items-center gap-1.5"><Calendar size={13} className="text-violet-500" /> أيام الحصص:</span>
                      <div className="flex flex-wrap gap-1">
                        {daysNames.length ? daysNames.map((d, i) => (
                          <span key={i} className="bg-violet-50 text-violet-700 font-semibold px-2 py-0.5 rounded-md text-[11px]">
                            {d}
                          </span>
                        )) : <span className="text-gray-400">غير محدد</span>}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 flex items-center gap-1.5"><Clock size={13} className="text-violet-500" /> التوقيت والمدة:</span>
                      <span className="font-semibold text-gray-800" dir="ltr">
                        {rule.timeOfDay ? `${formatTime12h(rule.timeOfDay)} (${rule.timeOfDay})` : '—'} • {rule.durationMinutes || 60} دقيقة
                      </span>
                    </div>

                    {rule.frequency && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">التكرار:</span>
                        <span className="font-medium text-gray-700">
                          {rule.frequency === 'weekly' ? 'أسبوعياً' : rule.frequency === 'biweekly' ? 'كل أسبوعين' : 'شهرياً'}
                        </span>
                      </div>
                    )}

                    {rule.endDate && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">تاريخ الانتهاء:</span>
                        <span className="font-medium text-gray-700">{formatDateAr(rule.endDate)}</span>
                      </div>
                    )}

                    {rule.meetingLink && (
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-gray-500">رابط الحصة:</span>
                        <a href={rule.meetingLink} target="_blank" rel="noopener noreferrer"
                          className="text-violet-600 hover:underline flex items-center gap-1 max-w-[200px] truncate" dir="ltr">
                          <ExternalLink size={12} />
                          <span className="truncate">{rule.meetingLink}</span>
                        </a>
                      </div>
                    )}

                    {rule.notes && (
                      <div className="p-2 bg-amber-50/60 rounded-lg text-[11px] text-amber-800">
                        <span className="font-bold">ملاحظة: </span>{rule.notes}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Edit2 size={13} />}
                      onClick={() => setEditingRule(rule)}
                    >
                      تعديل الجدول الدوري
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {editingRule && (
        <EditScheduleRuleModal
          rule={editingRule.isNew ? null : editingRule}
          initialStudentId={student._id}
          initialTeacherId={assignedTeacher?._id || ''}
          initialSubscription={subscription}
          student={student}
          lockStudent={true}
          onClose={() => setEditingRule(null)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['admin', 'student', 'schedule-rules', student._id] })
            qc.invalidateQueries({ queryKey: ['admin', 'student', student._id] })
            qc.invalidateQueries({ queryKey: ['admin', 'student', student._id, 'wallet'] })
            qc.invalidateQueries({ queryKey: ['admin', 'student', 'academics'] })
          }}
        />
      )}
    </div>
  )
}

// ── Subscription & Wallet tab ────────────────────────────────────────────────

function SubscriptionWalletTab({ studentId, student, subscription, enrollmentRequests }) {
  const [walletOpsOpen, setWalletOpsOpen] = useState(false)
  const [renewalOpen, setRenewalOpen] = useState(false)
  const qc = useQueryClient()

  const { data: wallet } = useQuery({
    queryKey: ['admin', 'student', studentId, 'wallet'],
    queryFn: () => api.get(`/wallet/${studentId}`).then(r => r.data.data),
  })
  const { data: transactions } = useQuery({
    queryKey: ['admin', 'student', studentId, 'wallet-transactions'],
    queryFn: () => api.get(`/wallet/${studentId}/transactions`, { params: { limit: 30 } }).then(r => r.data.data?.transactions || []),
  })
  const { data: renewals } = useQuery({
    queryKey: ['admin', 'student', studentId, 'renewals'],
    queryFn: () => renewalService.getAllRequests({ studentId, limit: 10 }).then(r => r.data.data?.data || r.data.data),
  })

  return (
    <div className="space-y-5">
      {/* Action Toolbar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          <h3 className="font-heading font-bold text-gray-900 text-sm">التحكم المالي المباشر للاشتراك والمحفظة</h3>
          <p className="text-xs text-gray-500 mt-0.5">يمكنك إضافة حصص مكافأة، تعويضات، تعديل الرصيد، أو تجديد الاشتراك مباشرة</p>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            icon={<SlidersHorizontal size={14} />}
            onClick={() => setWalletOpsOpen(true)}
            className="flex-1 sm:flex-none"
          >
            إدارة رصيد ومكافآت المحفظة
          </Button>
          <Button
            variant="purple"
            size="sm"
            icon={<Sparkles size={14} />}
            onClick={() => setRenewalOpen(true)}
            className="flex-1 sm:flex-none"
          >
            تجديد اشتراك مباشر
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <WalletBalanceCard wallet={wallet} />
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-900 mb-3">الباقة الحالية</h3>
          {subscription ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">الباقة</span><span className="font-semibold text-gray-800">{subscription.packageId?.nameAr || '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">الحالة</span><Badge variant={subscription.status === 'active' ? 'success' : 'gray'}>{subscription.status === 'active' ? 'نشط' : subscription.status}</Badge></div>
              <div className="flex justify-between"><span className="text-gray-500">تاريخ الانتهاء</span><span className="font-semibold text-gray-800">{subscription.endDate ? formatDateAr(subscription.endDate) : '—'}</span></div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">لا يوجد اشتراك نشط حاليًا</p>
          )}
          {!!enrollmentRequests?.length && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <div className="text-xs font-bold text-gray-500 mb-2">آخر طلبات التسجيل</div>
              <div className="space-y-1.5">
                {enrollmentRequests.slice(0, 3).map((r) => (
                  <div key={r._id} className="flex items-center justify-between text-xs">
                    <span className="text-gray-700">{r.packageId?.nameAr || '—'}</span>
                    <span className="text-gray-500">{formatDateAr(r.createdAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-bold text-gray-900 mb-3">طلبات التجديد</h3>
        {!renewals?.length ? (
          <p className="text-sm text-gray-500">لا توجد طلبات تجديد بعد</p>
        ) : (
          <div className="space-y-2">
            {renewals.map((r) => (
              <div key={r._id} className="flex items-center justify-between gap-2 text-sm rounded-lg border border-gray-50 px-3 py-2">
                <span className="text-gray-700">{r.requestedPackageId?.nameAr || '—'}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{formatDateAr(r.createdAt)}</span>
                  <Badge variant={RENEWAL_STATUS_CFG[r.status]?.variant || 'gray'}>{RENEWAL_STATUS_CFG[r.status]?.label || r.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-bold text-gray-900 mb-3">حركات المحفظة</h3>
        <LessonTransactionTable transactions={transactions} />
      </div>

      {walletOpsOpen && (
        <WalletOperationsModal
          open={walletOpsOpen}
          onClose={() => setWalletOpsOpen(false)}
          studentId={studentId}
          studentName={student ? `${student.firstNameAr} ${student.lastNameAr}` : 'الطالب'}
          currentWallet={wallet}
        />
      )}

      {renewalOpen && (
        <DirectRenewalModal
          open={renewalOpen}
          onClose={() => setRenewalOpen(false)}
          initialStudent={student}
          initialSubscription={subscription}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['admin', 'student', studentId] })
          }}
        />
      )}
    </div>
  )
}

// ── Academic tab (existing sessions/evaluations/attendance/... content) ─────

function AcademicTab({ studentId, recentSessions, academics, academicsLoading }) {
  const [subTab, setSubTab] = useState('evaluations')
  const [editEv, setEditEv] = useState(null)
  const [editAtt, setEditAtt] = useState(null)
  const [selectedQuranReport, setSelectedQuranReport] = useState(null)
  const qc = useQueryClient()
  const deleteEvMut = useMutation({
    mutationFn: (evId) => api.delete(`/admin/evaluations/${evId}`),
    onSuccess: () => { toast.success('تم حذف التقييم'); qc.invalidateQueries({ queryKey: ['admin', 'student', 'academics'] }) },
    onError: () => toast.error('خطأ في الحذف'),
  })

  const evalList = academics?.evaluations || []
  const attList = academics?.attendance || []
  const hwList = academics?.homework || []
  const memList = academics?.memorization || []
  const revList = academics?.revision || []

  const { data: quranReportsData } = useQuery({
    queryKey: ['admin', 'student', studentId, 'quran-reports'],
    queryFn: () => quranReportService.getAllReports({ studentId, limit: 20 }).then(r => r.data.data),
    enabled: subTab === 'quranReports',
  })
  const quranReportsList = quranReportsData?.reports || []

  return (
    <div>
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit mb-5 overflow-x-auto max-w-full no-scrollbar">
        {ACADEMIC_TAB_KEYS.map(k => (
          <button key={k} onClick={() => setSubTab(k)}
            className={`px-4 py-1.5 rounded-[10px] text-sm font-semibold whitespace-nowrap transition-all ${subTab === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
            {ACADEMIC_TAB_LABELS[k]}
          </button>
        ))}
      </div>

      {academicsLoading ? (
        <div className="flex justify-center py-16"><Spinner color="border-brand-purple" /></div>
      ) : (
        <>
          {subTab === 'sessions' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {recentSessions.length === 0 ? <div className="text-center py-12 text-gray-500">لا توجد حصص مسجلة بعد</div> : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead><tr className="border-b border-gray-100">{['التاريخ', 'المعلم', 'الحالة', 'المدة'].map(h => <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-gray-500">{h}</th>)}</tr></thead>
                    <tbody>
                      {recentSessions.map(s => {
                        const cfg = SESSION_STATUS_CFG[s.status] || { label: s.status, badge: 'gray' }
                        return (
                          <tr key={s._id} className="border-b border-gray-50 hover:bg-gray-50/60">
                            <td className="px-4 py-3 text-sm text-gray-600">{formatDateTimeAr(s.scheduledAt)}</td>
                            <td className="px-4 py-3 text-sm text-gray-800">{s.teacherId?.firstNameAr} {s.teacherId?.lastNameAr}</td>
                            <td className="px-4 py-3"><Badge variant={cfg.badge}>{cfg.label}</Badge></td>
                            <td className="px-4 py-3 text-sm text-gray-600">{s.durationMinutes || 60} دقيقة</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {subTab === 'evaluations' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {evalList.length === 0 ? <div className="text-center py-12 text-gray-500">لا توجد تقييمات</div> : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead><tr className="border-b border-gray-100">{['التاريخ', 'المعلم', 'النوع', 'الدرجة', 'ملاحظات', ''].map(h => <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-gray-500">{h}</th>)}</tr></thead>
                    <tbody>
                      {evalList.map(ev => (
                        <tr key={ev._id} className="border-b border-gray-50 hover:bg-gray-50/60">
                          <td className="px-4 py-3 text-sm text-gray-600">{formatDateAr(ev.createdAt)}</td>
                          <td className="px-4 py-3 text-sm text-gray-800">{ev.teacherId?.firstNameAr} {ev.teacherId?.lastNameAr}</td>
                          <td className="px-4 py-3"><Badge variant="purple">{ev.type === 'monthly' ? 'شهري' : ev.type === 'weekly' ? 'أسبوعي' : ev.type === 'session' ? 'حصة' : 'نهائي'}</Badge></td>
                          <td className="px-4 py-3"><span className="flex items-center gap-1 text-sm font-bold text-amber-600"><Star size={13} fill="currentColor" /> {ev.score ?? '—'}</span></td>
                          <td className="px-4 py-3 text-sm text-gray-600 max-w-[180px] truncate">{ev.notesAr || '—'}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <button onClick={() => setEditEv(ev)} className="p-1.5 text-violet-500 hover:bg-violet-50 rounded-lg"><Edit2 size={12} /></button>
                              <button onClick={() => { if (window.confirm('حذف التقييم؟')) deleteEvMut.mutate(ev._id) }} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={12} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {subTab === 'attendance' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {attList.length === 0 ? <div className="text-center py-12 text-gray-500">لا توجد سجلات حضور</div> : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead><tr className="border-b border-gray-100">{['التاريخ', 'الحصة', 'الحالة', 'ملاحظات', ''].map(h => <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-gray-500">{h}</th>)}</tr></thead>
                    <tbody>
                      {attList.map(att => {
                        const cfg = ATT_CFG[att.status] || { label: att.status, badge: 'gray' }
                        return (
                          <tr key={att._id} className="border-b border-gray-50 hover:bg-gray-50/60">
                            <td className="px-4 py-3 text-sm text-gray-600">{formatDateAr(att.createdAt)}</td>
                            <td className="px-4 py-3 text-sm text-gray-800">{att.sessionId?.titleAr || '—'}</td>
                            <td className="px-4 py-3"><Badge variant={cfg.badge}>{cfg.label}</Badge></td>
                            <td className="px-4 py-3 text-sm text-gray-600">{att.notes || '—'}</td>
                            <td className="px-4 py-3"><button onClick={() => setEditAtt(att)} className="p-1.5 text-violet-500 hover:bg-violet-50 rounded-lg"><Edit2 size={12} /></button></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {subTab === 'homework' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {hwList.length === 0 ? <div className="text-center py-12 text-gray-500">لا توجد واجبات</div> : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead><tr className="border-b border-gray-100">{['الواجب', 'الاستحقاق', 'الحالة', 'التسليم'].map(h => <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-gray-500">{h}</th>)}</tr></thead>
                    <tbody>
                      {hwList.map(hw => {
                        const mySub = hw.submissions?.find(s => s.studentId?.toString() === studentId || s.content)
                        return (
                          <tr key={hw._id} className="border-b border-gray-50 hover:bg-gray-50/60">
                            <td className="px-4 py-3 text-sm font-semibold text-gray-800">{hw.titleAr}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{formatDateAr(hw.dueDate)}</td>
                            <td className="px-4 py-3"><Badge variant={hw.status === 'active' ? 'success' : 'gray'}>{hw.status === 'active' ? 'نشط' : 'مكتمل'}</Badge></td>
                            <td className="px-4 py-3">
                              {mySub ? <span className="text-xs text-emerald-600 font-semibold">سُلِّم {mySub.grade !== undefined ? `· درجة: ${mySub.grade}` : ''}</span>
                                : <span className="text-xs text-amber-600 font-semibold">لم يُسلَّم</span>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {subTab === 'memorization' && (
            <div className="space-y-3">
              {memList.length === 0 ? <div className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-12 text-gray-500">لا توجد سجلات حفظ</div>
                : memList.map(m => (
                  <div key={m._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex justify-between items-center gap-3">
                    <div>
                      <div className="font-semibold text-gray-800">{m.surahName || m.surahNumber}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{m.ayahFrom && m.ayahTo ? `آية ${m.ayahFrom} – ${m.ayahTo}` : ''}{m.pages ? ` · ${m.pages} صفحة` : ''}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      {m.grade && <span className="flex items-center gap-1 text-sm font-bold text-amber-600"><Star size={12} fill="currentColor" />{m.grade}</span>}
                      <span className="text-xs text-gray-500">{formatDateAr(m.createdAt)}</span>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {subTab === 'revision' && (
            <div className="space-y-3">
              {revList.length === 0 ? <div className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-12 text-gray-500">لا توجد سجلات مراجعة</div>
                : revList.map(r => (
                  <div key={r._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex justify-between items-center gap-3">
                    <div><div className="font-semibold text-gray-800">{r.surahName || r.surahNumber}</div><div className="text-xs text-gray-500 mt-0.5">{r.notes || ''}</div></div>
                    <div className="flex items-center gap-3">
                      {r.grade && <span className="flex items-center gap-1 text-sm font-bold text-amber-600"><Star size={12} fill="currentColor" />{r.grade}</span>}
                      <span className="text-xs text-gray-500">{formatDateAr(r.createdAt)}</span>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {subTab === 'quranReports' && (
            <div className="space-y-3">
              {quranReportsList.length === 0 ? <div className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-12 text-gray-500">لا توجد تقارير حلقات بعد</div>
                : quranReportsList.map((r) => (
                  <div key={r._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:shadow-md transition-shadow">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-gray-900 text-sm">معلم: {r.teacherId?.firstNameAr} {r.teacherId?.lastNameAr}</span>
                        <span className="text-xs text-gray-400">· {formatDateAr(r.sessionId?.scheduledAt || r.createdAt)}</span>
                      </div>
                      {r.tajweedNotes && <div className="text-xs text-gray-600 truncate max-w-md">{r.tajweedNotes}</div>}
                    </div>
                    <div className="flex items-center gap-2 flex-none">
                      <Badge variant={r.status === 'approved' ? 'success' : r.status === 'submitted' ? 'warning' : 'gray'}>
                        {r.status === 'approved' ? 'معتمد' : r.status === 'submitted' ? 'بانتظار المراجعة' : r.status}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        icon={<Eye size={13} />}
                        onClick={() => setSelectedQuranReport(r)}
                      >
                        عرض التفاصيل
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </>
      )}

      {editEv && <EditEvalModal ev={editEv} onClose={() => setEditEv(null)} />}
      {editAtt && <EditAttModal att={editAtt} onClose={() => setEditAtt(null)} />}
      {selectedQuranReport && (
        <QuranReportDetailModal
          open={!!selectedQuranReport}
          onClose={() => setSelectedQuranReport(null)}
          report={selectedQuranReport}
        />
      )}
    </div>
  )
}

// ── Transfers tab ────────────────────────────────────────────────────────────

function TransfersTab({ studentId, canTransfer, subscriptionActive, onOpenTransfer }) {
  const { data: transfers, isLoading } = useQuery({
    queryKey: ['admin', 'student', studentId, 'transfer-history'],
    queryFn: () => transferService.getStudentTransferHistory(studentId).then(r => r.data.data),
  })

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900">سجل نقل الطالب بين المعلمين</h3>
        {canTransfer && subscriptionActive && (
          <Button variant="outline" size="sm" icon={<ArrowLeftRight size={13} />} onClick={onOpenTransfer}>نقل إلى معلم آخر</Button>
        )}
      </div>
      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner color="border-violet-600" /></div>
      ) : !transfers?.length ? (
        <p className="text-sm text-gray-500 py-6 text-center">لم يُنقل هذا الطالب بين معلمين من قبل</p>
      ) : (
        <div className="space-y-2">
          {transfers.map((t) => (
            <div key={t._id} className="rounded-xl border border-gray-100 p-3.5 text-sm">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-semibold text-gray-800">
                  {t.oldTeacherId?.firstNameAr} {t.oldTeacherId?.lastNameAr} ← {t.newTeacherId?.firstNameAr} {t.newTeacherId?.lastNameAr}
                </span>
                <Badge variant={TRANSFER_STATUS_CFG[t.status]?.variant || 'gray'}>{TRANSFER_STATUS_CFG[t.status]?.label || t.status}</Badge>
              </div>
              <p className="text-xs text-gray-500 mt-1">{t.reason}</p>
              <p className="text-[11px] text-gray-500 mt-1">{formatDateAr(t.effectiveDate || t.createdAt)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Account tab (edit / reset password / activate-deactivate — absorbed
//    from the old student-list drawer, the only place these used to live) ──

function AccountTab({ student, onUpdate }) {
  const qc = useQueryClient()
  const [confirmDeactivate, setConfirmDeactivate] = useState(false)
  const [form, setForm] = useState(() => ({
    firstNameAr: student.firstNameAr || '', lastNameAr: student.lastNameAr || '',
    email: student.email || '', phone: student.phone || '', bioAr: student.bioAr || '',
    notes: student.notes || '', studentType: student.studentType || 'existing',
  }))
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))
  const [pw, setPw] = useState('')

  const updateMut = useMutation({
    mutationFn: (data) => api.patch(`/admin/students/${student._id}`, data).then((r) => r.data),
    onSuccess: (res) => { toast.success('تم تحديث بيانات الطالب'); qc.invalidateQueries({ queryKey: ['admin', 'student', student._id] }); qc.invalidateQueries({ queryKey: ['admin', 'students'] }); onUpdate(res.data) },
    onError: (err) => toast.error(err?.response?.data?.message || 'حدث خطأ'),
  })
  const toggleMut = useMutation({
    mutationFn: (isActive) => api.patch(`/admin/students/${student._id}`, { isActive }).then((r) => r.data),
    onSuccess: (res) => { toast.success(res.data?.isActive ? 'تم تفعيل الحساب' : 'تم إيقاف الحساب'); qc.invalidateQueries({ queryKey: ['admin', 'student', student._id] }); qc.invalidateQueries({ queryKey: ['admin', 'students'] }); onUpdate(res.data) },
    onError: () => toast.error('حدث خطأ'),
  })
  const resetPwMut = useMutation({
    mutationFn: () => api.post(`/admin/students/${student._id}/reset-password`, { newPassword: pw }).then((r) => r.data),
    onSuccess: () => { toast.success('تم إعادة تعيين كلمة المرور'); setPw('') },
    onError: (err) => toast.error(err?.response?.data?.message || 'حدث خطأ'),
  })

  const [confirmDelete, setConfirmDelete] = useState(false)
  const navigate = useNavigate()

  const deleteMut = useMutation({
    mutationFn: () => api.delete(`/admin/students/${student._id}/permanent`).then((r) => r.data),
    onSuccess: () => {
      toast.success('تم حذف حساب الطالب واشتراكاته ومحفظته نهائيًا')
      qc.invalidateQueries({ queryKey: ['admin', 'students'] })
      navigate(ROUTES.ADMIN_STUDENTS)
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'حدث خطأ أثناء حذف الطالب'),
  })

  function requestToggle() {
    if (student.isActive) setConfirmDeactivate(true)
    else toggleMut.mutate(true)
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <h3 className="font-bold text-gray-900 mb-1">تعديل بيانات الطالب</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>الاسم الأول</label><input className={inputCls} value={form.firstNameAr} onChange={(e) => set('firstNameAr', e.target.value)} /></div>
            <div><label className={labelCls}>الاسم الأخير</label><input className={inputCls} value={form.lastNameAr} onChange={(e) => set('lastNameAr', e.target.value)} /></div>
          </div>
          <div><label className={labelCls}>البريد الإلكتروني</label><input type="email" dir="ltr" className={inputCls} value={form.email} onChange={(e) => set('email', e.target.value)} /></div>
          <div><label className={labelCls}>رقم الهاتف</label><input dir="ltr" className={inputCls} value={form.phone} onChange={(e) => set('phone', e.target.value)} /></div>
          <div>
            <label className={labelCls}>نوع الطالب</label>
            <div className="grid grid-cols-2 gap-2">
              {[['existing', 'قديم'], ['new', 'جديد']].map(([v, l]) => (
                <button key={v} type="button" onClick={() => set('studentType', v)}
                  className={`h-10 rounded-xl text-sm font-bold border transition-colors ${form.studentType === v ? 'bg-violet-600 border-violet-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>{l}</button>
              ))}
            </div>
          </div>
          <div><label className={labelCls}>نبذة</label><textarea className={`${inputCls} h-16 resize-none py-2`} value={form.bioAr} onChange={(e) => set('bioAr', e.target.value)} /></div>
          <div>
            <label className={labelCls}>ملاحظات إدارية (داخلية)</label>
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
            <p className="text-xs text-gray-500">أدخل كلمة مرور جديدة للطالب — سيُطلب منه تسجيل الدخول بها.</p>
            <input type="password" className={inputCls} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="كلمة مرور جديدة (8 أحرف على الأقل)" dir="ltr" />
            <button onClick={() => resetPwMut.mutate()} disabled={pw.length < 8 || resetPwMut.isPending}
              className="w-full h-10 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
              {resetPwMut.isPending && <Spinner size="sm" color="border-white" />} تعيين كلمة المرور
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <h3 className="font-bold text-gray-900">حالة الحساب</h3>
            <p className="text-xs text-gray-500">{student.isActive ? 'الحساب نشط حاليًا ويستطيع الطالب تسجيل الدخول.' : 'الحساب موقوف حاليًا — لا يستطيع الطالب تسجيل الدخول.'}</p>
            <button onClick={requestToggle} disabled={toggleMut.isPending}
              className={`w-full h-11 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60 ${student.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
              {toggleMut.isPending ? <Spinner size="sm" color={student.isActive ? 'border-red-500' : 'border-emerald-600'} /> : (student.isActive ? <PowerOff size={15} /> : <Power size={15} />)}
              {student.isActive ? 'إيقاف حساب الطالب' : 'تفعيل حساب الطالب'}
            </button>
          </div>

          {/* Danger Zone: Permanent Delete */}
          <div className="bg-red-50/40 rounded-2xl border border-red-200 p-5 space-y-3">
            <h3 className="font-bold text-red-900 flex items-center gap-1.5">
              <AlertTriangle size={16} className="text-red-600" /> منطقة الخطر: الحذف النهائي للطالب
            </h3>
            <p className="text-xs text-red-700 leading-relaxed">
              حذف حساب الطالب واشتراكاته ومحفظته وحصصه غير المكتملة نهائيًا من قاعدة البيانات. لا يمكن التراجع عن هذا الإجراء.
            </p>
            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={deleteMut.isPending}
                className="px-5 h-10 rounded-xl font-bold text-xs bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm"
              >
                {deleteMut.isPending ? <Spinner size="sm" color="border-white" /> : <Trash2 size={14} />}
                حذف الطالب وسجلاته ومحفظته نهائيًا
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDeactivate} onClose={() => setConfirmDeactivate(false)}
        onConfirm={() => { toggleMut.mutate(false); setConfirmDeactivate(false) }}
        title="إيقاف حساب الطالب"
        message={`سيتم إيقاف حساب "${student.firstNameAr} ${student.lastNameAr}" فوراً ولن يتمكن من تسجيل الدخول حتى يُعاد تفعيله. هل تريد المتابعة؟`}
        confirmLabel="إيقاف الحساب" variant="danger"
      />

      <ConfirmDialog
        open={confirmDelete} onClose={() => setConfirmDelete(false)}
        onConfirm={() => { deleteMut.mutate(); setConfirmDelete(false) }}
        title="تأكيد الحذف النهائي للطالب"
        message={`هل أنت متأكد من رغبتك في حذف الطالب "${student.firstNameAr} ${student.lastNameAr}" نهائيًا؟ سيتم مسح حسابه واشتراكاته ومحفظته وسجلاته فوراً.`}
        confirmLabel="نعم، احذف الطالب نهائيًا" variant="danger"
      />
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function AdminStudentDetailPage() {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [transferOpen, setTransferOpen] = useState(false)
  const { hasPermission } = useAuthStore()
  const qc = useQueryClient()

  const { data: studentData, isLoading: loadStudent } = useQuery({
    queryKey: ['admin', 'student', id],
    queryFn: () => api.get(`/admin/students/${id}`).then(r => r.data.data),
  })
  const student = studentData?.student || studentData

  const { data: academics, isLoading: loadAcademics } = useQuery({
    queryKey: ['admin', 'student', 'academics', id],
    queryFn: () => api.get(`/admin/students/${id}/academics`).then(r => r.data.data),
  })

  const tab = TOP_TABS.some((t) => t.key === searchParams.get('tab')) ? searchParams.get('tab') : 'overview'
  function setTab(key) {
    const next = new URLSearchParams(searchParams)
    if (key === 'overview') next.delete('tab')
    else next.set('tab', key)
    setSearchParams(next)
  }

  if (loadStudent) return <div className="flex justify-center pt-20"><Spinner color="border-brand-purple" /></div>
  if (!student) return <div className="text-center pt-20 text-gray-500">الطالب غير موجود</div>

  const sub = studentData?.subscription
  const wallet = studentData?.wallet
  const recentSessions = studentData?.recentSessions || []
  const enrollmentRequests = studentData?.enrollmentRequests || []
  const assignedTeacher = sub?.teacherId
  const evalList = academics?.evaluations || []
  const attList = academics?.attendance || []
  const avgScore = evalList.length ? (evalList.reduce((a, e) => a + (e.score || 0), 0) / evalList.length).toFixed(1) : null
  const attRate = attList.length ? Math.round((attList.filter(a => a.status === 'present').length / attList.length) * 100) : null

  function handleUpdate(updated) {
    if (!updated) return
    qc.setQueryData(['admin', 'student', id], (old) => old ? { ...old, student: { ...(old.student || old), ...updated } } : old)
  }

  return (
    <div dir="rtl" className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-start gap-3 mb-4">
          <Link to={ROUTES.ADMIN_STUDENTS} className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors flex-none">
            <ArrowRight size={18} />
          </Link>
          <Avatar src={getFileUrl(student.avatar)} firstName={student.firstNameAr} lastName={student.lastNameAr} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-heading font-extrabold text-xl sm:text-2xl text-gray-900 truncate">{student.firstNameAr} {student.lastNameAr}</h1>
              <Badge variant={student.isActive ? 'success' : 'gray'}>{student.isActive ? 'نشط' : 'موقوف'}</Badge>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${student.studentType === 'new' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                {student.studentType === 'new' ? 'طالب جديد' : 'طالب قديم'}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">{student.email}{student.phone ? ` · ${student.phone}` : ''}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 max-w-xl">
              {[
                { label: 'متوسط التقييم', value: avgScore ? `${avgScore}/10` : '—' },
                { label: 'نسبة الحضور', value: attRate != null ? `${attRate}%` : '—' },
                { label: 'الحصص المتبقية', value: wallet?.remaining !== undefined ? `${wallet.remaining}` : (sub ? `${sub.sessionsRemaining ?? '—'}` : '—') },
                { label: 'الباقة', value: sub?.packageId?.nameAr || 'بلا اشتراك' },
              ].map((s) => (
                <div key={s.label} className="bg-gray-50 rounded-xl p-2.5">
                  <div className="font-bold text-sm text-gray-900 truncate">{s.value}</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="hidden sm:flex flex-col gap-2 flex-none">
            {student.email && (
              <button onClick={() => window.open(`mailto:${student.email}`)} title="مراسلة" className="w-9 h-9 rounded-xl flex items-center justify-center bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors"><Mail size={15} /></button>
            )}
            {student.phone && (
              <button onClick={() => window.open(`https://wa.me/${student.phone}`)} title="واتساب" className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"><MessageCircle size={15} /></button>
            )}
          </div>
        </div>

        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl overflow-x-auto no-scrollbar">
          {TOP_TABS.filter((t) => !t.permission || hasPermission(t.permission)).map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-sm font-bold whitespace-nowrap transition-all ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
              <t.Icon size={14} /> {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'overview' && <OverviewTab student={student} assignedTeacher={assignedTeacher} subscription={sub} />}
      {tab === 'subscription' && <SubscriptionWalletTab studentId={id} student={student} subscription={sub} enrollmentRequests={enrollmentRequests} />}
      {tab === 'academic' && <AcademicTab studentId={id} recentSessions={recentSessions} academics={academics} academicsLoading={loadAcademics} />}
      {tab === 'transfers' && hasPermission('transfers.view') && (
        <TransfersTab studentId={id} canTransfer={hasPermission('transfers.execute')} subscriptionActive={sub?.status === 'active'} onOpenTransfer={() => setTransferOpen(true)} />
      )}
      {tab === 'account' && <AccountTab student={student} onUpdate={handleUpdate} />}

      {transferOpen && (
        <StudentTransferModal
          studentId={id}
          currentTeacherName={assignedTeacher ? `${assignedTeacher.firstNameAr} ${assignedTeacher.lastNameAr}` : undefined}
          onClose={() => setTransferOpen(false)}
          onSuccess={() => { qc.invalidateQueries({ queryKey: ['admin', 'student', id] }); qc.invalidateQueries({ queryKey: ['admin', 'student', id, 'transfer-history'] }) }}
        />
      )}
    </div>
  )
}
