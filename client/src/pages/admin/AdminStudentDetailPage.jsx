import { useState } from 'react'
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  ArrowRight, Star, CheckCircle, XCircle, Clock, Edit2, Trash2, ArrowLeftRight,
  Mail, Phone, Calendar, User, KeyRound, Power, PowerOff, LayoutGrid, Wallet, BookOpen,
  StickyNote, MessageCircle, Gift, RefreshCw, Eye, SlidersHorizontal,
  CalendarClock, ExternalLink, AlertTriangle, Plus, Search, X, Compass, CheckCircle2,
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

const ACADEMIC_TAB_KEYS = ['quranReports', 'evaluations']
const ACADEMIC_TAB_LABELS = {
  quranReports: 'سجل تقارير الحلقات المدمج (الحصص والحضور والواجبات والإنجاز)',
  evaluations: 'التقييمات والاختبارات الدورية',
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

function SubscriptionWalletTab({ studentId, student, subscription, enrollmentRequests, assignedTeacher }) {
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
            icon={<RefreshCw size={14} />}
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
          assignedTeacher={assignedTeacher || subscription?.teacherId}
          subscription={subscription}
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
  const [subTab, setSubTab] = useState('quranReports')
  const [reportFilter, setReportFilter] = useState('all') // 'all' | 'approved' | 'submitted' | 'missing' | 'scheduled'
  const [searchQuery, setSearchQuery] = useState('')
  const [editEv, setEditEv] = useState(null)
  const [editAtt, setEditAtt] = useState(null)
  const [selectedQuranReport, setSelectedQuranReport] = useState(null)
  const qc = useQueryClient()

  const deleteEvMut = useMutation({
    mutationFn: (evId) => api.delete(`/admin/evaluations/${evId}`),
    onSuccess: () => {
      toast.success('تم حذف التقييم')
      qc.invalidateQueries({ queryKey: ['admin', 'student', 'academics'] })
    },
    onError: () => toast.error('خطأ في الحذف'),
  })

  const evalList = academics?.evaluations || []
  const rawConsolidated = academics?.consolidatedSessions || []

  // Combine consolidated sessions with any standalone Quran reports
  const sessionReportIds = new Set(rawConsolidated.map(s => s.report?._id?.toString()).filter(Boolean))
  const standaloneReports = (academics?.quranReports || [])
    .filter(r => r?._id && !sessionReportIds.has(r._id?.toString()))
    .map(r => ({
      _id: `rep-${r._id}`,
      scheduledAt: r.sessionId?.scheduledAt || r.createdAt,
      durationMinutes: r.sessionId?.durationMinutes || 60,
      status: 'completed',
      teacherId: r.teacherId,
      attendance: null,
      report: r,
    }))

  const allConsolidated = [...rawConsolidated, ...standaloneReports].sort((a, b) => {
    return new Date(b.scheduledAt || 0) - new Date(a.scheduledAt || 0)
  })

  // Filter options
  const filterCounts = {
    all: allConsolidated.length,
    approved: allConsolidated.filter(s => s.report?.status === 'approved').length,
    submitted: allConsolidated.filter(s => s.report?.status === 'submitted').length,
    missing: allConsolidated.filter(s => s.status === 'completed' && !s.report).length,
    scheduled: allConsolidated.filter(s => s.status === 'scheduled').length,
  }

  const filteredList = allConsolidated.filter(s => {
    if (reportFilter === 'approved' && s.report?.status !== 'approved') return false
    if (reportFilter === 'submitted' && s.report?.status !== 'submitted') return false
    if (reportFilter === 'missing' && !(s.status === 'completed' && !s.report)) return false
    if (reportFilter === 'scheduled' && s.status !== 'scheduled') return false

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      const tName = `${s.teacherId?.firstNameAr || ''} ${s.teacherId?.lastNameAr || ''}`.toLowerCase()
      const rec = (s.report?.todayRecitation || '').toLowerCase()
      const rev = (s.report?.todayRevision || '').toLowerCase()
      const nextR = (s.report?.nextRecitation || '').toLowerCase()
      const notes = (s.report?.parentNotes || '').toLowerCase()
      return tName.includes(q) || rec.includes(q) || rev.includes(q) || nextR.includes(q) || notes.includes(q)
    }
    return true
  })

  const RATING_STYLE = {
    'ممتاز': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'جيد جدًا': 'bg-blue-50 text-blue-700 border-blue-200',
    'جيد': 'bg-amber-50 text-amber-700 border-amber-200',
    'يحتاج متابعة': 'bg-rose-50 text-rose-700 border-rose-200',
  }

  return (
    <div className="space-y-5">
      {/* Sub Tabs Selector */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit overflow-x-auto max-w-full no-scrollbar">
        {ACADEMIC_TAB_KEYS.map(k => (
          <button
            key={k}
            onClick={() => setSubTab(k)}
            className={`px-4 py-2 rounded-[10px] text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
              subTab === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {ACADEMIC_TAB_LABELS[k]}
          </button>
        ))}
      </div>

      {academicsLoading ? (
        <div className="flex justify-center py-16"><Spinner color="border-brand-purple" /></div>
      ) : (
        <>
          {/* SubTab 1: Consolidated Quran Sessions & Reports Feed */}
          {subTab === 'quranReports' && (
            <div className="space-y-4">
              {/* Search & Filter Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Filter Chips */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                  {[
                    { key: 'all', label: 'الكل', count: filterCounts.all },
                    { key: 'approved', label: 'معتمد ✓', count: filterCounts.approved, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
                    { key: 'submitted', label: 'بانتظار المراجعة', count: filterCounts.submitted, color: 'text-amber-700 bg-amber-50 border-amber-200' },
                    { key: 'missing', label: 'لم يُرسل التقرير ⚠️', count: filterCounts.missing, color: 'text-rose-700 bg-rose-50 border-rose-200' },
                    { key: 'scheduled', label: 'الحصص القادمة', count: filterCounts.scheduled, color: 'text-violet-700 bg-violet-50 border-violet-200' },
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setReportFilter(tab.key)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 whitespace-nowrap ${
                        reportFilter === tab.key
                          ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[11px] font-mono ${
                        reportFilter === tab.key ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Instant Search Bar */}
                <div className="relative w-full sm:w-64 flex-none">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث بالمعلم، السورة، الملاحظات..."
                    className="w-full h-9 bg-white border border-gray-200 rounded-xl ps-8 pe-8 text-xs text-gray-800 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 transition-all placeholder:text-gray-400"
                  />
                  <Search size={14} className="text-gray-400 absolute start-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute end-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      title="مسح البحث"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Feed of Sessions & Reports */}
              {filteredList.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-400 mx-auto flex items-center justify-center mb-3">
                    <BookOpen size={24} />
                  </div>
                  <h4 className="font-bold text-gray-800 text-sm mb-1">لا توجد حصص أو تقارير مطابقة</h4>
                  <p className="text-xs text-gray-400">لم يتم العثور على سجلات في هذا التصنيف حالياً</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredList.map((s) => {
                    const sessionCfg = SESSION_STATUS_CFG[s.status] || { label: s.status, badge: 'gray' }
                    const rep = s.report
                    const att = s.attendance
                    const teacherName = s.teacherId ? `${s.teacherId.firstNameAr || ''} ${s.teacherId.lastNameAr || ''}`.trim() : 'غير محدد'

                    return (
                      <div
                        key={s._id}
                        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-gray-200 transition-all space-y-4"
                      >
                        {/* Header: Date, Teacher, Badges */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-50">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-violet-50 text-brand-purple flex items-center justify-center flex-shrink-0 font-bold">
                              <CalendarClock size={20} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-900 text-sm">
                                  {formatDateTimeAr(s.scheduledAt)}
                                </span>
                                <span className="text-xs text-gray-400 font-mono">
                                  ({s.durationMinutes || 60} دقيقة)
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                                <User size={12} className="text-gray-400" />
                                <span>المعلم: <strong className="text-gray-700">{teacherName}</strong></span>
                              </div>
                            </div>
                          </div>

                          {/* Status and Badges Cluster */}
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Attendance Badge */}
                            {att ? (
                              <div className="flex items-center gap-1 bg-gray-50 border border-gray-200/80 rounded-lg px-2.5 py-1">
                                <span className="text-xs font-semibold text-gray-600">
                                  الحضور: {ATT_CFG[att.status]?.label || att.status}
                                </span>
                                <button
                                  onClick={() => setEditAtt(att)}
                                  className="text-gray-400 hover:text-violet-600 p-0.5 rounded transition-colors"
                                  title="تعديل سجل الحضور"
                                >
                                  <Edit2 size={12} />
                                </button>
                              </div>
                            ) : s.status === 'completed' ? (
                              <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                                الحضور: لم يُسجل
                              </span>
                            ) : null}

                            {/* Session Lifecycle Badge */}
                            <Badge variant={sessionCfg.badge}>
                              {sessionCfg.label}
                            </Badge>

                            {/* Report Status Badge */}
                            {rep ? (
                              <Badge
                                variant={
                                  rep.status === 'approved'
                                    ? 'success'
                                    : rep.status === 'submitted'
                                    ? 'warning'
                                    : rep.status === 'correction_requested'
                                    ? 'danger'
                                    : 'gray'
                                }
                              >
                                {rep.status === 'approved'
                                  ? 'تقرير معتمد ✓'
                                  : rep.status === 'submitted'
                                  ? 'تقرير بانتظار المراجعة'
                                  : rep.status === 'correction_requested'
                                  ? 'مطلوب تصحيح'
                                  : 'مسودة تقرير'}
                              </Badge>
                            ) : s.status === 'completed' ? (
                              <Badge variant="danger">
                                ⚠️ لم يُرسل التقرير بعد
                              </Badge>
                            ) : null}

                            {/* View / Review Full Report Button */}
                            {rep && (
                              <Button
                                size="sm"
                                variant="outline"
                                icon={<Eye size={13} />}
                                onClick={() => setSelectedQuranReport(rep)}
                              >
                                معاينة واعتماد
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Card Body: Standard 4 Sections when report exists */}
                        {rep ? (
                          <div className="space-y-4 pt-1">
                            {/* Grid: 2 Columns for Accomplishment and Next Session */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Section 1: Today Accomplishments */}
                              <div className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-3.5 space-y-2.5">
                                <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                                  <BookOpen size={14} className="text-emerald-600" />
                                  <span>أولًا: إنجاز حلقة اليوم</span>
                                </div>
                                <div>
                                  <span className="text-[11px] font-bold text-gray-500 block mb-0.5">ما تم تسميعه:</span>
                                  <p className="text-xs text-gray-800 bg-white/80 rounded-lg p-2.5 border border-emerald-100 leading-relaxed">
                                    {rep.todayRecitation || '—'}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-[11px] font-bold text-gray-500 block mb-0.5">ما تم مراجعته:</span>
                                  <p className="text-xs text-gray-800 bg-white/80 rounded-lg p-2.5 border border-emerald-100 leading-relaxed">
                                    {rep.todayRevision || '—'}
                                  </p>
                                </div>
                              </div>

                              {/* Section 2: Next Session Assignments */}
                              <div className="bg-sky-50/40 border border-sky-100 rounded-xl p-3.5 space-y-2.5">
                                <div className="flex items-center gap-2 text-sky-800 font-bold text-xs">
                                  <Compass size={14} className="text-sky-600" />
                                  <span>ثانيًا: الإنجاز المطلوب للحلقة القادمة</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="bg-white/80 rounded-lg p-2 border border-sky-100">
                                    <span className="text-[11px] font-bold text-gray-500 block mb-0.5">التسميع القادم:</span>
                                    <p className="text-xs text-gray-800 truncate">{rep.nextRecitation || '—'}</p>
                                  </div>
                                  <div className="bg-white/80 rounded-lg p-2 border border-sky-100">
                                    <span className="text-[11px] font-bold text-gray-500 block mb-0.5">المراجعة القادمة:</span>
                                    <p className="text-xs text-gray-800 truncate">{rep.nextRevision || '—'}</p>
                                  </div>
                                  <div className="bg-white/80 rounded-lg p-2 border border-sky-100">
                                    <span className="text-[11px] font-bold text-gray-500 block mb-0.5">الآداب / الأحاديث:</span>
                                    <p className="text-xs text-gray-800 truncate">{rep.nextManners || '—'}</p>
                                  </div>
                                  <div className="bg-white/80 rounded-lg p-2 border border-sky-100">
                                    <span className="text-[11px] font-bold text-gray-500 block mb-0.5">التجويد:</span>
                                    <p className="text-xs text-gray-800 truncate">{rep.nextTajweed || '—'}</p>
                                  </div>
                                </div>
                                {rep.quranLink && (
                                  <div className="pt-1">
                                    <a
                                      href={rep.quranLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 text-xs text-brand-purple hover:underline bg-white/90 border border-purple-200 px-3 py-1.5 rounded-lg font-medium"
                                    >
                                      🔗 رابط المصحف المعتمد
                                      <ExternalLink size={12} />
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Section 3: Teacher Ratings */}
                            <div className="bg-gray-50/70 border border-gray-100 rounded-xl p-3.5 space-y-2.5">
                              <div className="flex items-center gap-2 text-gray-800 font-bold text-xs">
                                <Star size={14} className="text-amber-500 fill-amber-400" />
                                <span>ثالثًا: تقييم المعلم للطالب</span>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {[
                                  { label: 'الحفظ والتسميع', val: rep.memorizationLevel },
                                  { label: 'المراجعة', val: rep.revisionLevel },
                                  { label: 'التجويد والتلاوة', val: rep.tajweedLevel },
                                  { label: 'الالتزام والتفاعل', val: rep.engagementLevel },
                                ].map((item, idx) => (
                                  <div key={idx} className="bg-white rounded-lg p-2.5 border border-gray-200/80 text-center">
                                    <span className="text-[10px] font-bold text-gray-500 block mb-1">{item.label}</span>
                                    <span className={`inline-block px-2.5 py-0.5 text-xs font-bold rounded-md border ${
                                      RATING_STYLE[item.val] || 'bg-gray-50 text-gray-500 border-gray-200'
                                    }`}>
                                      {item.val || '—'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              {rep.generalEvaluation && (
                                <div className="text-xs text-gray-700 bg-white rounded-lg p-2.5 border border-gray-200/80">
                                  <span className="font-bold text-gray-900 block mb-0.5">التقييم العام:</span>
                                  {rep.generalEvaluation}
                                </div>
                              )}
                            </div>

                            {/* Section 4: Parent Notes & Alerts */}
                            {(rep.parentNotes || rep.importantAlert) && (
                              <div className="space-y-2">
                                {rep.parentNotes && (
                                  <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 text-xs text-blue-950 flex items-start gap-2.5">
                                    <MessageCircle size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                      <strong className="block text-blue-900 mb-0.5">ملاحظات لولي الأمر:</strong>
                                      <span>{rep.parentNotes}</span>
                                    </div>
                                  </div>
                                )}
                                {rep.importantAlert && (
                                  <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3 text-xs text-rose-950 flex items-start gap-2.5">
                                    <AlertTriangle size={15} className="text-rose-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                      <strong className="block text-rose-900 mb-0.5">📌 تنبيه هام لولي الأمر:</strong>
                                      <span>{rep.importantAlert}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ) : s.status === 'completed' ? (
                          /* Missing Report Alert for Completed Sessions */
                          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
                            <div className="flex items-center gap-2">
                              <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
                              <span>الحصة مسجلة كمكتملة، ولكن لم يقم المعلم برفع تقرير الحلقة حتى الآن.</span>
                            </div>
                          </div>
                        ) : (
                          /* Scheduled future session info */
                          <div className="bg-gray-50 border border-gray-200/60 rounded-xl p-3 text-xs text-gray-500">
                            حصة مجدولة قادمة في موعدها. سيكون تقرير الحلقة متاحاً هنا فور إنهائها من قِبل المعلم.
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* SubTab 2: Periodic Evaluations & Tests */}
          {subTab === 'evaluations' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {evalList.length === 0 ? (
                <div className="text-center py-12 text-gray-500 text-sm">لا توجد تقييمات دورية مسجلة بعد</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {['التاريخ', 'المعلم', 'النوع', 'الدرجة', 'ملاحظات', ''].map(h => (
                          <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-gray-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {evalList.map(ev => (
                        <tr key={ev._id} className="border-b border-gray-50 hover:bg-gray-50/60">
                          <td className="px-4 py-3 text-sm text-gray-600">{formatDateAr(ev.createdAt)}</td>
                          <td className="px-4 py-3 text-sm text-gray-800">
                            {ev.teacherId?.firstNameAr} {ev.teacherId?.lastNameAr}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="purple">
                              {ev.type === 'monthly' ? 'شهري' : ev.type === 'weekly' ? 'أسبوعي' : ev.type === 'session' ? 'حصة' : 'نهائي'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <span className="flex items-center gap-1 text-sm font-bold text-amber-600">
                              <Star size={13} fill="currentColor" /> {ev.score ?? '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 max-w-[180px] truncate">
                            {ev.notesAr || '—'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <button
                                onClick={() => setEditEv(ev)}
                                className="p-1.5 text-violet-500 hover:bg-violet-50 rounded-lg"
                                title="تعديل"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                onClick={() => { if (window.confirm('حذف التقييم؟')) deleteEvMut.mutate(ev._id) }}
                                className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"
                                title="حذف"
                              >
                                <Trash2 size={12} />
                              </button>
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
      {tab === 'subscription' && <SubscriptionWalletTab studentId={id} student={student} subscription={sub} enrollmentRequests={enrollmentRequests} assignedTeacher={assignedTeacher} />}
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
