import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  ArrowLeftRight, AlertTriangle, CheckCircle2, XCircle, Loader2, RotateCcw, Ban, Users,
  History, Sparkles, Search, Calendar, Clock, ShieldCheck, Check, ArrowRight, RefreshCw,
  Info, ChevronLeft, Filter, CheckSquare, Square, UserCheck,
} from 'lucide-react'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Button from '../../components/ui/Button.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import PersonCombobox from '../../components/ui/PersonCombobox.jsx'
import { transferService } from '../../services/transfer.service.js'
import { dayLabel } from '../../utils/assignmentSchedule.js'
import { formatDateAr } from '../../utils/date.js'
import { ROUTES } from '../../config/constants.js'

const inputCls = 'w-full h-11 bg-white border border-gray-200 rounded-xl px-3.5 text-sm text-gray-800 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 transition-all placeholder:text-gray-400'

const CLASSIFICATION_LABELS = {
  ready: { label: 'جاهز — نفس الموعد متاح', variant: 'success' },
  conflict: { label: 'يحتاج موعدًا بديلًا', variant: 'warning' },
  missing_data: { label: 'بيانات غير مكتملة', variant: 'gray' },
  excluded: { label: 'مستبعد', variant: 'gray' },
}

const RESULT_LABELS = {
  pending: { label: 'قيد الانتظار', variant: 'gray' },
  success: { label: 'تم بنجاح', variant: 'success' },
  failed: { label: 'فشل', variant: 'danger' },
  skipped: { label: 'تم التخطي', variant: 'gray' },
}

const BATCH_STATUS_LABELS = {
  draft: { label: 'مسودة', variant: 'gray' },
  running: { label: 'قيد التنفيذ', variant: 'blue' },
  completed: { label: 'مكتملة بنجاح', variant: 'success' },
  partial: { label: 'مكتملة جزئيًا', variant: 'warning' },
  failed: { label: 'فشلت', variant: 'danger' },
  cancelled: { label: 'ملغاة', variant: 'gray' },
}

const REASON_PRESETS = [
  'ترك المعلم للعمل بالأكاديمية',
  'إجازة طارئة / مرضية ممتدة',
  'إعادة توزيع العبء التدريسي',
  'تغيير تخصص أو مستوى الحلقات',
]

export default function AdminTeacherReplacementPage() {
  const { batchId } = useParams()
  return batchId ? <BatchReviewStep batchId={batchId} /> : <MainReplacementView />
}

// ── Main View with Tabs (Wizard / History) ──────────────────────────────────

function MainReplacementView() {
  const [activeTab, setActiveTab] = useState('wizard')

  const { data: batchesData } = useQuery({
    queryKey: ['admin', 'transfers', 'batches', 'count'],
    queryFn: () => transferService.listBatches({ limit: 1 }).then(r => r.data.data),
    staleTime: 30_000,
  })

  return (
    <div dir="rtl" className="space-y-6 w-full pb-16">
      {/* Header with Navigation Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <PageHeader
          title="استبدال معلم لجميع طلابه"
          subtitle="نقل جماعي ومؤتمت لكل طلاب المعلم إلى معلم بديل مع الحفاظ الكامل على الرصيد وسجل الحصص"
        />

        <div className="flex items-center bg-gray-100/80 p-1.5 rounded-2xl gap-1 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('wizard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'wizard'
                ? 'bg-white text-violet-700 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Sparkles size={15} />
            بدء استبدال جديد
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-white text-violet-700 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <History size={15} />
            سجل العمليات السابقة
            {batchesData?.total > 0 && (
              <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-[11px] font-bold flex items-center justify-center">
                {batchesData.total}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'wizard' ? <SetupStep onGoToHistory={() => setActiveTab('history')} /> : <BatchHistoryStep onNewReplacement={() => setActiveTab('wizard')} />}
    </div>
  )
}

// ── Step 1 — setup + preview + create batch ─────────────────────────────────

function SetupStep({ onGoToHistory }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    sourceTeacherId: '',
    targetTeacherId: '',
    reason: '',
    effectiveDate: new Date().toISOString().slice(0, 10),
    deactivateSourceTeacherOnSuccess: false,
  })
  const [selected, setSelected] = useState(new Set())
  const [searchFilter, setSearchFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const isSameTeacher = !!form.sourceTeacherId && !!form.targetTeacherId && form.sourceTeacherId === form.targetTeacherId
  const hasSelectedBoth = !!form.sourceTeacherId && !!form.targetTeacherId && !isSameTeacher

  // Automatic query for preview whenever sourceTeacherId and targetTeacherId are both present and different
  const {
    data: preview,
    isLoading: isPreviewLoading,
    isFetching: isPreviewFetching,
    error: previewError,
    refetch: refetchPreview,
  } = useQuery({
    queryKey: ['admin', 'transfers', 'preview', form.sourceTeacherId, form.targetTeacherId],
    queryFn: () => transferService.previewTeacherReplacement(form.sourceTeacherId, form.targetTeacherId).then(r => r.data.data),
    enabled: !!form.sourceTeacherId && !!form.targetTeacherId && !isSameTeacher,
    staleTime: 60_000,
  })

  // Auto-select eligible students whenever preview updates
  useEffect(() => {
    if (preview?.entries) {
      const eligible = preview.entries.filter(e => e.classification !== 'missing_data').map(e => e.studentId)
      setSelected(new Set(eligible))
    }
  }, [preview])

  const createMut = useMutation({
    mutationFn: () =>
      transferService.createBatch(form.sourceTeacherId, {
        targetTeacherId: form.targetTeacherId,
        reason: form.reason.trim(),
        effectiveDate: form.effectiveDate,
        studentIds: Array.from(selected),
        deactivateSourceTeacherOnSuccess: form.deactivateSourceTeacherOnSuccess,
      }).then(r => r.data.data),
    onSuccess: (batch) => {
      toast.success('تم إنشاء الدفعة بنجاح — جارٍ نقلك لمراجعة المواعيد')
      navigate(ROUTES.ADMIN_TEACHER_REPLACEMENT_BATCH.replace(':batchId', batch._id))
    },
    onError: (err) => toast.error(err.response?.data?.message || 'حدث خطأ أثناء إنشاء الدفعة'),
  })

  const toggleSelect = (studentId) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(studentId) ? next.delete(studentId) : next.add(studentId)
      return next
    })
  }

  const toggleSelectAll = (filteredEntries) => {
    const selectable = filteredEntries.filter(e => e.classification !== 'missing_data')
    const allSelected = selectable.every(e => selected.has(e.studentId))
    setSelected(prev => {
      const next = new Set(prev)
      if (allSelected) {
        selectable.forEach(e => next.delete(e.studentId))
      } else {
        selectable.forEach(e => next.add(e.studentId))
      }
      return next
    })
  }

  // Filter preview entries by status and search text
  const filteredEntries = useMemo(() => {
    if (!preview?.entries) return []
    return preview.entries.filter(e => {
      if (statusFilter !== 'all' && e.classification !== statusFilter) return false
      if (searchFilter.trim()) {
        const query = searchFilter.trim().toLowerCase()
        const fullName = `${e.student?.firstNameAr || ''} ${e.student?.lastNameAr || ''}`.toLowerCase()
        const email = (e.student?.email || '').toLowerCase()
        return fullName.includes(query) || email.includes(query)
      }
      return true
    })
  }, [preview?.entries, statusFilter, searchFilter])

  const sourceTeacher = preview?.sourceTeacher
  const targetTeacher = preview?.targetTeacher

  return (
    <div className="space-y-6">
      {/* 4-Step Process Guide */}
      <div className="bg-gradient-to-r from-violet-50/70 via-purple-50/40 to-amber-50/30 rounded-2xl border border-violet-100/80 p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all ${
            hasSelectedBoth
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
              : 'bg-white/90 border-violet-200 text-gray-800 shadow-xs'
          }`}>
            <span className={`w-6 h-6 rounded-full font-bold flex items-center justify-center text-xs flex-none ${
              hasSelectedBoth ? 'bg-emerald-600 text-white' : 'bg-violet-600 text-white'
            }`}>
              {hasSelectedBoth ? '✓' : '1'}
            </span>
            <div>
              <p className="font-bold">اختيار المعلمين</p>
              <p className="text-[11px] opacity-75">المعلم المغادر والبديل</p>
            </div>
          </div>

          <div className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all ${
            preview && !previewError
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
              : isPreviewLoading
              ? 'bg-violet-50 border-violet-300 text-violet-900 animate-pulse'
              : hasSelectedBoth
              ? 'bg-white/90 border-violet-200 text-gray-800 shadow-xs'
              : 'bg-white/60 border-gray-100 text-gray-500'
          }`}>
            <span className={`w-6 h-6 rounded-full font-bold flex items-center justify-center text-xs flex-none ${
              preview && !previewError
                ? 'bg-emerald-600 text-white'
                : hasSelectedBoth
                ? 'bg-violet-600 text-white'
                : 'bg-gray-200 text-gray-600'
            }`}>
              {preview && !previewError ? '✓' : '2'}
            </span>
            <div>
              <p className="font-bold">المعاينة وفحص التوافق</p>
              <p className="text-[11px] opacity-75">كشف التعارضات تلقائياً</p>
            </div>
          </div>

          <div className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all ${
            preview && preview.summary?.conflict > 0
              ? 'bg-amber-50/90 border-amber-200 text-amber-900'
              : 'bg-white/60 border-gray-100 text-gray-500'
          }`}>
            <span className={`w-6 h-6 rounded-full font-bold flex items-center justify-center text-xs flex-none ${
              preview && preview.summary?.conflict > 0
                ? 'bg-amber-500 text-white'
                : 'bg-gray-200 text-gray-600'
            }`}>
              3
            </span>
            <div>
              <p className="font-bold">حل التعارضات البديلة</p>
              <p className="text-[11px] opacity-75">تحديد الأوقات المناسبة</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 bg-white/60 border border-gray-100 p-2.5 rounded-xl text-gray-500">
            <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 font-bold flex items-center justify-center text-xs flex-none">
              4
            </span>
            <div>
              <p className="font-bold">التنفيذ الآمن والإشعار</p>
              <p className="text-[11px] opacity-75">ترحيل الحصص المستقبلية</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Inputs on the Right, Live Preview on the Left */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form Configuration Card (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-heading font-bold text-base text-gray-800 flex items-center gap-2">
                <Users size={17} className="text-violet-600" />
                تحديد طرفي الاستبدال
              </h3>
              {preview && (
                <button
                  type="button"
                  onClick={() => refetchPreview()}
                  disabled={isPreviewFetching}
                  className="text-xs font-semibold text-violet-600 hover:text-violet-800 flex items-center gap-1 cursor-pointer transition-colors"
                  title="إعادة فحص التوافق"
                >
                  <RefreshCw size={13} className={isPreviewFetching ? 'animate-spin' : ''} />
                  تحديث
                </button>
              )}
            </div>

            <div className="space-y-4">
              <PersonCombobox
                role="teacher"
                label="المعلم المصدر (المغادر / المستبدل)"
                required
                placeholder="اختر المعلم الذي سيتم نقل طلابه..."
                value={form.sourceTeacherId || null}
                onChange={(id) => setForm(p => ({ ...p, sourceTeacherId: id || '' }))}
              />

              <PersonCombobox
                role="teacher"
                label="المعلم الهدف (البديل الجديد)"
                required
                placeholder="اختر المعلم البديل لاستقبال الطلاب..."
                value={form.targetTeacherId || null}
                excludeId={form.sourceTeacherId || undefined}
                onChange={(id) => setForm(p => ({ ...p, targetTeacherId: id || '' }))}
              />
            </div>

            <div className="space-y-4 pt-2 border-t border-gray-100">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-gray-700">سبب الاستبدال (إلزامي)</label>
                  <span className="text-[11px] text-gray-400">يُسجل في سجل التدقيق</span>
                </div>
                <input
                  className={inputCls}
                  value={form.reason}
                  onChange={(e) => setForm(p => ({ ...p, reason: e.target.value }))}
                  placeholder="اكتب سبب النقل أو اختر من الاقتراحات أدناه..."
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {REASON_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, reason: preset }))}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                        form.reason === preset
                          ? 'bg-violet-50 text-violet-700 border-violet-300 font-bold'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-gray-700">تاريخ بدء السريان</label>
                  <button
                    type="button"
                    onClick={() => setForm(p => ({ ...p, effectiveDate: new Date().toISOString().slice(0, 10) }))}
                    className="text-[11px] text-violet-600 hover:underline cursor-pointer font-medium"
                  >
                    تعيين اليوم
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="date"
                    className={inputCls}
                    value={form.effectiveDate}
                    onChange={(e) => setForm(p => ({ ...p, effectiveDate: e.target.value }))}
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  الحصص المجدولة بدءاً من هذا التاريخ ستُنقل للمعلم البديل، بينما تبقى الحصص السابقة للمعلم القديم.
                </p>
              </div>

              <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.deactivateSourceTeacherOnSuccess}
                    onChange={(e) => setForm(p => ({ ...p, deactivateSourceTeacherOnSuccess: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-400 mt-0.5"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-amber-900 block">
                      إيقاف تفعيل حساب المعلم المغادر تلقائيًا
                    </span>
                    <span className="text-amber-700 text-[11px] leading-relaxed block mt-0.5">
                      يتم تفعيل هذا الإجراء فقط عند نجاح تحويل جميع طلابه 100% دون أي فشل، بحيث لا يمكنه تسجيل الدخول أو استقبال طلاب جدد.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Action button if preview already loaded */}
            {preview && preview.entries.length > 0 && (
              <Button
                variant="purple"
                size="md"
                fullWidth
                icon={<ArrowLeftRight size={16} />}
                loading={createMut.isPending}
                disabled={!selected.size || !form.reason.trim()}
                onClick={() => createMut.mutate()}
              >
                إنشاء الدفعة ومتابعة النقل ({selected.size} طالب)
              </Button>
            )}
          </div>

          {/* Teacher Comparison Card (shown when both are selected) */}
          {sourceTeacher && targetTeacher && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
              <h4 className="text-xs font-bold text-gray-500 flex items-center gap-1.5">
                <UserCheck size={14} className="text-emerald-600" />
                مقارنة طرفي الاستبدال
              </h4>
              <div className="grid grid-cols-2 gap-3 items-center">
                <div className="bg-gray-50/80 rounded-xl p-3 text-center space-y-1.5 border border-gray-100">
                  <Avatar
                    firstName={sourceTeacher.firstNameAr}
                    lastName={sourceTeacher.lastNameAr}
                    size="sm"
                    className="mx-auto"
                  />
                  <div>
                    <p className="text-xs font-bold text-gray-800 line-clamp-1">
                      {sourceTeacher.firstNameAr} {sourceTeacher.lastNameAr}
                    </p>
                    <span className="text-[10px] text-gray-500 block">المعلم المغادر</span>
                    <Badge variant="purple" className="mt-1 text-[10px] px-2 py-0.5">
                      {preview.summary.total} طالب متأثر
                    </Badge>
                  </div>
                </div>

                <div className="bg-violet-50/50 rounded-xl p-3 text-center space-y-1.5 border border-violet-100">
                  <Avatar
                    firstName={targetTeacher.firstNameAr}
                    lastName={targetTeacher.lastNameAr}
                    size="sm"
                    className="mx-auto"
                  />
                  <div>
                    <p className="text-xs font-bold text-gray-800 line-clamp-1">
                      {targetTeacher.firstNameAr} {targetTeacher.lastNameAr}
                    </p>
                    <span className="text-[10px] text-violet-600 block">المعلم البديل</span>
                    <Badge variant="success" className="mt-1 text-[10px] px-2 py-0.5">
                      جاهز للاستقبال
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Live Preview Column (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {isSameTeacher ? (
            <div className="bg-amber-50/70 rounded-2xl border border-amber-200 p-10 text-center space-y-3 flex flex-col items-center justify-center min-h-[420px]">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <AlertTriangle size={26} />
              </div>
              <h4 className="font-heading font-bold text-base text-amber-900">
                المعلم المغادر والمعلم البديل متطابقان
              </h4>
              <p className="text-xs text-amber-700 max-w-sm leading-relaxed">
                يجب أن يكون المعلم البديل شخصًا مختلفًا عن المعلم المغادر. يرجى اختيار معلم بديل آخر لاستقبال الطلاب.
              </p>
            </div>
          ) : !form.sourceTeacherId || !form.targetTeacherId ? (
            <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center space-y-3 flex flex-col items-center justify-center min-h-[420px]">
              <div className="w-14 h-14 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center">
                <ArrowLeftRight size={26} />
              </div>
              <h4 className="font-heading font-bold text-base text-gray-800">
                في انتظار تحديد طرفي الاستبدال
              </h4>
              <p className="text-xs text-gray-500 max-w-sm leading-relaxed">
                اختر المعلم المصدر (المغادر) والمعلم البديل من النموذج على اليمين، وسيقوم النظام فوراً بفحص التوافق وتجهيز قائمة الطلاب تلقائياً.
              </p>
            </div>
          ) : isPreviewLoading ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center space-y-3 flex flex-col items-center justify-center min-h-[420px]">
              <Spinner size="lg" color="border-violet-600" />
              <p className="text-sm font-bold text-gray-800">جارٍ فحص جداول الطلاب والتوافق مع المعلم الجديد...</p>
              <p className="text-xs text-gray-500">نقوم بفحص مواعيد كل حصة وتحديد أوقات التعارض والبدائل المتاحة</p>
            </div>
          ) : previewError ? (
            <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                <AlertTriangle size={24} />
              </div>
              <h4 className="font-heading font-bold text-sm text-gray-800">تعذّر تحميل المعاينة</h4>
              <p className="text-xs text-red-600 leading-relaxed max-w-md mx-auto">
                {previewError.response?.data?.message || previewError.message || 'حدث خطأ أثناء فحص جداول الطلاب'}
              </p>
              <Button variant="outline" size="sm" onClick={() => refetchPreview()}>
                إعادة المحاولة
              </Button>
            </div>
          ) : preview && preview.entries.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center space-y-3 flex flex-col items-center justify-center min-h-[420px]">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 text-gray-500 flex items-center justify-center">
                <Users size={26} />
              </div>
              <h4 className="font-heading font-bold text-base text-gray-800">
                لا يوجد طلاب نشطون مسجلون لهذا المعلم
              </h4>
              <p className="text-xs text-gray-500 max-w-md leading-relaxed">
                المعلم المغادر المختار ليس لديه أي اشتراكات نشطة أو طلاب مسندون حاليًا لنقلهم. يمكنك مراجعة حالة الطلاب في ملف المعلم أو اختيار معلم آخر.
              </p>
            </div>
          ) : preview ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-4">
              {/* Preview Stats Bar */}
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-gray-100 pb-4">
                <div>
                  <h3 className="font-heading font-bold text-sm text-gray-800 flex items-center gap-2">
                    <Sparkles size={16} className="text-violet-600" />
                    معاينة الطلاب المتأثرين ({preview.summary.total} طالب)
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    تم تحديد <span className="font-bold text-violet-700">{selected.size}</span> طالب للنقل
                  </p>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge variant="success">{preview.summary.ready} جاهز بنفس الموعد</Badge>
                  {preview.summary.conflict > 0 && (
                    <Badge variant="warning">{preview.summary.conflict} يحتاج موعدًا بديلًا</Badge>
                  )}
                  {preview.summary.missingData > 0 && (
                    <Badge variant="gray">{preview.summary.missingData} غير مؤهل</Badge>
                  )}
                </div>
              </div>

              {/* Filter and Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="relative flex-1">
                  <Search size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="بحث باسم الطالب أو بريده الإلكتروني..."
                    className="w-full h-9 bg-gray-50 border border-gray-200 rounded-xl pr-9 pl-3 text-xs text-gray-800 outline-none focus:border-violet-500 focus:bg-white transition-all placeholder:text-gray-400"
                  />
                  {searchFilter && (
                    <button
                      type="button"
                      onClick={() => setSearchFilter('')}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      مسح
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      statusFilter === 'all' ? 'bg-white text-violet-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    الكل
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('ready')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      statusFilter === 'ready' ? 'bg-white text-emerald-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    جاهز
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('conflict')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      statusFilter === 'conflict' ? 'bg-white text-amber-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    تعارض
                  </button>
                </div>
              </div>

              {/* Selection Bar */}
              <div className="flex items-center justify-between text-xs bg-gray-50/80 px-3 py-2 rounded-xl border border-gray-100">
                <button
                  type="button"
                  onClick={() => toggleSelectAll(filteredEntries)}
                  className="flex items-center gap-2 font-bold text-gray-700 hover:text-violet-700 transition-colors cursor-pointer"
                >
                  {filteredEntries.filter(e => e.classification !== 'missing_data').every(e => selected.has(e.studentId)) ? (
                    <CheckSquare size={16} className="text-violet-600" />
                  ) : (
                    <Square size={16} className="text-gray-400" />
                  )}
                  تحديد الكل في هذه القائمة
                </button>

                <span className="text-gray-500">
                  عرض {filteredEntries.length} من أصل {preview.entries.length} طالب
                </span>
              </div>

              {/* Student Cards List */}
              <div className="max-h-[440px] xl:max-h-[560px] 2xl:max-h-[640px] overflow-y-auto space-y-2 pr-1">
                {filteredEntries.map((e) => {
                  const isSelected = selected.has(e.studentId)
                  const isMissing = e.classification === 'missing_data'
                  const isConflict = e.classification === 'conflict'

                  return (
                    <div
                      key={e.studentId}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isMissing
                          ? 'bg-gray-50/50 border-gray-200 opacity-60'
                          : isSelected
                          ? 'bg-violet-50/30 border-violet-200 shadow-xs'
                          : 'bg-white border-gray-200/80 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <label className="flex items-start gap-3 cursor-pointer flex-1 select-none">
                          <input
                            type="checkbox"
                            disabled={isMissing}
                            checked={isSelected}
                            onChange={() => toggleSelect(e.studentId)}
                            className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-400 mt-1"
                          />
                          <Avatar
                            firstName={e.student?.firstNameAr}
                            lastName={e.student?.lastNameAr}
                            size="sm"
                            className="flex-none"
                          />
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-xs text-gray-900">
                                {e.student ? `${e.student.firstNameAr || ''} ${e.student.lastNameAr || ''}`.trim() : `طالب #${String(e.studentId).slice(-6)}`}
                              </span>
                              {e.student?.email && (
                                <span className="text-[11px] text-gray-400 font-sans" dir="ltr">
                                  {e.student.email}
                                </span>
                              )}
                            </div>

                            {/* Schedule Resolution Info */}
                            {e.scheduleResolution && e.scheduleResolution.length > 0 && (
                              <div className="flex items-center gap-2 flex-wrap text-[11px] text-gray-600">
                                <Clock size={12} className="text-gray-400" />
                                <span>
                                  المواعيد الحالية:{' '}
                                  {e.scheduleResolution
                                    .flatMap(r => r.days || [])
                                    .map(d => `${dayLabel(d.dayOfWeek)} ${d.time}`)
                                    .join('، ')}
                                </span>
                              </div>
                            )}

                            {isConflict && (
                              <div className="text-[11px] text-amber-700 bg-amber-50/90 border border-amber-200/70 rounded-lg px-2.5 py-1 mt-1 flex items-center gap-1.5">
                                <AlertTriangle size={12} className="text-amber-600 flex-none" />
                                <span>المعلم الجديد مشغول في نفس الموعد — سيتم تحديد موعد بديل في الخطوة التالية</span>
                              </div>
                            )}

                            {isMissing && (
                              <p className="text-[11px] text-gray-500">
                                {e.classificationReason || 'لا يوجد جدول دوري نشط لهذا الطالب حاليًا'}
                              </p>
                            )}
                          </div>
                        </label>

                        <Badge variant={CLASSIFICATION_LABELS[e.classification]?.variant}>
                          {CLASSIFICATION_LABELS[e.classification]?.label}
                        </Badge>
                      </div>
                    </div>
                  )
                })}

                {!filteredEntries.length && (
                  <div className="text-center text-xs text-gray-400 py-10">
                    لا يوجد طلاب يطابقون خيارات البحث أو التصفية الحالية
                  </div>
                )}
              </div>

              {/* Bottom Action Section */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between flex-wrap gap-3">
                <div className="text-xs text-gray-500">
                  سيتم إنشاء الدفعة كمسودة (Draft) ولن يتم أي تغيير حتى اعتماد حل التعارضات والتشغيل.
                </div>
                <Button
                  variant="purple"
                  size="md"
                  icon={<ArrowLeftRight size={15} />}
                  loading={createMut.isPending}
                  disabled={!selected.size || !form.reason.trim()}
                  onClick={() => createMut.mutate()}
                >
                  إنشاء الدفعة ومتابعة حل التعارضات ({selected.size})
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Safety & Academic Policy Guarantees (Full Width Responsive) */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 flex-wrap gap-2">
          <h4 className="font-heading font-bold text-sm text-gray-800 flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-600" />
            ضمانات المنظومة والسياسة الأكاديمية الصارمة
          </h4>
          <span className="text-xs text-gray-400">
            حماية كاملة لحقوق الطلاب والمعلمين والسجلات المالية
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-emerald-50/40 rounded-xl p-4 border border-emerald-100/80 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-800 font-bold">
              <Check size={15} className="text-emerald-600 flex-none" />
              المحفظة المالية والرصيد
            </div>
            <p className="text-gray-600 leading-relaxed text-[11px] sm:text-xs">
              رصيد الحصص المتبقية للطلاب لا يُمَس نهائياً ويبقى كاملاً في حساباتهم دون أي خصم أو تعديل مالي.
            </p>
          </div>

          <div className="bg-violet-50/40 rounded-xl p-4 border border-violet-100/80 space-y-1.5">
            <div className="flex items-center gap-2 text-violet-800 font-bold">
              <Check size={15} className="text-violet-600 flex-none" />
              السجل التاريخي والحصص السابقة
            </div>
            <p className="text-gray-600 leading-relaxed text-[11px] sm:text-xs">
              الحصص السابقة وتقارير الحضور ورواتب المعلم المغادر تظل محفوظة باسمه وسجله الأكاديمي دون أدنى مساس.
            </p>
          </div>

          <div className="bg-amber-50/40 rounded-xl p-4 border border-amber-100/80 space-y-1.5">
            <div className="flex items-center gap-2 text-amber-800 font-bold">
              <Check size={15} className="text-amber-600 flex-none" />
              عزل العمليات وعدم التعطيل
            </div>
            <p className="text-gray-600 leading-relaxed text-[11px] sm:text-xs">
              نقل كل طالب يتم بصورة ذرية منفصلة تماماً؛ لن يؤثر تعثر أو تعارض موعد أي طالب على نجاح ترحيل بقية زملائه.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Batch History Component (Tab 2) ─────────────────────────────────────────

function BatchHistoryStep({ onNewReplacement }) {
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'transfers', 'batches', page],
    queryFn: () => transferService.listBatches({ page, limit: 15 }).then(r => r.data.data),
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner color="border-violet-600" />
      </div>
    )
  }

  const batches = data?.batches || []

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3 border-b border-gray-100 pb-3">
          <div>
            <h3 className="font-heading font-bold text-sm text-gray-800 flex items-center gap-2">
              <History size={16} className="text-violet-600" />
              سجل دفعات استبدال المعلمين ({data?.total || 0} عملية)
            </h3>
            <p className="text-xs text-gray-500">
              يمكنك متابعة حالة أي دفعة سابقة، استئناف الدفعات المسودة، أو إعادة محاولة الطلاب المتعثرين
            </p>
          </div>
          <Button variant="purple" size="sm" icon={<Sparkles size={14} />} onClick={onNewReplacement}>
            بدء استبدال جديد
          </Button>
        </div>

        {batches.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-bold">
                  <th className="py-3 px-3">رقم الدفعة</th>
                  <th className="py-3 px-3">التاريخ</th>
                  <th className="py-3 px-3">المعلم المغادر ← البديل</th>
                  <th className="py-3 px-3">سبب الاستبدال</th>
                  <th className="py-3 px-3 text-center">الطلاب</th>
                  <th className="py-3 px-3 text-center">الحالة</th>
                  <th className="py-3 px-3 text-left">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {batches.map((b) => {
                  const selectedCount = b.entries?.filter(e => e.selected).length || 0
                  const successCount = b.entries?.filter(e => e.result === 'success').length || 0
                  const progressPct = selectedCount ? Math.round((successCount / selectedCount) * 100) : 0

                  return (
                    <tr key={b._id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-gray-700">
                        #{b._id.slice(-6)}
                      </td>
                      <td className="py-3 px-3 text-gray-500">
                        {formatDateAr(b.createdAt)}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 text-gray-800 font-semibold">
                          <span>
                            {b.sourceTeacherId?.firstNameAr
                              ? `${b.sourceTeacherId.firstNameAr} ${b.sourceTeacherId.lastNameAr || ''}`
                              : 'معلم سابق'}
                          </span>
                          <ArrowLeftRight size={12} className="text-violet-500 flex-none" />
                          <span className="text-violet-700">
                            {b.targetTeacherId?.firstNameAr
                              ? `${b.targetTeacherId.firstNameAr} ${b.targetTeacherId.lastNameAr || ''}`
                              : 'معلم بديل'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-gray-600 max-w-[200px] truncate" title={b.reason}>
                        {b.reason}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="font-bold text-gray-800">{successCount}</span> / {selectedCount}
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full mx-auto mt-1 overflow-hidden">
                          <div
                            className={`h-full ${b.status === 'completed' ? 'bg-emerald-500' : 'bg-violet-500'}`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge variant={BATCH_STATUS_LABELS[b.status]?.variant || 'gray'}>
                          {BATCH_STATUS_LABELS[b.status]?.label || b.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-left">
                        <Link
                          to={ROUTES.ADMIN_TEACHER_REPLACEMENT_BATCH.replace(':batchId', b._id)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-violet-600 hover:text-violet-800 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          فتح ومتابعة
                          <ChevronLeft size={13} />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16 space-y-3">
            <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
              <History size={24} />
            </div>
            <p className="text-sm font-bold text-gray-700">لا يوجد سجل لدفعات سابقة حتى الآن</p>
            <p className="text-xs text-gray-400">أي عملية استبدال تبدأها ستُحفظ تلقائياً هنا لمتابعتها</p>
            <Button variant="outline" size="sm" onClick={onNewReplacement}>
              بدء أول عملية استبدال
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Step 2 — review, resolve conflicts, run, monitor ────────────────────────

function BatchReviewStep({ batchId }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [filterResult, setFilterResult] = useState('all') // 'all' | 'pending' | 'success' | 'failed'

  const { data: batch, isLoading } = useQuery({
    queryKey: ['admin', 'transfers', 'batch', batchId],
    queryFn: () => transferService.getBatch(batchId).then(r => r.data.data),
    refetchInterval: (q) => (q.state.data?.status === 'running' ? 1500 : false),
  })

  // Re-fetch live alternatives for conflicting students
  const { data: preview } = useQuery({
    queryKey: ['admin', 'transfers', 'batch', batchId, 'live-preview'],
    queryFn: () => transferService.previewTeacherReplacement(batch.sourceTeacherId, batch.targetTeacherId).then(r => r.data.data),
    enabled: !!batch && batch.status === 'draft',
  })

  const resolutionByStudent = useMemo(() => {
    const map = new Map()
    preview?.entries?.forEach((e) => map.set(e.studentId, e.scheduleResolution))
    return map
  }, [preview])

  const resolveMut = useMutation({
    mutationFn: ({ studentId, resolvedSchedule }) => transferService.setEntryResolution(batchId, studentId, resolvedSchedule),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'transfers', 'batch', batchId] }),
    onError: (err) => toast.error(err.response?.data?.message || 'حدث خطأ أثناء حفظ الموعد البديل'),
  })

  const runMut = useMutation({
    mutationFn: () => transferService.runBatch(batchId),
    onSuccess: () => {
      toast.success('جارٍ تشغيل الدفعة ومعالجة نقل الطلاب')
      qc.invalidateQueries({ queryKey: ['admin', 'transfers', 'batch', batchId] })
    },
    onError: (err) => toast.error(err.response?.data?.message || 'حدث خطأ في تشغيل الدفعة'),
  })

  const retryMut = useMutation({
    mutationFn: () => transferService.retryBatch(batchId),
    onSuccess: () => {
      toast.success('تمت إعادة محاولة الطلاب المتعثرين')
      qc.invalidateQueries({ queryKey: ['admin', 'transfers', 'batch', batchId] })
    },
    onError: (err) => toast.error(err.response?.data?.message || 'حدث خطأ في إعادة المحاولة'),
  })

  const cancelMut = useMutation({
    mutationFn: () => transferService.cancelBatch(batchId),
    onSuccess: () => {
      toast.success('تم إلغاء الدفعة بنجاح')
      qc.invalidateQueries({ queryKey: ['admin', 'transfers', 'batch', batchId] })
    },
    onError: (err) => toast.error(err.response?.data?.message || 'حدث خطأ أثناء الإلغاء'),
  })

  if (isLoading) {
    return (
      <div className="flex justify-center pt-20">
        <Spinner color="border-violet-600" />
      </div>
    )
  }

  if (!batch) {
    return (
      <div className="text-center pt-20 space-y-3">
        <p className="text-gray-500">الدفعة غير موجودة</p>
        <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.ADMIN_TEACHER_REPLACEMENT)}>
          العودة لقائمة الاستبدال
        </Button>
      </div>
    )
  }

  const selectedEntries = batch.entries.filter((e) => e.selected)
  const doneCount = selectedEntries.filter((e) => ['success', 'failed', 'skipped'].includes(e.result)).length
  const successCount = selectedEntries.filter((e) => e.result === 'success').length
  const failedCount = selectedEntries.filter((e) => e.result === 'failed').length

  const conflictsUnresolved = selectedEntries.some((e) => {
    if (e.classification !== 'conflict' || e.result !== 'pending') return false
    const resolvedRuleIds = new Set((e.resolvedSchedule || []).filter((d) => d.ruleId).map((d) => String(d.ruleId)))
    const hasBlanket = (e.resolvedSchedule || []).some((d) => !d.ruleId)
    const requiredIds = (e.conflictingRuleIds || []).map(String)
    return requiredIds.length
      ? !requiredIds.every((id) => resolvedRuleIds.has(id) || hasBlanket)
      : !(e.resolvedSchedule || []).length
  })

  const canRun = batch.status === 'draft' || batch.status === 'running'
  const canRetry = ['partial', 'failed'].includes(batch.status) && failedCount > 0
  const canCancel = ['draft', 'running'].includes(batch.status)

  const displayedEntries = selectedEntries.filter(e => {
    if (filterResult === 'all') return true
    return e.result === filterResult
  })

  return (
    <div dir="rtl" className="space-y-6 w-full pb-16">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(ROUTES.ADMIN_TEACHER_REPLACEMENT)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-violet-700 transition-colors cursor-pointer"
        >
          <ArrowRight size={14} />
          العودة لقائمة استبدال المعلمين
        </button>

        <span className="text-xs text-gray-400 font-mono">
          معرّف الدفعة: #{batch._id}
        </span>
      </div>

      <PageHeader
        title="مراجعة وتنفيذ دفعة الاستبدال"
        subtitle={`السبب: ${batch.reason} — تاريخ السريان: ${formatDateAr(batch.effectiveDate)}`}
      />

      {/* Main Status & Controls Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant={BATCH_STATUS_LABELS[batch.status]?.variant || 'gray'}>
              {BATCH_STATUS_LABELS[batch.status]?.label || batch.status}
            </Badge>
            <span className="text-xs font-semibold text-gray-600">
              تمت معالجة {doneCount} من {selectedEntries.length} طالب ({successCount} ناجح، {failedCount} فاشل)
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {canCancel && (
              <Button
                variant="outline"
                size="sm"
                icon={<Ban size={14} />}
                loading={cancelMut.isPending}
                onClick={() => cancelMut.mutate()}
              >
                إلغاء الدفعة
              </Button>
            )}

            {canRetry && (
              <Button
                variant="secondary"
                size="sm"
                icon={<RotateCcw size={14} />}
                loading={retryMut.isPending}
                onClick={() => retryMut.mutate()}
              >
                إعادة محاولة الفاشل ({failedCount})
              </Button>
            )}

            {canRun && (
              <Button
                variant="purple"
                size="sm"
                loading={runMut.isPending}
                disabled={conflictsUnresolved}
                title={conflictsUnresolved ? 'يجب اختيار موعد بديل لكل الطلاب المتعارضين أولاً' : undefined}
                onClick={() => runMut.mutate()}
              >
                {batch.status === 'running' ? 'متابعة التنفيذ' : 'تشغيل الدفعة الآن'}
              </Button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-gray-500 font-medium">
            <span>نسبة إنجاز الدفعة</span>
            <span>{Math.round((doneCount / (selectedEntries.length || 1)) * 100)}%</span>
          </div>
          <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${batch.status === 'completed' ? 'bg-emerald-500' : 'bg-violet-600'}`}
              style={{ width: `${(doneCount / (selectedEntries.length || 1)) * 100}%` }}
            />
          </div>
        </div>

        {batch.sourceTeacherDeactivated && (
          <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
            <ShieldCheck size={16} className="text-amber-600 flex-none" />
            <span>تم إيقاف تفعيل حساب المعلم المغادر تلقائيًا بعد نجاح عملية النقل الكاملة لجميع طلابه.</span>
          </div>
        )}

        {conflictsUnresolved && batch.status === 'draft' && (
          <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-600 flex-none" />
            <span>
              يوجد طلاب بحاجة لمواعيد بديلة أدناه. يرجى اختيار موعد مناسب لكل منهم لتفعيل زر التشغيل.
            </span>
          </div>
        )}
      </div>

      {/* Filter Tabs for Batch Entries */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h4 className="text-xs font-bold text-gray-600">قائمة الطلاب بالدفعة ({selectedEntries.length})</h4>
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs">
          <button
            type="button"
            onClick={() => setFilterResult('all')}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              filterResult === 'all' ? 'bg-white text-violet-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            الكل ({selectedEntries.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterResult('success')}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              filterResult === 'success' ? 'bg-white text-emerald-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            الناجح ({successCount})
          </button>
          {failedCount > 0 && (
            <button
              type="button"
              onClick={() => setFilterResult('failed')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                filterResult === 'failed' ? 'bg-white text-red-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              الفاشل ({failedCount})
            </button>
          )}
        </div>
      </div>

      {/* Entries List */}
      <div className="space-y-2.5">
        {displayedEntries.map((entry) => (
          <div
            key={entry.studentId}
            className="bg-white rounded-xl border border-gray-100 shadow-xs p-4 transition-all"
          >
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                {entry.result === 'success' && <CheckCircle2 size={18} className="text-emerald-600 flex-none" />}
                {entry.result === 'failed' && <XCircle size={18} className="text-red-600 flex-none" />}
                {entry.result === 'pending' && batch.status === 'running' && (
                  <Loader2 size={18} className="text-violet-600 animate-spin flex-none" />
                )}
                {entry.result === 'pending' && batch.status !== 'running' && (
                  <Clock size={18} className="text-gray-400 flex-none" />
                )}
                <span className="text-sm font-bold text-gray-800">
                  {entry.student
                    ? `${entry.student.firstNameAr || ''} ${entry.student.lastNameAr || ''}`.trim()
                    : `طالب #${String(entry.studentId).slice(-6)}`}
                </span>
                <Badge variant={CLASSIFICATION_LABELS[entry.classification]?.variant}>
                  {CLASSIFICATION_LABELS[entry.classification]?.label}
                </Badge>
              </div>

              <Badge variant={RESULT_LABELS[entry.result]?.variant}>
                {RESULT_LABELS[entry.result]?.label}
              </Badge>
            </div>

            {entry.errorMessage && (
              <div className="text-xs text-red-600 bg-red-50/70 border border-red-100 rounded-lg p-2.5 mt-2">
                {entry.errorMessage}
              </div>
            )}

            {/* Conflict resolution chips */}
            {entry.classification === 'conflict' && entry.result === 'pending' && (
              <div className="mt-3 pt-3 border-t border-gray-100 space-y-2.5">
                {(resolutionByStudent.get(entry.studentId) || [])
                  .filter((r) => !r.valid)
                  .map((r) => {
                    const decision = entry.resolvedSchedule?.find((d) => d.ruleId && String(d.ruleId) === String(r.ruleId))
                    return (
                      <div key={r.ruleId} className="space-y-1.5">
                        <div className="text-xs text-gray-600 font-medium">
                          الموعد المتعارض: {r.days?.map((d) => `${dayLabel(d.dayOfWeek)} ${d.time}`).join('، ')} — اختر موعداً بديلاً متاحاً لدى المعلم الجديد:
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {(r.alternatives || []).map((alt) => {
                            const isSelected = decision?.dayOfWeek === alt.dayOfWeek && decision?.time === alt.time
                            return (
                              <button
                                key={`${alt.dayOfWeek}-${alt.time}`}
                                type="button"
                                onClick={() =>
                                  resolveMut.mutate({
                                    studentId: entry.studentId,
                                    resolvedSchedule: [{ ruleId: r.ruleId, ...alt }],
                                  })
                                }
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-violet-600 border-violet-600 text-white shadow-xs'
                                    : 'bg-white border-gray-200 text-gray-700 hover:border-violet-300 hover:bg-violet-50/50'
                                }`}
                              >
                                {dayLabel(alt.dayOfWeek)} {alt.time}
                              </button>
                            )
                          })}
                          {!r.alternatives?.length && (
                            <span className="text-xs text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg">
                              لا توجد مواعيد بديلة متاحة حاليًا لهذا الوقت
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        ))}

        {!displayedEntries.length && (
          <div className="text-center text-xs text-gray-400 py-8 bg-white rounded-xl border border-gray-100">
            لا توجد عناصر في هذا الفلتر
          </div>
        )}
      </div>
    </div>
  )
}
