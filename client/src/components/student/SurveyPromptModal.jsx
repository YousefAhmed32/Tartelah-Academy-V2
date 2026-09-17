import { useEffect, useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  ClipboardList,
  Clock,
  Star,
  CheckCircle2,
  HelpCircle,
  Lock,
  User,
  Users,
  XCircle,
  AlertCircle,
  Send,
} from 'lucide-react'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'
import { surveyService } from '../../services/survey.service.js'

function StarRatingItem({
  label,
  description,
  value,
  onChange,
  error,
  isRequired = true,
  itemRef,
}) {
  const [hovered, setHovered] = useState(0)
  const activeVal = hovered || value

  const labels = {
    1: 'ضعيف',
    2: 'مقبول',
    3: 'جيد',
    4: 'جيد جداً',
    5: 'ممتاز ومتميز! ⭐',
  }

  return (
    <div
      ref={itemRef}
      className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 ${
        error
          ? 'border-red-400 bg-red-50/40 ring-2 ring-red-100/80 shadow-xs'
          : 'border-slate-200/80 bg-white hover:border-violet-200/90 shadow-xs'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-slate-800">{label}</span>
            {isRequired && <span className="text-red-500 font-bold text-xs" title="مطلوب">*</span>}
          </div>
          {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
        </div>
        {activeVal > 0 && (
          <span
            className={`text-xs font-bold px-2.5 py-0.5 rounded-full transition-all duration-150 ${
              activeVal >= 4
                ? 'bg-amber-100/80 text-amber-800 border border-amber-200'
                : activeVal === 3
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            {labels[activeVal]}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 sm:gap-1.5 py-1" dir="ltr">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            className="p-1 min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] flex items-center justify-center cursor-pointer transition-transform hover:scale-115 active:scale-95 focus:outline-none"
            aria-label={`${n} من 5 نجوم`}
          >
            <Star
              size={24}
              className="transition-colors duration-150"
              fill={n <= activeVal ? '#f59e0b' : 'none'}
              stroke={n <= activeVal ? '#f59e0b' : '#cbd5e1'}
              strokeWidth={1.8}
            />
          </button>
        ))}
      </div>

      {error && (
        <div className="text-xs font-bold text-red-600 mt-2 flex items-center gap-1.5 animate-fadeIn">
          <AlertCircle size={14} className="shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

const renewalRatingItems = [
  {
    key: 'teacherCommitmentRating',
    label: 'التزام المعلم وأداؤه',
    description: 'المواعيد، جودة الشرح، والتفاعل في الحصة',
    icon: User,
  },
  {
    key: 'academyFollowUpRating',
    label: 'المتابعة الأكاديمية',
    description: 'سرعة الرد وتنظيم الجداول والتعويضات',
    icon: ClipboardList,
  },
  {
    key: 'reportQualityRating',
    label: 'جودة التقارير الدورية',
    description: 'وضوح تقارير الحفظ والتلاوة وتوصيات التقدم',
    icon: BarChart3,
  },
  {
    key: 'studentProgressRating',
    label: 'تقدّمك في الحفظ والتلاوة',
    description: 'التطور الملموس في الحفظ والتجويد والأحكام',
    icon: BookOpen,
  },
  {
    key: 'recommendLikelihood',
    label: 'هل توصي بأكاديمية ترتيلة للآخرين؟',
    description: 'مدى رضاك واستعدادك لترشيح الأكاديمية',
    icon: Users,
    wide: true,
  },
]

function RenewalRatingCard({ item, value, onChange, error, itemRef }) {
  const [hovered, setHovered] = useState(0)
  const activeValue = hovered || value
  const Icon = item.icon

  return (
    <section
      ref={itemRef}
      className={`group relative rounded-[18px] border bg-white p-3 transition-all duration-200 ${
        item.wide ? 'md:col-span-2' : ''
      } ${
        error
          ? 'border-red-400 bg-red-50/40 ring-2 ring-red-100'
          : value
            ? 'border-violet-200 shadow-[0_10px_28px_rgba(91,55,185,0.08)]'
            : 'border-slate-200 hover:border-violet-200 hover:shadow-[0_10px_28px_rgba(91,55,185,0.07)]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h4 className="truncate text-[13px] font-extrabold text-[#272044] sm:text-sm">
              {item.label}
            </h4>
            <span className="text-red-500" aria-hidden="true">*</span>
          </div>
          <p className="mt-1 line-clamp-1 text-[11px] leading-5 text-slate-500 sm:text-xs">
            {item.description}
          </p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-violet-50 text-violet-600 transition-colors group-hover:bg-violet-100">
          <Icon size={20} strokeWidth={1.9} aria-hidden="true" />
        </div>
      </div>

      <div className={`mt-1.5 flex items-center gap-0.5 ${item.wide ? 'md:justify-center' : ''}`} dir="ltr">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => onChange(rating)}
            onMouseEnter={() => setHovered(rating)}
            onMouseLeave={() => setHovered(0)}
            className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-xl transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 active:scale-95"
            aria-label={`${rating} من 5 نجوم — ${item.label}`}
            aria-pressed={rating === value}
          >
            <Star
              size={26}
              fill={rating <= activeValue ? '#f59e0b' : 'none'}
              stroke={rating <= activeValue ? '#f59e0b' : '#cbd5e1'}
              strokeWidth={1.8}
              className="transition-colors duration-150"
              aria-hidden="true"
            />
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs font-bold text-red-600" role="alert">
          <AlertCircle size={14} className="shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </section>
  )
}

export default function SurveyPromptModal({
  survey,
  onClose,
  isRenewalGate = false,
  onCompleted,
}) {
  const qc = useQueryClient()
  const fieldRefs = useRef({})
  const contentScrollRef = useRef(null)
  const [renewalStep, setRenewalStep] = useState(1)

  const [form, setForm] = useState({
    teacherCommitmentRating: 0,
    academyFollowUpRating: 0,
    reportQualityRating: 0,
    studentProgressRating: 0,
    recommendLikelihood: 0,
    notes: '',
    renewalIntention: '', // 'yes' | 'undecided' | 'no'
    continueWithSameTeacher: true,
    requestTeacherChange: false,
    requestAdminContact: false,
  })

  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (isRenewalGate) contentScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [isRenewalGate, renewalStep])

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  const handleRatingChange = (key, val) => {
    set(key, val)
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  const handleIntentionChange = (val) => {
    set('renewalIntention', val)
    if (errors.renewalIntention) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next.renewalIntention
        return next
      })
    }
  }

  const submitMut = useMutation({
    mutationFn: () => surveyService.submitResponse(survey._id, form),
    onSuccess: (res) => {
      toast.success('شكرًا جزيلاً لتقييمك الكريم!')
      qc.invalidateQueries({ queryKey: ['student', 'survey', 'pending'] })
      if (onCompleted) {
        onCompleted(res.data?.data || survey)
      }
      onClose()
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'حدث خطأ أثناء إرسال التقييم'
      toast.error(msg)
    },
  })

  const skipMut = useMutation({
    mutationFn: () => surveyService.skip(survey._id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student', 'survey', 'pending'] })
      onClose()
    },
  })

  // Calculate completion percentage for progress indicator
  const completedCount = [
    form.teacherCommitmentRating > 0,
    form.academyFollowUpRating > 0,
    form.reportQualityRating > 0,
    form.studentProgressRating > 0,
    form.recommendLikelihood > 0,
    Boolean(form.renewalIntention),
  ].filter(Boolean).length

  const completionPercent = Math.round((completedCount / 6) * 100)
  const completedRatingsCount = renewalRatingItems.filter((item) => form[item.key] > 0).length
  const ratingsCompletionPercent = Math.round((completedRatingsCount / renewalRatingItems.length) * 100)

  const validateForm = () => {
    const newErrors = {}
    if (!form.teacherCommitmentRating) {
      newErrors.teacherCommitmentRating = 'يرجى تحديد تقييم التزام المعلم'
    }
    if (!form.academyFollowUpRating) {
      newErrors.academyFollowUpRating = 'يرجى تحديد تقييم متابعة الأكاديمية'
    }
    if (!form.reportQualityRating) {
      newErrors.reportQualityRating = 'يرجى تحديد تقييم جودة التقارير'
    }
    if (!form.studentProgressRating) {
      newErrors.studentProgressRating = 'يرجى تحديد تقييم تقدمك في الحفظ والتلاوة'
    }
    if (!form.recommendLikelihood) {
      newErrors.recommendLikelihood = 'يرجى تحديد احتمالية أن توصي بنا'
    }
    if (!form.renewalIntention) {
      newErrors.renewalIntention = 'يرجى اختيار نيتك بشأن تجديد الاشتراك (هذا الحقل مطلوب)'
    }

    setErrors(newErrors)
    return newErrors
  }

  const handleSubmit = () => {
    const newErrors = validateForm()
    const errorKeys = Object.keys(newErrors)

    if (errorKeys.length > 0) {
      toast.error('يرجى استكمال الحقول المطلوبة الموضحة باللون الأحمر', { duration: 3500 })
      const firstKey = errorKeys[0]
      const ratingError = renewalRatingItems.some((item) => item.key === firstKey)
      if (isRenewalGate && ratingError) setRenewalStep(1)
      requestAnimationFrame(() => {
        const el = fieldRefs.current[firstKey]
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
      return
    }

    submitMut.mutate()
  }

  const handleRenewalNext = () => {
    const ratingErrors = {}
    renewalRatingItems.forEach((item) => {
      if (!form[item.key]) ratingErrors[item.key] = `اختر تقييمًا لـ ${item.label}`
    })

    if (Object.keys(ratingErrors).length > 0) {
      setErrors((previous) => ({ ...previous, ...ratingErrors }))
      toast.error('أكمل التقييمات الخمسة للمتابعة', { duration: 3000 })
      const firstMissingKey = renewalRatingItems.find((item) => ratingErrors[item.key])?.key
      fieldRefs.current[firstMissingKey]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    setRenewalStep(2)
  }

  const teacherName = survey.teacherId
    ? `${survey.teacherId.firstNameAr || ''} ${survey.teacherId.lastNameAr || ''}`.trim()
    : 'المعلم'

  if (isRenewalGate) {
    const remainingRatings = renewalRatingItems.length - completedRatingsCount
    const closeRenewal = () => {
      if (!submitMut.isPending) onClose()
    }

    return (
      <Modal
        open
        onClose={closeRenewal}
        title=""
        size="2xl"
        hideHeader
        bodyClassName="!overflow-hidden !p-0"
        panelClassName="sm:!max-h-[94vh]"
      >
        <div className="relative flex h-[min(820px,94vh)] min-h-0 overflow-hidden bg-[#fbfbfe]" dir="rtl">
          <button
            type="button"
            onClick={closeRenewal}
            disabled={submitMut.isPending}
            className="absolute left-3 top-3 z-30 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-[#24125f]/80 text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-[#1b0d4b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-violet-800 disabled:cursor-not-allowed disabled:opacity-60 sm:left-5 sm:top-5"
            aria-label="إغلاق نافذة التقييم"
          >
            <XCircle size={22} strokeWidth={1.8} aria-hidden="true" />
          </button>

          <main className="flex min-w-0 flex-1 flex-col bg-white">
            <div ref={contentScrollRef} className="custom-scroll flex-1 overflow-y-auto px-4 pb-5 pt-5 sm:px-6 sm:pb-6 lg:px-8 lg:pb-7 lg:pt-7">
              <header className="mx-auto w-full max-w-[800px]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-heading text-[clamp(22px,2.5vw,34px)] font-extrabold leading-[1.25] text-[#24184f]">
                      قيّم تجربتك التعليمية
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-slate-500 sm:text-base">
                      ساعدنا نفهم تجربتك ونطوّرها للأفضل قبل تجديد اشتراكك
                    </p>
                  </div>
                  <span className="inline-flex h-9 items-center rounded-xl border border-violet-200 bg-violet-50 px-3.5 text-xs font-extrabold text-violet-800" dir="rtl">
                    الخطوة {renewalStep} من 2
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-[auto_1fr_auto] items-start gap-2" aria-label={`الخطوة الحالية ${renewalStep} من 2`}>
                  <div className="flex min-w-[78px] flex-col items-center gap-1.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-sm font-extrabold text-white shadow-[0_6px_18px_rgba(124,58,237,0.3)]">1</span>
                    <span className="text-xs font-extrabold text-violet-700">التقييم</span>
                  </div>
                  <div className="mt-4 h-0.5 overflow-hidden rounded-full bg-violet-100">
                    <div className={`h-full bg-violet-500 transition-all duration-300 ${renewalStep === 2 ? 'w-full' : 'w-0'}`} />
                  </div>
                  <div className="flex min-w-[78px] flex-col items-center gap-1.5">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm font-extrabold transition-colors ${
                      renewalStep === 2
                        ? 'border-violet-600 bg-violet-600 text-white shadow-[0_6px_18px_rgba(124,58,237,0.3)]'
                        : 'border-violet-200 bg-white text-violet-400'
                    }`}>2</span>
                    <span className={`text-xs font-bold ${renewalStep === 2 ? 'text-violet-700' : 'text-slate-500'}`}>
                      تفضيلاتك
                    </span>
                  </div>
                </div>
              </header>

              {renewalStep === 1 ? (
                <div className="mx-auto mt-4 w-full max-w-[800px]">
                  <div className={`flex flex-col gap-3 rounded-[16px] border px-4 py-3 sm:flex-row sm:items-center ${
                    remainingRatings
                      ? 'border-amber-200 bg-amber-50/70'
                      : 'border-emerald-200 bg-emerald-50/70'
                  }`}>
                    <div className="flex flex-1 items-center gap-2">
                      {remainingRatings ? (
                        <AlertCircle size={19} className="shrink-0 text-amber-600" aria-hidden="true" />
                      ) : (
                        <CheckCircle2 size={19} className="shrink-0 text-emerald-600" aria-hidden="true" />
                      )}
                      <p className={`text-xs font-extrabold sm:text-sm ${remainingRatings ? 'text-amber-900' : 'text-emerald-900'}`}>
                        {remainingRatings
                          ? `باقي ${remainingRatings} ${remainingRatings === 1 ? 'تقييم واحد' : 'تقييمات'} لإكمال هذه الخطوة`
                          : 'اكتملت تقييماتك — يمكنك الانتقال للخطوة التالية'}
                      </p>
                    </div>
                    <div className="flex min-w-0 items-center gap-3 sm:w-[240px]">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/80">
                        <div
                          className="h-full rounded-full bg-gradient-to-l from-violet-600 to-violet-400 transition-all duration-300"
                          style={{ width: `${ratingsCompletionPercent}%` }}
                        />
                      </div>
                      <span className="shrink-0 text-xs font-bold text-slate-600" dir="rtl">
                        {completedRatingsCount} من 5
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                    {renewalRatingItems.map((item) => (
                      <RenewalRatingCard
                        key={item.key}
                        item={item}
                        itemRef={(element) => (fieldRefs.current[item.key] = element)}
                        value={form[item.key]}
                        onChange={(value) => handleRatingChange(item.key, value)}
                        error={errors[item.key]}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mx-auto mt-5 w-full max-w-[800px] space-y-4">
                  <section
                    ref={(element) => (fieldRefs.current.renewalIntention = element)}
                    className={`rounded-[20px] border bg-white p-4 shadow-[0_10px_32px_rgba(43,25,90,0.06)] sm:p-5 ${
                      errors.renewalIntention ? 'border-red-400 ring-2 ring-red-100' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-extrabold text-[#272044] sm:text-base">
                            هل تنوي تجديد الاشتراك في الدورة القادمة؟
                          </h3>
                          <span className="text-red-500" aria-hidden="true">*</span>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                          إجابتك تساعدنا في حجز موعدك وضمان استمرارية الخطة التعليمية.
                        </p>
                      </div>
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-violet-50 text-violet-600">
                        <Clock size={21} aria-hidden="true" />
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                      {[
                        { id: 'yes', label: 'نعم، بإذن الله', icon: CheckCircle2, active: 'border-emerald-500 bg-emerald-50 text-emerald-900' },
                        { id: 'undecided', label: 'لم أقرر بعد', icon: HelpCircle, active: 'border-amber-500 bg-amber-50 text-amber-900' },
                        { id: 'no', label: 'لا، لا أنوي', icon: XCircle, active: 'border-rose-500 bg-rose-50 text-rose-900' },
                      ].map((option) => {
                        const selected = form.renewalIntention === option.id
                        const OptionIcon = option.icon
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => handleIntentionChange(option.id)}
                            className={`flex min-h-14 cursor-pointer items-center justify-between gap-2 rounded-[14px] border px-3.5 text-right text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 ${
                              selected
                                ? `${option.active} shadow-sm ring-1 ring-current/10`
                                : 'border-slate-200 bg-slate-50/70 text-slate-700 hover:border-violet-200 hover:bg-white'
                            }`}
                            aria-pressed={selected}
                          >
                            <span>{option.label}</span>
                            <OptionIcon size={19} className={selected ? '' : 'text-slate-400'} aria-hidden="true" />
                          </button>
                        )
                      })}
                    </div>
                    {errors.renewalIntention && (
                      <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-red-600" role="alert">
                        <AlertCircle size={14} aria-hidden="true" />
                        {errors.renewalIntention}
                      </p>
                    )}
                  </section>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <section className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-[0_10px_32px_rgba(43,25,90,0.05)] sm:p-5">
                      <h3 className="text-sm font-extrabold text-[#272044]">تفضيلات المتابعة</h3>
                      <div className="mt-3 space-y-2">
                        {[
                          {
                            key: 'continueWithSameTeacher',
                            label: 'الاستمرار مع نفس المعلم',
                            description: `متابعة الخطة مع ${teacherName}`,
                          },
                          {
                            key: 'requestTeacherChange',
                            label: 'طلب تغيير المعلم',
                            description: 'تنسّق الإدارة معلمًا بديلًا مناسبًا',
                          },
                          {
                            key: 'requestAdminContact',
                            label: 'أرغب في تواصل الإدارة معي',
                            description: 'للمساعدة أو تنسيق خطة دراسية خاصة',
                          },
                        ].map((preference) => (
                          <label key={preference.key} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-[14px] border border-transparent p-2.5 transition-colors hover:border-violet-100 hover:bg-violet-50/50">
                            <input
                              type="checkbox"
                              className="h-5 w-5 shrink-0 cursor-pointer rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                              checked={form[preference.key]}
                              onChange={(event) => {
                                const checked = event.target.checked
                                set(preference.key, checked)
                                if (preference.key === 'continueWithSameTeacher' && checked) set('requestTeacherChange', false)
                                if (preference.key === 'requestTeacherChange' && checked) set('continueWithSameTeacher', false)
                              }}
                            />
                            <span className="min-w-0">
                              <span className="block text-sm font-bold text-slate-800">{preference.label}</span>
                              <span className="mt-0.5 block text-[11px] leading-5 text-slate-500">{preference.description}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </section>

                    <section className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-[0_10px_32px_rgba(43,25,90,0.05)] sm:p-5">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-extrabold text-[#272044]">ملاحظات واقتراحات</h3>
                        <span className="text-[11px] font-semibold text-slate-400" dir="ltr">{form.notes.length}/1000</span>
                      </div>
                      <p className="mt-1 text-[11px] leading-5 text-slate-500">اختياري — شاركنا ما يساعدنا على تطوير تجربتك.</p>
                      <textarea
                        maxLength={1000}
                        placeholder="اكتب ملاحظتك أو كلمة شكر للمعلم..."
                        className="mt-3 h-[168px] w-full resize-none rounded-[14px] border border-slate-200 bg-slate-50/70 p-3 text-sm leading-6 text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
                        value={form.notes}
                        onChange={(event) => set('notes', event.target.value)}
                      />
                    </section>
                  </div>
                </div>
              )}
            </div>

            <footer className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-white px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
              <button
                type="button"
                onClick={renewalStep === 1 ? closeRenewal : () => setRenewalStep(1)}
                disabled={submitMut.isPending}
                className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-[14px] border border-violet-200 bg-white px-5 text-sm font-extrabold text-violet-700 transition-colors hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-[190px]"
              >
                {renewalStep === 2 && <ArrowRight size={18} aria-hidden="true" />}
                {renewalStep === 1 ? 'إلغاء التجديد والعودة' : 'العودة للتقييم'}
              </button>

              <div className="flex flex-1 flex-col items-stretch gap-1.5 sm:max-w-[430px]">
                <button
                  type="button"
                  onClick={renewalStep === 1 ? handleRenewalNext : handleSubmit}
                  disabled={submitMut.isPending}
                  className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-[14px] border border-violet-600 bg-gradient-to-l from-violet-700 to-violet-500 px-6 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(109,40,217,0.25)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(109,40,217,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60"
                >
                  {submitMut.isPending ? 'جارٍ الإرسال...' : renewalStep === 1 ? 'التالي: تفضيلاتك' : 'إرسال التقييم ومتابعة التجديد'}
                  {renewalStep === 1 ? <ArrowLeft size={18} aria-hidden="true" /> : <Lock size={17} aria-hidden="true" />}
                </button>
                <span className="text-center text-[11px] text-slate-500">
                  {renewalStep === 1 ? 'أكمل التقييمات المطلوبة للمتابعة' : 'سيتم نقلك مباشرة إلى طلب التجديد بعد الإرسال'}
                </span>
              </div>
            </footer>
          </main>

          <aside className="relative hidden w-[34%] min-w-[330px] max-w-[390px] overflow-hidden bg-gradient-to-b from-[#251174] via-[#4221a8] to-[#6f3de0] text-white lg:flex lg:flex-col" aria-label="رأيك يصنع تجربة أفضل">
            <div className="absolute -right-24 top-40 h-72 w-72 rounded-full bg-violet-400/20" />
            <div className="absolute -left-28 bottom-20 h-80 w-80 rounded-full border-[44px] border-white/[0.045]" />
            <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-[#160758]/70 to-transparent" />

            <div className="relative z-20 px-8 pt-20 text-center">
              <div className="mx-auto max-w-[270px] -rotate-2 rounded-[20px] border border-white/20 bg-white/10 px-5 py-4 shadow-[0_18px_50px_rgba(12,5,55,0.25)] backdrop-blur-sm">
                <p className="font-heading text-[27px] font-extrabold leading-[1.45] text-white">
                  رأيك يصنع<br />تجربة أفضل
                </p>
              </div>
              <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-violet-100">
                <Clock size={18} aria-hidden="true" />
                دقيقة واحدة فقط
              </div>
            </div>

            <img
              src="/images/survey-student-renewal-panel.png"
              alt="طالب سعيد يحمل نجمة ذهبية"
              className="pointer-events-none absolute -bottom-[150px] left-0 z-10 w-full"
              style={{
                WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 18%)',
                maskImage: 'linear-gradient(to bottom, transparent 0%, black 18%)',
              }}
            />

            <p className="absolute bottom-5 left-0 right-0 z-20 text-center text-xs font-semibold leading-5 text-white/70">
              معًا نبني رحلة تعليمية أكثر تميّزًا
            </p>
          </aside>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      open
      onClose={() => {
        if (isRenewalGate) {
          onClose()
        } else {
          skipMut.mutate()
        }
      }}
      title=""
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          {isRenewalGate ? (
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={submitMut.isPending}
              className="text-slate-500 hover:text-red-700 text-xs sm:text-sm font-semibold"
            >
              إلغاء التجديد والعودة
            </Button>
          ) : (
            <Button
              variant="ghost"
              onClick={() => skipMut.mutate()}
              disabled={submitMut.isPending || skipMut.isPending}
              className="text-slate-500 hover:text-slate-800 text-xs sm:text-sm font-semibold"
            >
              تخطي الآن (لاحقاً)
            </Button>
          )}

          <Button
            variant="gold"
            loading={submitMut.isPending}
            disabled={!isRenewalGate && skipMut.isPending}
            onClick={handleSubmit}
            icon={<Send size={15} />}
            className="font-bold text-xs sm:text-sm px-5 sm:px-7"
          >
            {isRenewalGate ? 'إرسال ومتابعة التجديد' : 'إرسال التقييم'}
          </Button>
        </div>
      }
    >
      <div dir="rtl" className="space-y-4">
        {/* Visual Hero Header Card with Branded 3D Illustration */}
        <div className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 flex items-center justify-between gap-3 sm:gap-5 shadow-xs ${
          isRenewalGate
            ? 'bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-indigo-50/70 border-amber-200/80'
            : 'bg-gradient-to-r from-purple-50 via-violet-50/60 to-amber-50/40 border-purple-100'
        }`}>
          <div className="space-y-1.5 flex-1">
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
              isRenewalGate
                ? 'bg-amber-100 text-amber-900 border border-amber-200'
                : 'bg-violet-100/90 text-violet-800'
            }`}>
              <Star size={13} className={isRenewalGate ? 'text-amber-600' : 'text-amber-500'} fill="currentColor" />
              <span>{isRenewalGate ? 'خطوة أساسية قبل تجديد الاشتراك' : 'استبيان تجربة التعلّم'}</span>
            </div>
            <h3 className="text-base sm:text-lg font-heading font-extrabold text-slate-900 leading-snug">
              {isRenewalGate ? 'رأيك وتقييمك مطلوب قبل التجديد ⭐' : 'رأيك يهمنا ويصنع الفارق! ⭐'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {isRenewalGate ? (
                <>
                  لمتابعة تجديد اشتراكك وحجز مقعدك، يرجى ملء هذا التقييم السريع وتحديد رغبتك بالاستمرار مع فضيلة المعلم{' '}
                  <strong className="text-violet-700 font-bold">{teacherName}</strong>.
                </>
              ) : (
                <>
                  نسعد بمعرفة انطباعك عن تجربتك مع فضيلة المعلم{' '}
                  <strong className="text-violet-700 font-bold">{teacherName}</strong>{' '}
                  خلال الفترة الماضية لمساعدتنا على تحسين جودة التعليم.
                </>
              )}
            </p>

            {/* Completion Progress Bar */}
            <div className="pt-2 flex items-center gap-3">
              <div className="flex-1 h-2 bg-slate-200/80 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-600 to-amber-500 transition-all duration-300 rounded-full"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
              <span className="text-xs font-bold text-slate-600 shrink-0">
                {completedCount} من 6 مكتمل
              </span>
            </div>
          </div>

          <div className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/90 p-1 shadow-sm border border-violet-100 flex items-center justify-center">
            <img
              src="/images/survey-student.png"
              alt="طالب ترتيلة"
              className="w-full h-full object-contain rounded-xl drop-shadow-xs"
              onError={(e) => {
                // Fallback gracefully if image not cached yet
                e.target.style.display = 'none'
              }}
            />
          </div>
        </div>

        {/* 5 Rating Criteria */}
        <div className="space-y-2.5">
          <StarRatingItem
            itemRef={(el) => (fieldRefs.current.teacherCommitmentRating = el)}
            label="التزام المعلم وأداؤه التعليمي"
            description="الالتزام بالمواعيد، الشرح المتقن، وحسن التفاعل في الحصة"
            value={form.teacherCommitmentRating}
            onChange={(v) => handleRatingChange('teacherCommitmentRating', v)}
            error={errors.teacherCommitmentRating}
          />

          <StarRatingItem
            itemRef={(el) => (fieldRefs.current.academyFollowUpRating = el)}
            label="متابعة الأكاديمية وجودة الخدمة"
            description="سرعة الرد، تنظيم الجداول، وتنسيق الحصص والتعويضات"
            value={form.academyFollowUpRating}
            onChange={(v) => handleRatingChange('academyFollowUpRating', v)}
            error={errors.academyFollowUpRating}
          />

          <StarRatingItem
            itemRef={(el) => (fieldRefs.current.reportQualityRating = el)}
            label="جودة وتفصيل التقارير الدورية"
            description="دقة تقارير الحفظ والتلاوة وتوصيات المعلم لمتابعة التقدم"
            value={form.reportQualityRating}
            onChange={(v) => handleRatingChange('reportQualityRating', v)}
            error={errors.reportQualityRating}
          />

          <StarRatingItem
            itemRef={(el) => (fieldRefs.current.studentProgressRating = el)}
            label="تقدّمك في الحفظ والتلاوة والأحكام"
            description="مدى التطور والتحسن الملموس في مستواك القرآني"
            value={form.studentProgressRating}
            onChange={(v) => handleRatingChange('studentProgressRating', v)}
            error={errors.studentProgressRating}
          />

          <StarRatingItem
            itemRef={(el) => (fieldRefs.current.recommendLikelihood = el)}
            label="احتمالية أن توصي بأكاديمية ترتيلة للآخرين"
            description="مدى رضاك ورغبتك في ترشيح الأكاديمية للأهل والأصدقاء"
            value={form.recommendLikelihood}
            onChange={(v) => handleRatingChange('recommendLikelihood', v)}
            error={errors.recommendLikelihood}
          />
        </div>

        {/* Renewal Intention — Smart Visual Cards with Explicit Validation */}
        <div
          ref={(el) => (fieldRefs.current.renewalIntention = el)}
          className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 ${
            errors.renewalIntention
              ? 'border-red-400 bg-red-50/40 ring-2 ring-red-100/80 shadow-xs'
              : 'border-slate-200/80 bg-white hover:border-violet-200 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1.5">
              <label className="text-sm font-bold text-slate-800">
                هل تنوي تجديد الاشتراك في الدورة القادمة؟
              </label>
              <span className="text-red-500 font-bold text-xs" title="مطلوب">*</span>
            </div>
            {form.renewalIntention && (
              <span className="text-xs font-bold text-violet-700 bg-violet-100/80 px-2.5 py-0.5 rounded-full">
                تم الاختيار ✓
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mb-3.5 leading-relaxed">
            إجابتك تساعدنا في حجز مواعيدك المفضلة وضمان استمرارية الخطة مع المعلم دون انقطاع.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {[
              {
                id: 'yes',
                label: 'نعم، بإذن الله',
                desc: 'أرغب في استمرار رحلتي',
                icon: CheckCircle2,
                activeClass: 'border-emerald-600 bg-emerald-50/90 text-emerald-900 ring-2 ring-emerald-500/20 shadow-xs',
                iconColor: 'text-emerald-600',
              },
              {
                id: 'undecided',
                label: 'لم أقرر بعد',
                desc: 'أحتاج لمزيد من الوقت',
                icon: HelpCircle,
                activeClass: 'border-amber-500 bg-amber-50/90 text-amber-900 ring-2 ring-amber-500/20 shadow-xs',
                iconColor: 'text-amber-600',
              },
              {
                id: 'no',
                label: 'لا، لا أنوي',
                desc: 'أكتفي بهذه الدورة',
                icon: XCircle,
                activeClass: 'border-rose-500 bg-rose-50/90 text-rose-900 ring-2 ring-rose-500/20 shadow-xs',
                iconColor: 'text-rose-600',
              },
            ].map((opt) => {
              const isSelected = form.renewalIntention === opt.id
              const IconComp = opt.icon
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleIntentionChange(opt.id)}
                  className={`flex flex-col items-center sm:items-start text-right p-3.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? opt.activeClass
                      : 'border-slate-200 bg-slate-50/70 hover:bg-white hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1 w-full justify-between sm:justify-start">
                    <span className="font-bold text-sm">{opt.label}</span>
                    <IconComp size={18} className={isSelected ? opt.iconColor : 'text-slate-400'} />
                  </div>
                  <span className="text-xs text-slate-500">{opt.desc}</span>
                </button>
              )
            })}
          </div>

          {errors.renewalIntention && (
            <div className="text-xs font-bold text-red-600 mt-2.5 flex items-center gap-1.5 animate-fadeIn">
              <AlertCircle size={14} className="shrink-0 text-red-500" />
              <span>{errors.renewalIntention}</span>
            </div>
          )}
        </div>

        {/* Additional Preferences with Smart Dependencies */}
        <div className="p-4 rounded-2xl border border-slate-200/80 bg-white space-y-2 shadow-xs">
          <label className="text-xs font-bold text-slate-500 block mb-1">
            تفضيلات المتابعة والتنسيق مع الأكاديمية
          </label>

          <label className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-200">
            <input
              type="checkbox"
              className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 border-slate-300 cursor-pointer"
              checked={form.continueWithSameTeacher}
              onChange={(e) => {
                const val = e.target.checked
                set('continueWithSameTeacher', val)
                if (val) set('requestTeacherChange', false)
              }}
            />
            <div className="flex-1 text-right">
              <span className="text-sm font-semibold text-slate-800">أرغب بالاستمرار مع نفس المعلم</span>
              <p className="text-xs text-slate-500">متابعة المنهج ونفس أسلوب الحفظ المعتاد</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-200">
            <input
              type="checkbox"
              className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 border-slate-300 cursor-pointer"
              checked={form.requestTeacherChange}
              onChange={(e) => {
                const val = e.target.checked
                set('requestTeacherChange', val)
                if (val) set('continueWithSameTeacher', false)
              }}
            />
            <div className="flex-1 text-right">
              <span className="text-sm font-semibold text-slate-800">أرغب بطلب تغيير المعلم</span>
              <p className="text-xs text-slate-500">ستتواصل معك الإدارة لتنسيق معلم بديل يناسب أهدافك</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-200">
            <input
              type="checkbox"
              className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 border-slate-300 cursor-pointer"
              checked={form.requestAdminContact}
              onChange={(e) => set('requestAdminContact', e.target.checked)}
            />
            <div className="flex-1 text-right">
              <span className="text-sm font-semibold text-slate-800">أرغب أن تتواصل معي الإدارة</span>
              <p className="text-xs text-slate-500">للإجابة عن أي استفسارات وتنسيق خطة دراسية خاصة</p>
            </div>
          </label>
        </div>

        {/* Notes & Suggestions */}
        <div className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-bold text-slate-800">ملاحظات واقتراحات (اختياري)</label>
            <span className="text-xs text-slate-400 font-mono">{form.notes.length}/1000</span>
          </div>
          <textarea
            maxLength={1000}
            placeholder="اكتب هنا أي ملاحظات، كلمات شكر وتقدير للمعلم، أو اقتراحات لتطوير المنصة..."
            className="w-full h-20 bg-slate-50/70 border border-slate-200 rounded-xl p-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all resize-none"
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
          />
        </div>
      </div>
    </Modal>
  )
}
