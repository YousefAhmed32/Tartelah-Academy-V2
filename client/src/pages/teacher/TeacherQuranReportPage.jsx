import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  BookOpen, Save, Send, ArrowRight, CheckCircle2, Clock, Calendar,
  User, ExternalLink, AlertTriangle, Star, HeartHandshake, ShieldAlert
} from 'lucide-react'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Button from '../../components/ui/Button.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import { quranReportService } from '../../services/quranReport.service.js'
import { formatDateAr, formatTimeAr } from '../../utils/date.js'
import { getFileUrl } from '../../config/constants.js'

const inputCls = 'w-full bg-gray-50/80 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-100 transition-all placeholder:text-gray-400'
const textareaCls = 'w-full bg-gray-50/80 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-100 transition-all placeholder:text-gray-400 resize-none'

const LEVEL_OPTIONS = [
  { value: 'excellent', label: 'ممتاز', activeCls: 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-200', idleCls: 'bg-emerald-50/70 text-emerald-800 border-emerald-200/90 hover:bg-emerald-100 hover:border-emerald-300' },
  { value: 'very_good', label: 'جيد جدًا', activeCls: 'bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-200', idleCls: 'bg-blue-50/70 text-blue-800 border-blue-200/90 hover:bg-blue-100 hover:border-blue-300' },
  { value: 'good', label: 'جيد', activeCls: 'bg-amber-600 text-white border-amber-600 shadow-sm ring-2 ring-amber-200', idleCls: 'bg-amber-50/70 text-amber-800 border-amber-200/90 hover:bg-amber-100 hover:border-amber-300' },
  { value: 'needs_followup', label: 'يحتاج متابعة', activeCls: 'bg-rose-600 text-white border-rose-600 shadow-sm ring-2 ring-rose-200', idleCls: 'bg-rose-50/70 text-rose-800 border-rose-200/90 hover:bg-rose-100 hover:border-rose-300' },
]

const STATUS_LABELS = {
  draft: { label: 'مسودة تقرير', variant: 'gray' },
  submitted: { label: 'تم الإرسال — بانتظار المراجعة', variant: 'warning' },
  correction_requested: { label: 'مطلوب تصحيح', variant: 'danger' },
  approved: { label: 'معتمد', variant: 'success' },
}

function LevelSelector({ label, value, onChange, disabled }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-gray-700 block">{label}</label>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {LEVEL_OPTIONS.map(opt => {
          const isSelected = value === opt.value || value === opt.label
          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt.value)}
              className={`min-h-[42px] py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 active:scale-98 ${
                isSelected ? opt.activeCls : opt.idleCls
              } ${disabled ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
            >
              {isSelected && <CheckCircle2 className="w-3.5 h-3.5 flex-none" />}
              <span>{opt.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function TeacherQuranReportPage() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [fields, setFields] = useState({
    todayRecitation: '',
    todayRevision: '',
    nextRecitation: '',
    nextRevision: '',
    nextManners: '',
    nextTajweed: '',
    quranLink: '',
    memorizationLevel: 'excellent',
    revisionLevel: 'excellent',
    tajweedLevel: 'excellent',
    engagementLevel: 'excellent',
    generalEvaluation: '',
    parentNotes: '',
    importantAlert: '',
  })

  const { data: detail, isLoading } = useQuery({
    queryKey: ['teacher', 'quran-report', sessionId],
    queryFn: () => quranReportService.getSessionReport(sessionId).then(r => r.data.data).catch(() => null),
  })

  useEffect(() => {
    if (detail?.report) {
      const r = detail.report
      setFields({
        todayRecitation: r.todayRecitation || (detail.memorization?.map(m => `سورة ${m.surahName || m.surahNumber} من آية ${m.fromAyah || 1} إلى ${m.toAyah || ''}`).join('\n')) || '',
        todayRevision: r.todayRevision || (detail.revision?.map(m => `سورة ${m.surahName || m.surahNumber} من آية ${m.fromAyah || 1} إلى ${m.toAyah || ''}`).join('\n')) || '',
        nextRecitation: r.nextRecitation || r.nextSessionHomework || '',
        nextRevision: r.nextRevision || '',
        nextManners: r.nextManners || '',
        nextTajweed: r.nextTajweed || r.tajweedNotes || '',
        quranLink: r.quranLink || r.referenceLink || '',
        memorizationLevel: r.memorizationLevel || 'excellent',
        revisionLevel: r.revisionLevel || 'excellent',
        tajweedLevel: r.tajweedLevel || 'excellent',
        engagementLevel: r.engagementLevel || 'excellent',
        generalEvaluation: r.generalEvaluation || r.teacherNotes || '',
        parentNotes: r.parentNotes || '',
        importantAlert: r.importantAlert || '',
      })
    }
  }, [detail])

  const set = (k, v) => setFields(p => ({ ...p, [k]: v }))
  const canEdit = !detail?.report || ['draft', 'correction_requested'].includes(detail.report.status)

  const draftMut = useMutation({
    mutationFn: () => quranReportService.saveDraft(sessionId, fields),
    onSuccess: () => {
      toast.success('تم حفظ مسودة التقرير بنجاح')
      qc.invalidateQueries({ queryKey: ['teacher', 'quran-report', sessionId] })
      qc.invalidateQueries({ queryKey: ['teacher', 'quran-reports'] })
    },
    onError: (err) => toast.error(err.response?.data?.message || 'حدث خطأ أثناء حفظ المسودة'),
  })

  const submitMut = useMutation({
    mutationFn: () => {
      if (!fields.todayRecitation?.trim() && !fields.todayRevision?.trim()) {
        throw new Error('يرجى كتابة ما تم تسميعه أو ما تم مراجعته في حلقة اليوم')
      }
      return quranReportService.submitReport(sessionId, fields)
    },
    onSuccess: () => {
      toast.success('تم إرسال تقرير الحلقة للإدارة بنجاح')
      qc.invalidateQueries({ queryKey: ['teacher', 'quran-report', sessionId] })
      qc.invalidateQueries({ queryKey: ['teacher', 'quran-reports'] })
      qc.invalidateQueries({ queryKey: ['teacher', 'sessions'] })
      navigate('/teacher/sessions')
    },
    onError: (err) => toast.error(err.message || err.response?.data?.message || 'حدث خطأ أثناء إرسال التقرير'),
  })

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner color="border-violet-600" />
      </div>
    )
  }

  const session = detail?.session
  const report = detail?.report
  const student = session?.studentId || report?.studentId

  const isSection1Done = Boolean(fields.todayRecitation?.trim() || fields.todayRevision?.trim())
  const isSection2Done = Boolean(fields.nextRecitation?.trim() || fields.nextRevision?.trim() || fields.nextManners?.trim() || fields.nextTajweed?.trim())
  const isSection3Done = Boolean(fields.memorizationLevel && fields.revisionLevel && fields.tajweedLevel && fields.engagementLevel)
  const isSection4Done = Boolean(fields.parentNotes?.trim() || fields.importantAlert?.trim())

  const QUICK_SURAHS = ['سورة البقرة', 'سورة الكهف', 'سورة يس', 'سورة الملك', 'جزء عم', 'جزء تبارك']

  return (
    <div dir="rtl" className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-50 border border-violet-100 text-violet-700 text-xs font-bold mb-2">
            <span>📋 تقرير الحلقة – ترتيلة online</span>
          </div>
          <h1 className="font-heading font-extrabold text-2xl text-gray-900">
            تقرير الحصة القرآنية
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            توثيق إنجاز الطالب في الحصة وتحديد مهام اللقاء القادم والتقييم لولي الأمر
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} icon={<ArrowRight className="w-4 h-4" />}>
          الرجوع للحصص
        </Button>
      </div>

      {/* Session Dossier Banner */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar
            src={getFileUrl(student?.avatar)}
            firstName={student?.firstNameAr}
            lastName={student?.lastNameAr}
            size="md"
            className="ring-2 ring-violet-50"
          />
          <div>
            <div className="font-heading font-bold text-gray-900 text-base flex items-center gap-2">
              <span>الطالب: {student?.firstNameAr} {student?.lastNameAr || ''}</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 border border-violet-100">
                طالب الأكاديمية
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1 flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                {formatDateAr(session?.scheduledAt || report?.createdAt)}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                {formatTimeAr(session?.scheduledAt || report?.createdAt)} ({session?.durationMinutes || 30} دقيقة)
              </span>
            </div>
          </div>
        </div>

        {report && (
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-start sm:justify-end">
            <Badge variant={STATUS_LABELS[report.status]?.variant || 'gray'}>
              {STATUS_LABELS[report.status]?.label || report.status}
            </Badge>
            {report.status === 'correction_requested' && report.correctionReason && (
              <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-medium">
                <AlertTriangle className="w-4 h-4 flex-none" />
                <span>طلب الإدارة: {report.correctionReason}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Completion Readiness Checklist */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-3 flex-wrap">
        <span className="text-xs font-bold text-gray-700">مراحل اكتمال التقرير:</span>
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { label: 'إنجاز اليوم', done: isSection1Done },
            { label: 'المطلوب للقادمة', done: isSection2Done },
            { label: 'تقييم المعلم', done: isSection3Done },
            { label: 'ملاحظات وتنبيهات', done: isSection4Done, optional: true },
          ].map((step, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                step.done
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : step.optional
                  ? 'bg-gray-50 text-gray-500 border-gray-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              {step.done ? (
                <CheckCircle2 size={13} className="text-emerald-600" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-amber-400" />
              )}
              <span>{step.label}</span>
              {step.optional && !step.done && <span className="text-[10px] text-gray-400 font-normal">(اختياري)</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Main Report Form */}
      <div className="space-y-6">

        {/* 📖 أولاً: إنجاز الحلقة */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center flex-none">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-heading font-bold text-base text-gray-900">📖 أولًا: إنجاز الحلقة</h2>
                <p className="text-xs text-gray-400">ما تم إنجازه وتسميعه ومراجعته خلال حلقة اليوم</p>
              </div>
            </div>

            {/* Quick Surah tags helper */}
            {canEdit && (
              <div className="flex items-center gap-1 flex-wrap text-xs">
                <span className="text-[11px] text-gray-400">إدراج سريع:</span>
                {QUICK_SURAHS.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      const cur = fields.todayRecitation.trim()
                      set('todayRecitation', cur ? `${cur}، ${s}` : s)
                    }}
                    className="px-2 py-0.5 rounded-lg bg-gray-50 hover:bg-violet-50 border border-gray-200 hover:border-violet-200 text-gray-600 hover:text-violet-700 text-[11px] font-semibold transition-all"
                  >
                    +{s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="text-xs font-bold text-gray-700 mb-1.5 block">
                ما تم تسميعه في حلقة اليوم: *
              </label>
              <textarea
                disabled={!canEdit}
                rows={3}
                className={textareaCls}
                placeholder="اكتب السورة ورقم الآيات التي تم تسميعها اليوم..."
                value={fields.todayRecitation}
                onChange={e => set('todayRecitation', e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 mb-1.5 block">
                ما تم مراجعته:
              </label>
              <textarea
                disabled={!canEdit}
                rows={3}
                className={textareaCls}
                placeholder="اكتب أجزاء أو سور المراجعة (الماضي القريب أو البعيد)..."
                value={fields.todayRevision}
                onChange={e => set('todayRevision', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* 🎯 ثانياً: الإنجاز المطلوب للحلقة القادمة */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center flex-none">
              <HeartHandshake className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-base text-gray-900">🎯 ثانيًا: الإنجاز المطلوب للحلقة القادمة</h2>
              <p className="text-xs text-gray-400">الواجبات والتحضير المحدد للطالب حتى موعد اللقاء القادم</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="text-xs font-bold text-gray-700 mb-1.5 block">التسميع المطلوب:</label>
              <input
                disabled={!canEdit}
                className={inputCls}
                placeholder="السورة والآيات المطلوب حفظها وتسميعها..."
                value={fields.nextRecitation}
                onChange={e => set('nextRecitation', e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 mb-1.5 block">المراجعة المطلوبة:</label>
              <input
                disabled={!canEdit}
                className={inputCls}
                placeholder="السور المطلوب مراجعتها وتثبيتها..."
                value={fields.nextRevision}
                onChange={e => set('nextRevision', e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 mb-1.5 block">الآداب / الأحاديث:</label>
              <input
                disabled={!canEdit}
                className={inputCls}
                placeholder="الحديث النبوي أو الأدب الإسلامي المطلوب دراسته..."
                value={fields.nextManners}
                onChange={e => set('nextManners', e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 mb-1.5 block">التجويد:</label>
              <input
                disabled={!canEdit}
                className={inputCls}
                placeholder="حكم التجويد أو القاعدة المطلوب تطبيقها..."
                value={fields.nextTajweed}
                onChange={e => set('nextTajweed', e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <span>🔗 رابط المصحف أو المرجع:</span>
                <span className="text-[11px] text-gray-400 font-normal">(اختياري — رابط مصحف رقمي أو تلاوة مقترحة)</span>
              </label>
              <div className="relative">
                <input
                  disabled={!canEdit}
                  className={`${inputCls} ps-10`}
                  placeholder="https://quran.com/..."
                  value={fields.quranLink}
                  onChange={e => set('quranLink', e.target.value)}
                />
                <ExternalLink className="w-4 h-4 text-gray-400 absolute start-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>
        </div>

        {/* ⭐ ثالثاً: تقييم المعلم للطالب */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-none">
              <Star className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-base text-gray-900">⭐ ثالثًا: تقييم المعلم للطالب</h2>
              <p className="text-xs text-gray-400">تقييم معايير الأداء الأربعة خلال الحلقة وملاحظات المعلم العامة</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
            <LevelSelector
              label="مستوى الحفظ والتسميع:"
              value={fields.memorizationLevel}
              onChange={v => set('memorizationLevel', v)}
              disabled={!canEdit}
            />

            <LevelSelector
              label="مستوى المراجعة:"
              value={fields.revisionLevel}
              onChange={v => set('revisionLevel', v)}
              disabled={!canEdit}
            />

            <LevelSelector
              label="التجويد والتلاوة:"
              value={fields.tajweedLevel}
              onChange={v => set('tajweedLevel', v)}
              disabled={!canEdit}
            />

            <LevelSelector
              label="الالتزام والتفاعل أثناء الحلقة:"
              value={fields.engagementLevel}
              onChange={v => set('engagementLevel', v)}
              disabled={!canEdit}
            />
          </div>

          <div className="pt-2 border-t border-gray-50">
            <label className="text-xs font-bold text-gray-700 mb-1.5 block">التقييم العام للطالب:</label>
            <textarea
              disabled={!canEdit}
              rows={2}
              className={textareaCls}
              placeholder="اكتب ملاحظاتك الشاملة حول تركيز الطالب وتقدمه خلال الحلقة..."
              value={fields.generalEvaluation}
              onChange={e => set('generalEvaluation', e.target.value)}
            />
          </div>
        </div>

        {/* 👨‍👩‍👧 رابعاً: ملاحظات لولي الأمر والتنبيهات */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center flex-none">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-base text-gray-900">👨‍👩‍👧 رابعًا: ملاحظات لولي الأمر</h2>
              <p className="text-xs text-gray-400">توجيهات مباشرة للأسرة لدعم متابعة الطالب في المنزل</p>
            </div>
          </div>

          <div className="space-y-4 pt-1">
            <div>
              <label className="text-xs font-bold text-gray-700 mb-1.5 block">
                ملاحظات لولي الأمر:
              </label>
              <textarea
                disabled={!canEdit}
                rows={3}
                className={textareaCls}
                placeholder="اكتب توجيهاتك الكريمة لولي الأمر للمساعدة في تثبيت الحفظ والمتابعة..."
                value={fields.parentNotes}
                onChange={e => set('parentNotes', e.target.value)}
              />
            </div>

            {/* 📌 تنبيه */}
            <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/80 space-y-1.5">
              <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span>📌 تنبيه خاص (هام):</span>
              </label>
              <input
                disabled={!canEdit}
                className="w-full bg-white border border-amber-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition-all placeholder:text-amber-400"
                placeholder="تنبيه عن مواعيد، أو تغييرات، أو ملاحظة تستدعي اهتماماً عاجلاً..."
                value={fields.importantAlert}
                onChange={e => set('importantAlert', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Actions bar */}
        {canEdit && (
          <div className="sticky bottom-4 z-20 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-gray-200/80 shadow-lg flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-gray-500">
              يرجى التأكد من دقة التقرير قبل الإرسال — سيظهر مباشرة للإدارة وولي الأمر بعد اعتماده.
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                icon={<Save className="w-4 h-4" />}
                loading={draftMut.isPending}
                onClick={() => draftMut.mutate()}
              >
                حفظ كمسودة
              </Button>
              <Button
                variant="purple"
                icon={<Send className="w-4 h-4" />}
                loading={submitMut.isPending}
                onClick={() => submitMut.mutate()}
              >
                إرسال التقرير الآن
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
