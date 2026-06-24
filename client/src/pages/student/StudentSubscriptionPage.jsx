import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../../utils/api.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import { formatDateAr } from '../../utils/date.js'
import { ROUTES } from '../../config/constants.js'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.2, 0.7, 0.2, 1] },
})

export default function StudentSubscriptionPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['subscription', 'me'],
    queryFn: () => api.get('/subscriptions/me').then(r => r.data.data).catch(() => null),
    retry: false,
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

  const ringC  = 2 * Math.PI * 52
  const offset = ringC * (1 - pct / 100)

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
                    <div className="text-xs text-[#9b7fd6] mt-0.5">
                      {urgency === 'expired' ? 'سجّل في برنامج جديد للاستمرار' : 'تواصل مع الإدارة لتجديد اشتراكك'}
                    </div>
                  </div>
                  <Link to={ROUTES.STUDENT_ENROLLMENT} className="btn-gold px-4 py-2 rounded-xl text-xs font-bold flex-none mr-auto">
                    تجديد
                  </Link>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'تاريخ البدء',       value: formatDateAr(data.startDate) },
                  { label: 'تاريخ الانتهاء',     value: formatDateAr(data.endDate) },
                  { label: 'الحصص شهرياً',       value: `${data.packageId?.sessionsPerMonth || 0} حصة` },
                  { label: 'الحصص المتبقية',     value: `${data.sessionsRemaining || 0} حصة` },
                ].map((item, i) => (
                  <div key={i} className="p-4 rounded-[14px]" style={{ background: '#f8f5ff' }}>
                    <div className="text-xs text-[#9b7fd6] mb-1">{item.label}</div>
                    <div className="font-heading font-bold text-brand-textBody">{item.value}</div>
                  </div>
                ))}
              </div>

              {/* Days progress bar */}
              <div className="mt-5">
                <div className="flex justify-between text-xs text-[#9b7fd6] mb-2">
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
            <div className="relative w-[120px] h-[120px]">
              <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="60" cy="60" r="52" fill="none" stroke="#f0ecf8" strokeWidth="10" />
                <circle
                  cx="60" cy="60" r="52" fill="none"
                  stroke={urgency === 'ok' ? 'url(#dg)' : urgency === 'warning' ? '#f59e0b' : '#ef4444'}
                  strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={ringC}
                  strokeDashoffset={offset}
                  style={{ transition: 'stroke-dashoffset 1s ease' }}
                />
                <defs>
                  <linearGradient id="dg" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="#7c3aed" />
                    <stop offset="1" stopColor="#22c55e" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="font-heading font-extrabold text-3xl text-brand-textBody">{daysLeft}</div>
                <div className="text-[11px] text-[#9b7fd6]">يوم</div>
              </div>
            </div>

            <div>
              <div className="font-heading font-bold text-lg text-brand-textBody">أيام متبقية</div>
              <div className="text-sm text-[#9b7fd6] mt-1">من أصل {totalDays} يوم</div>
            </div>

            <div
              className="w-full py-3 px-4 rounded-[14px] text-center"
              style={{ background: '#f8f5ff', border: '1px solid #ede8f7' }}
            >
              <div className="text-xs text-[#9b7fd6] mb-1">ينتهي في</div>
              <div className="font-semibold text-sm text-brand-textBody">{formatDateAr(data.endDate)}</div>
            </div>

            <Link to={ROUTES.STUDENT_ENROLLMENT} className="w-full text-center py-2.5 rounded-xl text-sm font-bold text-brand-purple hover:text-brand-purpleDark transition-colors" style={{ background: 'rgba(124,58,237,0.06)' }}>
              + تجديد الاشتراك
            </Link>
          </div>
        </motion.div>
      </div>

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
              <div className="text-sm text-[#9b7fd6] space-y-1">
                <div>البنك: <span className="font-semibold text-brand-textBody">بنك الراجحي</span></div>
                <div>IBAN: <span className="font-semibold text-brand-textBody text-xs">SA00 0000 0000 0000 0000 0000</span></div>
                <div>الاسم: <span className="font-semibold text-brand-textBody">أكاديمية ترتيلة</span></div>
              </div>
            </div>
            <div className="p-4 rounded-[14px]" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}>
              <div className="font-semibold text-sm text-brand-textBody mb-2">خطوات التجديد</div>
              <ol className="text-sm text-[#9b7fd6] space-y-1 list-none">
                {['حوّل المبلغ عبر التطبيق البنكي', 'سجّل في برنامج من القائمة الجانبية', 'ارفع صورة إثبات الدفع', 'انتظر موافقة الإدارة'].map((step, i) => (
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
            <p className="text-sm text-[#9b7fd6]">
              للاستفسار والدعم تواصل معنا عبر{' '}
              <span className="font-bold text-brand-purple">support@tartelah.com</span>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
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
          <p className="text-[#9b7fd6] mb-6 leading-relaxed">
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
