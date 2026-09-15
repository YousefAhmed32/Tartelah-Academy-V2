import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import api from '../../utils/api.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Button from '../../components/ui/Button.jsx'
import Modal from '../../components/ui/Modal.jsx'
import ProgressRing from '../../components/shared/ProgressRing.jsx'
import WalletBalanceCard from '../../components/shared/WalletBalanceCard.jsx'
import LessonTransactionTable from '../../components/shared/LessonTransactionTable.jsx'
import { renewalService } from '../../services/renewal.service.js'
import { surveyService } from '../../services/survey.service.js'
import SurveyPromptModal from '../../components/student/SurveyPromptModal.jsx'
import { formatDateAr } from '../../utils/date.js'
import { formatCurrency } from '../../utils/format.js'
import { getFileUrl, ROUTES } from '../../config/constants.js'
import { QK } from '../../services/queryKeys.js'
import {
  Check,
  Copy,
  CreditCard,
  Smartphone,
  UploadCloud,
  X,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Building2,
  ExternalLink,
  FileText,
} from 'lucide-react'

const inputCls = 'w-full h-10 bg-gray-50 border border-gray-200 rounded-xl px-3.5 text-sm text-gray-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all'
const RENEWAL_STATUS_LABELS = {
  pending: { label: 'بانتظار رفع إثبات الدفع', variant: 'gray' },
  under_review: { label: 'قيد المراجعة', variant: 'warning' },
  approved: { label: 'تم التجديد', variant: 'success' },
  rejected: { label: 'مرفوض', variant: 'danger' },
  cancelled: { label: 'ملغى', variant: 'gray' },
  expired: { label: 'منتهي الصلاحية', variant: 'gray' },
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.2, 0.7, 0.2, 1] },
})

export default function StudentSubscriptionPage() {
  const [renewOpen, setRenewOpen] = useState(false)
  const [activeSurvey, setActiveSurvey] = useState(null)
  const [isRenewalGate, setIsRenewalGate] = useState(false)
  const [isCheckingSurvey, setIsCheckingSurvey] = useState(false)
  const [surveyPrefill, setSurveyPrefill] = useState(null)

  const { data: pendingSurvey } = useQuery({
    queryKey: ['student', 'survey', 'pending'],
    queryFn: () => surveyService.getMyPending().then(r => r.data.data).catch(() => null),
  })

  const { data, isLoading } = useQuery({
    queryKey: QK.MY_SUBSCRIPTION,
    queryFn: () => api.get('/subscriptions/me').then(r => r.data.data).catch(() => null),
    retry: false,
  })

  const handleInitiateRenewal = async () => {
    if (!data?._id) return
    setIsCheckingSurvey(true)
    try {
      const res = await surveyService.ensureForSubscription(data._id)
      const { survey, requiresSurvey } = res.data.data
      if (requiresSurvey) {
        setActiveSurvey(survey)
        setIsRenewalGate(true)
      } else {
        setRenewOpen(true)
      }
    } catch {
      if (pendingSurvey) {
        setActiveSurvey(pendingSurvey)
        setIsRenewalGate(true)
      } else {
        setRenewOpen(true)
      }
    } finally {
      setIsCheckingSurvey(false)
    }
  }

  // Lesson entitlement now lives on the wallet, not the subscription's
  // calendar dates — see WalletBalanceCard.jsx / ARCHITECTURE_PLAN.md's
  // Lesson Wallet section.
  const { data: walletData } = useQuery({
    queryKey: QK.MY_WALLET,
    queryFn: () => api.get('/wallet/me').then(r => r.data.data),
    enabled: !!data,
  })

  if (isLoading) {
    return (
      <div dir="rtl" className="animate-pulse flex flex-col gap-4">
        <div className="skeleton-light h-10 w-48 rounded-xl" />
        <div className="skeleton-light h-48 rounded-card" />
        <div className="grid grid-cols-2 gap-4">
          <div className="skeleton-light h-28 rounded-card" />
          <div className="skeleton-light h-28 rounded-card" />
        </div>
      </div>
    )
  }

  if (!data) return <EmptySubscription />

  const now = new Date()
  const endDate = new Date(data.endDate)
  const startDate = new Date(data.startDate)
  const totalDays = Math.ceil((endDate - startDate) / 86400000)
  const daysLeft = Math.max(0, Math.ceil((endDate - now) / 86400000))
  const daysUsed = Math.max(0, totalDays - daysLeft)
  const pct = Math.min(100, Math.max(0, Math.round((daysLeft / totalDays) * 100)))

  const statusColor = data.status === 'active' ? '#22c55e' : data.status === 'paused' ? '#f59e0b' : '#ef4444'
  const statusLabel = data.status === 'active' ? 'فعال' : data.status === 'paused' ? 'موقوف' : 'منتهٍ'

  const urgency = daysLeft <= 0 ? 'expired'
    : daysLeft <= 7 ? 'critical'
    : daysLeft <= 14 ? 'warning'
    : 'ok'

  return (
    <div dir="rtl">
      <PageHeader title="اشتراكي" subtitle="تفاصيل الباقة وحالة الاشتراك" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ═══ MAIN SUBSCRIPTION CARD ═══ */}
        <motion.div {...fadeUp(0)} className="lg:col-span-2">
          <div className="card-light overflow-hidden">
            {/* Header gradient */}
            <div
              className="px-6 py-5"
              style={{ background: 'linear-gradient(135deg, #1d0a3f 0%, #2e1065 100%)' }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[12px] font-semibold mb-1" style={{ color: 'rgba(167,143,214,0.7)' }}>
                    باقتك الحالية
                  </div>
                  <h2 className="font-heading font-bold text-2xl text-white mb-1">
                    {data.packageId?.nameAr || 'الباقة الأساسية'}
                  </h2>
                  {data.packageId?.descriptionAr && (
                    <p className="text-sm" style={{ color: '#a78fd6' }}>{data.packageId.descriptionAr}</p>
                  )}
                </div>
                <div
                  className="px-3 py-1.5 rounded-full text-xs font-bold flex-none"
                  style={{
                    background: `${statusColor}20`,
                    color: statusColor,
                    border: `1px solid ${statusColor}40`,
                  }}
                >
                  {statusLabel}
                </div>
              </div>
            </div>

            {/* Details grid */}
            <div className="p-6">
              {/* Urgency alert */}
              {(urgency === 'critical' || urgency === 'expired') && (
                <div
                  className="flex items-center gap-3 p-4 rounded-[14px] mb-5"
                  style={{
                    background: urgency === 'expired' ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)',
                    border: `1px solid ${urgency === 'expired' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`,
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" stroke={urgency === 'expired' ? '#ef4444' : '#f59e0b'} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <div>
                    <div className="font-semibold text-sm" style={{ color: urgency === 'expired' ? '#ef4444' : '#d97706' }}>
                      {urgency === 'expired' ? 'انتهى اشتراكك' : `اشتراكك سينتهي خلال ${daysLeft} أيام`}
                    </div>
                    <div className="text-xs text-[#7c6aaa] mt-0.5">
                      {urgency === 'expired' ? 'سجّل في برنامج جديد للاستمرار' : 'تواصل مع الإدارة لتجديد اشتراكك'}
                    </div>
                  </div>
                  <button
                    onClick={handleInitiateRenewal}
                    disabled={isCheckingSurvey}
                    className="btn-gold px-4 py-2 rounded-xl text-xs font-bold flex-none mr-auto disabled:opacity-60"
                  >
                    {isCheckingSurvey ? 'تحقق...' : 'تجديد'}
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'تاريخ البدء',       value: formatDateAr(data.startDate) },
                  { label: 'تاريخ الانتهاء',     value: formatDateAr(data.endDate) },
                  { label: 'الحصص شهرياً',       value: `${data.packageId?.sessionsPerMonth || 0} حصة` },
                  { label: 'الحصص المتبقية',     value: `${walletData?.wallet?.remaining ?? data.sessionsRemaining ?? 0} حصة` },
                ].map((item, i) => (
                  <div key={i} className="p-4 rounded-[14px]" style={{ background: '#f8f5ff' }}>
                    <div className="text-xs text-[#7c6aaa] mb-1">{item.label}</div>
                    <div className="font-heading font-bold text-brand-textBody">{item.value}</div>
                  </div>
                ))}
              </div>

              {/* Days progress bar */}
              <div className="mt-5">
                <div className="flex justify-between text-xs text-[#7c6aaa] mb-2">
                  <span>{daysUsed} يوم مضى</span>
                  <span>{daysLeft} يوم متبقي</span>
                </div>
                <div className="w-full bg-[#f0ecf8] rounded-full h-2.5 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background: urgency === 'expired' ? '#ef4444'
                        : urgency === 'critical' ? '#f59e0b'
                        : urgency === 'warning' ? '#f59e0b'
                        : 'linear-gradient(90deg, #7c3aed, #a855f7)',
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ═══ DAYS REMAINING RING ═══ */}
        <motion.div {...fadeUp(0.08)}>
          <div className="card-light p-6 flex flex-col items-center text-center h-full justify-center gap-4">
            <ProgressRing
              percent={pct}
              color={urgency === 'ok' ? undefined : urgency === 'warning' ? '#f59e0b' : '#ef4444'}
            >
              <div className="font-heading font-extrabold text-3xl text-brand-textBody">{daysLeft}</div>
              <div className="text-[11px] text-[#7c6aaa]">يوم</div>
            </ProgressRing>

            <div>
              <div className="font-heading font-bold text-lg text-brand-textBody">أيام متبقية</div>
              <div className="text-sm text-[#7c6aaa] mt-1">من أصل {totalDays} يوم</div>
            </div>

            <div
              className="w-full py-3 px-4 rounded-[14px] text-center"
              style={{ background: '#f8f5ff', border: '1px solid #ede8f7' }}
            >
              <div className="text-xs text-[#7c6aaa] mb-1">ينتهي في</div>
              <div className="font-semibold text-sm text-brand-textBody">{formatDateAr(data.endDate)}</div>
            </div>

            <button
              onClick={handleInitiateRenewal}
              disabled={isCheckingSurvey}
              className="w-full text-center py-2.5 rounded-xl text-sm font-bold text-brand-purple hover:text-brand-purpleDark transition-colors disabled:opacity-60 cursor-pointer"
              style={{ background: 'rgba(124,58,237,0.06)' }}
            >
              {isCheckingSurvey ? 'جاري التحقق...' : '+ تجديد الاشتراك'}
            </button>
          </div>
        </motion.div>
      </div>

      {/* ═══ LESSON WALLET ═══ */}
      {walletData?.wallet && (
        <div className="mt-6">
          <WalletBalanceCard wallet={walletData.wallet} />
        </div>
      )}

      {/* ═══ TRANSACTION HISTORY ═══ */}
      {walletData?.transactions && (
        <motion.div {...fadeUp(0.1)} className="mt-6">
          <div className="card-light p-6">
            <h3 className="font-heading font-bold text-base text-brand-textBody mb-4">سجل حركات الرصيد</h3>
            <LessonTransactionTable transactions={walletData.transactions} />
          </div>
        </motion.div>
      )}

      {/* ═══ PAYMENT INSTRUCTIONS ═══ */}
      <motion.div {...fadeUp(0.15)} className="mt-6">
        <div className="card-light p-6">
          <h3 className="font-heading font-bold text-base text-brand-textBody mb-4 flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="5" width="20" height="14" rx="2" stroke="#7c3aed" strokeWidth="1.7"/>
              <path d="M2 10h20" stroke="#7c3aed" strokeWidth="1.7" strokeLinecap="round"/>
            </svg>
            معلومات الدفع والتجديد
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-[14px]" style={{ background: 'rgba(232,199,106,0.08)', border: '1px solid rgba(232,199,106,0.2)' }}>
              <div className="font-semibold text-sm text-brand-textBody mb-2">التحويل البنكي</div>
              <div className="text-sm text-[#7c6aaa] space-y-1">
                <div>البنك: <span className="font-semibold text-brand-textBody">بنك الراجحي</span></div>
                <div>IBAN: <span className="font-semibold text-brand-textBody text-xs">SA00 0000 0000 0000 0000 0000</span></div>
                <div>الاسم: <span className="font-semibold text-brand-textBody">أكاديمية ترتيلة</span></div>
              </div>
            </div>
            <div className="p-4 rounded-[14px]" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}>
              <div className="font-semibold text-sm text-brand-textBody mb-2">خطوات التجديد</div>
              <ol className="text-sm text-[#7c6aaa] space-y-1 list-none">
                {['حوّل المبلغ عبر التطبيق البنكي', 'اضغط "تجديد" أعلاه واختر الباقة', 'ارفع صورة إثبات الدفع', 'انتظر موافقة الإدارة'].map((step, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="font-bold text-brand-purple text-xs mt-0.5 flex-none w-4">{i + 1}.</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 px-4 py-3 rounded-[12px]" style={{ background: '#f8f5ff' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.4A8 8 0 1 1 21 12Z" stroke="#7c3aed" strokeWidth="1.7" strokeLinejoin="round"/>
            </svg>
            <p className="text-sm text-[#7c6aaa]">
              للاستفسار والدعم تواصل معنا عبر{' '}
              <span className="font-bold text-brand-purple">support@tartelah.com</span>
            </p>
          </div>
        </div>
      </motion.div>

      <RenewalHistorySection />
      {renewOpen && (
        <RenewalModal
          subscription={data}
          surveyFeedback={surveyPrefill}
          onClose={() => {
            setRenewOpen(false)
            setSurveyPrefill(null)
          }}
        />
      )}
      {(activeSurvey || (pendingSurvey && !renewOpen)) && (
        <SurveyPromptModal
          survey={activeSurvey || pendingSurvey}
          isRenewalGate={isRenewalGate}
          onClose={() => {
            setActiveSurvey(null)
            setIsRenewalGate(false)
          }}
          onCompleted={(submittedSurvey) => {
            setActiveSurvey(null)
            if (isRenewalGate) {
              setSurveyPrefill(submittedSurvey)
              setRenewOpen(true)
            }
            setIsRenewalGate(false)
          }}
        />
      )}
    </div>
  )
}

// ── Renewal request modal (Enhanced with 2 options, payment info, optional proof) ──
function RenewalModal({ subscription, surveyFeedback, onClose }) {
  const qc = useQueryClient()
  const currentPkg = subscription.packageId
  const teacher = subscription.teacherId
  const teacherName = teacher
    ? `${teacher.firstNameAr || ''} ${teacher.lastNameAr || ''}`.trim()
    : 'معلمك الحالي'

  const [renewalType, setRenewalType] = useState('same') // 'same' | 'custom'
  const [selectedPackageId, setSelectedPackageId] = useState(currentPkg?._id || '')
  const [studentNotes, setStudentNotes] = useState('')
  const [proofFile, setProofFile] = useState(null)
  const [filePreview, setFilePreview] = useState(null)
  const [copiedKey, setCopiedKey] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: packages = [] } = useQuery({
    queryKey: ['packages'],
    queryFn: () => api.get('/packages').then((r) => r.data.data || []),
  })

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    toast.success('تم النسخ بنجاح')
    setTimeout(() => setCopiedKey(null), 2500)
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      toast.error('حجم الملف لا يتجاوز 10 ميجابايت')
      return
    }
    setProofFile(file)
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (ev) => setFilePreview(ev.target.result)
      reader.readAsDataURL(file)
    } else {
      setFilePreview(null)
    }
  }

  const handleRemoveFile = () => {
    setProofFile(null)
    setFilePreview(null)
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    const effectivePackageId =
      renewalType === 'same'
        ? currentPkg?._id || selectedPackageId
        : selectedPackageId

    try {
      const res = await renewalService.submitRequest(subscription._id, {
        packageId: effectivePackageId,
        studentNotes: studentNotes.trim() || undefined,
      })

      const created = res.data.data
      if (proofFile && created?._id) {
        try {
          await renewalService.uploadProof(created._id, proofFile)
          toast.success('تم إرسال طلب التجديد مع إثبات الدفع بنجاح! سيتم مراجعته فوراً.')
        } catch {
          toast.success('تم إنشاء طلب التجديد. يرجى رفع إثبات الدفع لاحقاً من القائمة.')
        }
      } else {
        toast.success('تم تسجيل طلب التجديد بنجاح! يمكنك إرسال إثبات الدفع لاحقاً.')
      }

      qc.invalidateQueries({ queryKey: ['student', 'renewal-requests'] })
      qc.invalidateQueries({ queryKey: QK.MY_SUBSCRIPTION })
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'حدث خطأ أثناء إرسال طلب التجديد')
    } finally {
      setIsSubmitting(false)
    }
  }

  const chosenPkg =
    renewalType === 'same'
      ? currentPkg
      : packages.find((p) => p._id === selectedPackageId) || currentPkg

  return (
    <Modal
      open
      size="lg"
      onClose={onClose}
      title="طلب تجديد الاشتراك"
      footer={
        <div className="flex items-center justify-between w-full gap-3">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            إلغاء
          </Button>
          <Button
            variant="purple"
            loading={isSubmitting}
            onClick={handleSubmit}
            className="px-6 shadow-md shadow-brand-purple/20"
          >
            {proofFile ? 'إرسال طلب التجديد مع إثبات الدفع' : 'تأكيد وإرسال طلب التجديد'}
          </Button>
        </div>
      }
    >
      <div dir="rtl" className="space-y-5">
        {/* ── Option 1 vs Option 2 Tabs ── */}
        <div>
          <label className="text-xs font-bold text-gray-600 mb-2 block">
            اختر نوع التجديد المطلوب:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Same Package Option */}
            <button
              type="button"
              onClick={() => {
                setRenewalType('same')
                if (currentPkg?._id) setSelectedPackageId(currentPkg._id)
              }}
              className={`p-4 rounded-2xl border text-right transition-all flex flex-col justify-between relative overflow-hidden ${
                renewalType === 'same'
                  ? 'border-brand-purple bg-purple-50/60 ring-2 ring-brand-purple/20 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-brand-purple/10 text-brand-purple">
                  موصى به
                </span>
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    renewalType === 'same'
                      ? 'border-brand-purple bg-brand-purple text-white'
                      : 'border-gray-300 bg-white'
                  }`}
                >
                  {renewalType === 'same' && <Check size={12} strokeWidth={3} />}
                </div>
              </div>
              <div>
                <h4 className="font-bold text-sm text-gray-900 mb-1">
                  تجديد نفس الباقة الحالية
                </h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  الاستمرار مع {teacherName} بنفس المواعيد والجدول الأسبوعي المعتاد.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-purple-100/80 flex items-center justify-between text-xs">
                <span className="text-gray-500 font-medium">
                  {currentPkg?.nameAr || 'الباقة الحالية'}
                </span>
                {currentPkg?.price !== undefined && (
                  <span className="font-bold text-brand-purple">
                    {formatCurrency(currentPkg.price)}
                  </span>
                )}
              </div>
            </button>

            {/* Custom/Different Package Option */}
            <button
              type="button"
              onClick={() => setRenewalType('custom')}
              className={`p-4 rounded-2xl border text-right transition-all flex flex-col justify-between relative overflow-hidden ${
                renewalType === 'custom'
                  ? 'border-brand-purple bg-purple-50/60 ring-2 ring-brand-purple/20 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  تغيير أو ترقية
                </span>
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    renewalType === 'custom'
                      ? 'border-brand-purple bg-brand-purple text-white'
                      : 'border-gray-300 bg-white'
                  }`}
                >
                  {renewalType === 'custom' && <Check size={12} strokeWidth={3} />}
                </div>
              </div>
              <div>
                <h4 className="font-bold text-sm text-gray-900 mb-1">
                  اختيار أو ترقية باقة أخرى
                </h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  تغيير عدد الحصص الأسبوعية أو الانتقال إلى باقة مكثفة أخرى.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                <span>تحديد الباقة من القائمة</span>
              </div>
            </button>
          </div>
        </div>

        {/* ── If Custom Package selected, show Package Dropdown ── */}
        {renewalType === 'custom' && (
          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
            <label className="text-xs font-bold text-gray-700 block">
              اختر الباقة الجديدة:
            </label>
            <select
              className={inputCls}
              value={selectedPackageId}
              onChange={(e) => setSelectedPackageId(e.target.value)}
            >
              {(packages || []).map((p) => (
                <option key={p._id} value={p._id}>
                  {p.nameAr} — {formatCurrency(p.price)} ({p.sessionsPerMonth || 8} حصص شهرياً)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Teacher Change Alert if flagged in Survey */}
        {surveyFeedback?.requestTeacherChange ? (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertCircle size={18} className="text-amber-600 flex-none mt-0.5" />
            <div>
              <span className="font-bold block mb-0.5">طلب تغيير المعلم مسجّل:</span>
              <span>
                لقد اخترت في استبيان التقييم طلب تغيير المعلم. سيتم التنسيق معك من قِبل إدارة الأكاديمية لاختيار المعلم البديل والموعد المناسب.
              </span>
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-emerald-50/60 border border-emerald-100 p-2.5 text-xs text-emerald-800 flex items-center gap-2">
            <Sparkles size={15} className="text-emerald-600 flex-none" />
            <span>
              {renewalType === 'same'
                ? `سيستمر اشتراكك مع نفس المعلم (${teacherName}) ونفس المواعيد السابقة دون انقطاع.`
                : 'سيتم اعتماد الباقة الجديدة مع تنسيق المواعيد مع المعلم أو إدارة الأكاديمية.'}
            </span>
          </div>
        )}

        {/* ── Official Academy Payment Methods Card ── */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
              <CreditCard size={18} className="text-brand-purple" />
              <span>بيانات ووسائل التحويل المعتمدة للأكاديمية</span>
            </div>
            {chosenPkg?.price !== undefined && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                المبلغ المطلوب: {formatCurrency(chosenPkg.price)}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Bank Transfer */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
              <div className="flex items-center justify-between font-bold text-gray-800">
                <span className="flex items-center gap-1.5">
                  <Building2 size={14} className="text-brand-purple" />
                  <span>التحويل البنكي (السعودية والخليج)</span>
                </span>
                <span className="text-[11px] text-gray-500 font-normal">بنك الراجحي</span>
              </div>
              <div className="bg-white rounded-lg p-2 border border-slate-200 flex items-center justify-between font-mono">
                <span className="text-[11px] text-gray-800 font-semibold truncate">
                  SA00 0000 0000 0000 0000 0000
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy('SA00 0000 0000 0000 0000 0000', 'iban')}
                  className="flex items-center gap-1 text-xs text-brand-purple hover:text-brand-purpleDark ms-2 flex-none px-2 py-1 rounded bg-purple-50 hover:bg-purple-100 transition-colors"
                >
                  {copiedKey === 'iban' ? (
                    <>
                      <Check size={12} className="text-emerald-600" />
                      <span className="text-emerald-600 font-bold">تم</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      <span>نسخ</span>
                    </>
                  )}
                </button>
              </div>
              <div className="text-[11px] text-gray-500">
                اسم الحساب: <span className="text-gray-800 font-semibold">أكاديمية ترتيلة</span>
              </div>
            </div>

            {/* Mobile Wallets / Vodafone Cash / STC Pay */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
              <div className="flex items-center justify-between font-bold text-gray-800">
                <span className="flex items-center gap-1.5">
                  <Smartphone size={14} className="text-emerald-600" />
                  <span>المحافظ الإلكترونية والتحويل السريع</span>
                </span>
              </div>

              {/* Egypt Vodafone Cash / InstaPay */}
              <div className="bg-white rounded-lg p-2 border border-slate-200 flex items-center justify-between">
                <div className="truncate">
                  <span className="text-[11px] text-gray-500 block">فودافون كاش / إنستاباي (مصر):</span>
                  <span className="font-mono font-bold text-gray-800 text-xs">01050400096</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy('01050400096', 'voda')}
                  className="flex items-center gap-1 text-xs text-brand-purple hover:text-brand-purpleDark ms-2 flex-none px-2 py-1 rounded bg-purple-50 hover:bg-purple-100 transition-colors"
                >
                  {copiedKey === 'voda' ? (
                    <>
                      <Check size={12} className="text-emerald-600" />
                      <span className="text-emerald-600 font-bold">تم</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      <span>نسخ</span>
                    </>
                  )}
                </button>
              </div>

              {/* STC Pay / WhatsApp */}
              <div className="bg-white rounded-lg p-2 border border-slate-200 flex items-center justify-between">
                <div className="truncate">
                  <span className="text-[11px] text-gray-500 block">STC Pay / واتساب الدعم المباشر:</span>
                  <span className="font-mono font-bold text-gray-800 text-xs">+966 56 744 3805</span>
                </div>
                <div className="flex items-center gap-1">
                  <a
                    href="https://wa.me/966567443805"
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                    title="مراسلة المالية عبر واتساب"
                  >
                    <ExternalLink size={13} />
                  </a>
                  <button
                    type="button"
                    onClick={() => handleCopy('+966567443805', 'stc')}
                    className="flex items-center gap-1 text-xs text-brand-purple hover:text-brand-purpleDark px-2 py-1 rounded bg-purple-50 hover:bg-purple-100 transition-colors"
                  >
                    {copiedKey === 'stc' ? (
                      <>
                        <Check size={12} className="text-emerald-600" />
                        <span className="text-emerald-600 font-bold">تم</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span>نسخ</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Optional Payment Proof Upload ── */}
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <UploadCloud size={16} className="text-brand-purple" />
              <span>إرفاق إثبات التحويل أو الدفع (اختياري الآن)</span>
            </label>
            <span className="text-[11px] text-gray-500">
              يمكن الإرسال لاحقاً عبر واتساب أو الملف الشخصي
            </span>
          </div>

          {!proofFile ? (
            <label className="flex flex-col items-center justify-center p-4 border border-dashed border-gray-300 rounded-xl bg-white hover:bg-purple-50/30 hover:border-brand-purple/40 cursor-pointer transition-all text-center">
              <UploadCloud size={28} className="text-gray-400 mb-1.5" />
              <span className="text-xs font-bold text-brand-purple">
                اضغط لاختيار صورة إيصال التحويل البنكي أو السداد
              </span>
              <span className="text-[11px] text-gray-400 mt-0.5">
                PNG, JPG, PDF (بحد أقصى 10 ميجابايت)
              </span>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          ) : (
            <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-emerald-200">
              <div className="flex items-center gap-2.5 overflow-hidden">
                {filePreview ? (
                  <img
                    src={filePreview}
                    alt="Preview"
                    className="w-11 h-11 rounded-lg object-cover border border-gray-200 flex-none"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-lg bg-purple-50 text-brand-purple flex items-center justify-center flex-none">
                    <FileText size={20} />
                  </div>
                )}
                <div className="truncate">
                  <div className="text-xs font-bold text-gray-800 truncate">
                    {proofFile.name}
                  </div>
                  <div className="text-[11px] text-emerald-600 font-medium">
                    {(proofFile.size / 1024).toFixed(1)} ك.ب — جاهز للإرسال مع الطلب
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemoveFile}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="إلغاء الملف"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>

        {/* ── Student Notes (Optional) ── */}
        <div>
          <label className="text-xs font-bold text-gray-700 mb-1.5 block">
            ملاحظات أو رغبات إضافية (اختياري)
          </label>
          <textarea
            className={`${inputCls} h-16 py-2 resize-none text-xs`}
            placeholder="اكتب أي ملاحظة للإدارة أو بخصوص المواعيد إن وُجدت..."
            value={studentNotes}
            onChange={(e) => setStudentNotes(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  )
}


function RenewalHistorySection() {
  const { data: requests } = useQuery({ queryKey: ['student', 'renewal-requests'], queryFn: () => renewalService.getMyRequests().then(r => r.data.data) })
  if (!requests?.length) return null
  return (
    <motion.div {...fadeUp(0.12)} className="mt-6">
      <div className="card-light p-6">
        <h3 className="font-heading font-bold text-base text-brand-textBody mb-4">طلبات التجديد</h3>
        <div className="space-y-2">
          {requests.map((r) => (
            <div key={r._id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: '#f8f5ff' }}>
              <div>
                <div className="text-sm font-semibold text-brand-textBody">{r.requestedPackageId?.nameAr}</div>
                <div className="text-xs text-[#7c6aaa]">{formatDateAr(r.createdAt)}</div>
              </div>
              <div className="flex items-center gap-2">
                {r.paymentProofId && (
                  <a href={getFileUrl(r.paymentProofId)} target="_blank" rel="noreferrer" className="text-xs font-bold text-brand-purple">إثبات الدفع</a>
                )}
                <Badge variant={RENEWAL_STATUS_LABELS[r.status]?.variant}>{RENEWAL_STATUS_LABELS[r.status]?.label}</Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// ── Empty State ────────────────────────────────────────────────────────────
function EmptySubscription() {
  return (
    <div dir="rtl">
      <PageHeader title="اشتراكي" subtitle="تفاصيل الباقة وحالة الاشتراك" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-lg mx-auto mt-4"
      >
        <div className="card-light p-10 text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(168,85,247,0.1))' }}
          >
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" stroke="#7c3aed" strokeWidth="1.7" strokeLinejoin="round"/>
              <path d="M14 2v6h6M9 13l2 2 4-4" stroke="#7c3aed" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <h2 className="font-heading font-bold text-2xl text-brand-textBody mb-2">
            لا يوجد اشتراك فعال
          </h2>
          <p className="text-[#7c6aaa] mb-6 leading-relaxed">
            ابدأ رحلتك مع ترتيلة أونلاين وتعلم القرآن الكريم مع أفضل المعلمين المتخصصين
          </p>

          <div className="space-y-3 mb-6">
            {['حصص مباشرة مع معلمين متخصصين', 'متابعة فردية لكل طالب', 'تقييمات دورية وتقارير تفصيلية', 'جدول مرن يناسب ظروفك'].map((feat, i) => (
              <div key={i} className="flex items-center gap-3 text-right">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-none" style={{ background: 'rgba(34,197,94,0.1)' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="m5 13 4 4L19 7" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <span className="text-sm text-brand-textBody">{feat}</span>
              </div>
            ))}
          </div>

          <Link to={ROUTES.STUDENT_ENROLLMENT} className="btn-gold inline-block px-8 py-3 rounded-full font-bold text-sm">
            التسجيل في برنامج
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
