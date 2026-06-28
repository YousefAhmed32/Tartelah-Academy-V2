import { useState, useRef, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence, useScroll, useTransform, useInView } from 'framer-motion'
import {
  Check, ChevronDown, Shield, Clock, Award, Users, Headphones,
  Sparkles, Star, ArrowLeft, BookOpen, Video, TrendingUp,
  MessageCircle, BarChart3, Zap,
} from 'lucide-react'
import { ROUTES } from '../../config/constants.js'

// ─── Data ────────────────────────────────────────────────────────────────────

const PACKAGES = [
  {
    id: 'basic',
    nameEn: 'Starter',
    name: 'الباقة الأساسية',
    sessions: 4,
    duration: 60,
    monthlyPrice: 80,
    yearlyPrice: 64,
    badge: null,
    popular: false,
    features: [
      { icon: BookOpen,      title: '٤ حصص شهرياً',       desc: 'حصة أسبوعية منتظمة' },
      { icon: Clock,         title: '٦٠ دقيقة / حصة',      desc: 'جلسة تعلم مكثفة' },
      { icon: BarChart3,     title: 'تقارير أسبوعية',      desc: 'متابعة تقدمك أولاً بأول' },
      { icon: MessageCircle, title: 'دعم واتساب',           desc: 'تواصل مباشر مع المعلم' },
    ],
  },
  {
    id: 'popular',
    nameEn: 'Pro',
    name: 'الباقة المميزة',
    sessions: 8,
    duration: 60,
    monthlyPrice: 140,
    yearlyPrice: 112,
    badge: 'الأكثر طلباً',
    popular: true,
    features: [
      { icon: BookOpen,      title: '٨ حصص شهرياً',        desc: 'حصتان أسبوعياً لتقدم أسرع' },
      { icon: Clock,         title: '٦٠ دقيقة / حصة',      desc: 'جلسة تعلم مكثفة' },
      { icon: BarChart3,     title: 'تقارير أسبوعية',      desc: 'متابعة تقدمك أولاً بأول' },
      { icon: MessageCircle, title: 'دعم واتساب',           desc: 'تواصل مباشر مع المعلم' },
      { icon: Video,         title: 'تسجيل الحصص',         desc: 'راجع حصصك في أي وقت' },
      { icon: Zap,           title: 'مساعد ذكاء اصطناعي',  desc: 'إجابات فورية ٢٤/٧' },
    ],
  },
  {
    id: 'intensive',
    nameEn: 'Elite',
    name: 'الباقة المكثفة',
    sessions: 16,
    duration: 60,
    monthlyPrice: 240,
    yearlyPrice: 192,
    badge: 'الأفضل قيمةً',
    popular: false,
    features: [
      { icon: BookOpen,      title: '١٦ حصة شهرياً',       desc: 'أربع حصص أسبوعياً' },
      { icon: Clock,         title: '٦٠ دقيقة / حصة',      desc: 'جلسة تعلم مكثفة' },
      { icon: BarChart3,     title: 'تقارير تفصيلية',      desc: 'تحليل شامل للأداء' },
      { icon: Headphones,    title: 'دعم أولوية ٢٤/٧',     desc: 'خدمة فورية على مدار الساعة' },
      { icon: Video,         title: 'تسجيل الحصص',         desc: 'راجع حصصك في أي وقت' },
      { icon: TrendingUp,    title: 'مراجعة شهرية شاملة',  desc: 'تقييم معمق مع المعلم' },
    ],
  },
]

const WHY_FEATURES = [
  { icon: Users,         title: 'معلمون محترفون',         desc: 'نخبة من أفضل معلمي القرآن بإجازات معتمدة' },
  { icon: Clock,         title: 'جداول مرنة',             desc: 'اختر توقيت حصصك بما يناسب جدولك اليومي' },
  { icon: BarChart3,     title: 'تقارير مفصلة',           desc: 'تتبع تقدمك بتقارير دورية شاملة وتحليل الأداء' },
  { icon: Award,         title: 'شهادات معتمدة',          desc: 'احصل على شهادة إتمام عند إكمال البرنامج' },
  { icon: Sparkles,      title: 'مساعد ذكاء اصطناعي',    desc: 'مساعد ذكي يُجيب على أسئلتك في أي وقت' },
  { icon: Headphones,    title: 'دعم على مدار الساعة',   desc: 'فريق دعم متاح ٢٤/٧ لمساعدتك في أي استفسار' },
]

const COMPARISON = [
  { label: 'عدد الحصص الشهرية', basic: '٤ حصص',    popular: '٨ حصص',    intensive: '١٦ حصة' },
  { label: 'مدة كل حصة',        basic: '٦٠ دقيقة', popular: '٦٠ دقيقة', intensive: '٦٠ دقيقة' },
  { label: 'تسجيل الحصص',       basic: false,       popular: true,        intensive: true },
  { label: 'تقارير الأداء',     basic: 'أسبوعية',  popular: 'أسبوعية',  intensive: 'تفصيلية' },
  { label: 'دعم واتساب',        basic: true,        popular: true,        intensive: true },
  { label: 'دعم أولوية',        basic: false,       popular: false,       intensive: true },
  { label: 'مراجعة شهرية',      basic: false,       popular: false,       intensive: true },
  { label: 'مساعد الذكاء',      basic: false,       popular: true,        intensive: true },
]

const FAQS = [
  { q: 'هل يمكنني تغيير باقتي في أي وقت؟',       a: 'نعم، يمكنك الترقية أو تخفيض باقتك في أي وقت. التغييرات تسري من دورة الفوترة التالية.' },
  { q: 'ما هي طرق الدفع المتاحة؟',               a: 'نقبل جميع بطاقات الائتمان الرئيسية (Visa، Mastercard)، وPayPal، وبعض طرق الدفع المحلية.' },
  { q: 'هل هناك ضمان استرداد الأموال؟',           a: 'نعم، نقدم ضمان استرداد كامل خلال ٧ أيام إذا لم تكن راضياً تماماً عن التجربة.' },
  { q: 'كيف يتم تحديد موعد الحصص؟',              a: 'بعد الاشتراك، تتواصل إدارة الأكاديمية معك لتحديد المواعيد المناسبة مع معلمك المخصص.' },
  { q: 'هل الحصص فردية أم جماعية؟',              a: 'جميع حصصنا فردية ١:١ لضمان أقصى قدر من الاهتمام والتقدم الشخصي.' },
]

// ─── Animated counter ────────────────────────────────────────────────────────

function AnimatedNumber({ value, duration = 1200 }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (!inView) return
    let frame
    const start = performance.now()
    const end = parseInt(value, 10)
    function tick(now) {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.floor(eased * end))
      if (t < 1) frame = requestAnimationFrame(tick)
      else setDisplay(end)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [inView, value, duration])

  return <span ref={ref}>{display.toLocaleString('ar-EG')}</span>
}

// ─── Background ──────────────────────────────────────────────────────────────

function Background() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Base deep dark */}
      <div className="absolute inset-0" style={{ background: '#080116' }} />

      {/* Top purple radial */}
      <div
        className="absolute"
        style={{
          width: '120%', height: '70%',
          top: '-20%', left: '-10%',
          background: 'radial-gradient(ellipse at 50% 0%, rgba(100,40,220,0.22) 0%, transparent 60%)',
        }}
      />

      {/* Bottom gold leak */}
      <div
        className="absolute"
        style={{
          width: '60%', height: '60%',
          bottom: '-10%', right: '-5%',
          background: 'radial-gradient(ellipse at 80% 100%, rgba(232,199,106,0.07) 0%, transparent 55%)',
        }}
      />

      {/* Left blue-purple */}
      <div
        className="absolute"
        style={{
          width: '50%', height: '60%',
          top: '30%', left: '-15%',
          background: 'radial-gradient(ellipse at 0% 50%, rgba(80,30,180,0.14) 0%, transparent 60%)',
        }}
      />

      {/* Animated breathing orb */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 700, height: 700,
          top: '-15%', left: '25%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Gold breathing orb */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 500, height: 500,
          bottom: '15%', right: '5%',
          background: 'radial-gradient(circle, rgba(212,175,55,0.07) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
        animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0.9, 0.4] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
      />

      {/* Noise overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '180px 180px',
        }}
      />

      {/* Islamic geo pattern */}
      <div
        className="absolute inset-0 opacity-[0.018]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff'%3E%3Cpath d='M40 0L50 14H30L40 0zm0 80L30 66h20L40 80zM0 40L14 30v20L0 40zm80 0L66 50V30L80 40zM40 25l8 8-8 8-8-8 8-8z'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '80px 80px',
        }}
      />
    </div>
  )
}

// ─── Floating particles ───────────────────────────────────────────────────────

function Particles({ count = 24 }) {
  const particles = useRef(
    Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 2.5 + 0.8,
      gold: i % 3 === 0,
      duration: 4 + Math.random() * 5,
      delay: Math.random() * 6,
    }))
  ).current

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size, height: p.size,
            left: `${p.left}%`, top: `${p.top}%`,
            background: p.gold ? 'rgba(232,199,106,0.6)' : 'rgba(150,100,240,0.45)',
          }}
          animate={{ y: [0, -35, 0], opacity: [0, 0.7, 0] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

// ─── Billing toggle ───────────────────────────────────────────────────────────

function BillingToggle({ yearly, onToggle }) {
  return (
    <div className="inline-flex items-center gap-4 p-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(150,100,240,0.2)' }}>
      <button
        onClick={() => yearly && onToggle()}
        className="px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300"
        style={{
          background: !yearly ? 'rgba(124,58,237,0.4)' : 'transparent',
          color: !yearly ? '#fff' : 'rgba(179,164,208,0.7)',
          border: !yearly ? '1px solid rgba(124,58,237,0.5)' : '1px solid transparent',
        }}
      >
        شهرياً
      </button>
      <button
        onClick={() => !yearly && onToggle()}
        className="px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300 flex items-center gap-2"
        style={{
          background: yearly ? 'linear-gradient(135deg, rgba(232,199,106,0.3), rgba(212,175,55,0.15))' : 'transparent',
          color: yearly ? '#E8C76A' : 'rgba(179,164,208,0.7)',
          border: yearly ? '1px solid rgba(232,199,106,0.4)' : '1px solid transparent',
        }}
      >
        سنوياً
        <AnimatePresence>
          {yearly && (
            <motion.span
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(34,197,94,0.2)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.35)' }}
            >
              وفر 20%
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </div>
  )
}

// ─── Pricing card ─────────────────────────────────────────────────────────────

function PricingCard({ pkg, yearly, index }) {
  const cardRef = useRef(null)
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 50 })
  const [hovered, setHovered] = useState(false)

  const onMouseMove = useCallback((e) => {
    const el = cardRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2)
    const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2)
    const max = pkg.popular ? 7 : 10
    setTilt({
      rx: -dy * max,
      ry: dx * max,
      gx: ((e.clientX - r.left) / r.width) * 100,
      gy: ((e.clientY - r.top) / r.height) * 100,
    })
  }, [pkg.popular])

  const onMouseLeave = useCallback(() => {
    setHovered(false)
    setTilt({ rx: 0, ry: 0, gx: 50, gy: 50 })
  }, [])

  const price = yearly ? pkg.yearlyPrice : pkg.monthlyPrice
  const saved = pkg.monthlyPrice - pkg.yearlyPrice

  return (
    <motion.div
      ref={cardRef}
      className="relative"
      initial={{ opacity: 0, y: 70, scale: 0.88 }}
      animate={{ opacity: 1, y: 0, scale: pkg.popular ? 1.06 : 1 }}
      transition={{ duration: 0.75, delay: index * 0.14, ease: [0.16, 1, 0.3, 1] }}
      onMouseMove={onMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={onMouseLeave}
      style={{ zIndex: pkg.popular ? 10 : 1, perspective: 1200 }}
    >
      {/* Outer ambient glow */}
      {pkg.popular && (
        <motion.div
          className="absolute -inset-4 rounded-[40px] pointer-events-none"
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            background: 'radial-gradient(ellipse at center, rgba(232,199,106,0.2) 0%, transparent 70%)',
            filter: 'blur(24px)',
          }}
        />
      )}

      {/* Non-popular hover glow */}
      {!pkg.popular && hovered && (
        <div
          className="absolute -inset-2 rounded-[36px] pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(124,58,237,0.12) 0%, transparent 70%)',
            filter: 'blur(20px)',
          }}
        />
      )}

      {/* Floating particles on popular card */}
      {pkg.popular && (
        <div className="absolute inset-0 rounded-[32px] overflow-hidden pointer-events-none">
          {[...Array(7)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: 3, height: 3,
                background: 'rgba(232,199,106,0.65)',
                left: `${12 + i * 13}%`,
                top: `${25 + (i % 3) * 22}%`,
              }}
              animate={{ y: [-8, -28, -8], opacity: [0, 0.85, 0], scale: [0.5, 1.2, 0.5] }}
              transition={{ duration: 2.8 + i * 0.35, repeat: Infinity, delay: i * 0.45, ease: 'easeInOut' }}
            />
          ))}
        </div>
      )}

      {/* 3D tilt layer */}
      <div
        className="relative h-full"
        style={{
          transform: `perspective(1200px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) translateZ(${hovered ? 28 : 0}px)`,
          transition: hovered ? 'transform 0.08s linear' : 'transform 0.65s cubic-bezier(0.16,1,0.3,1)',
          willChange: 'transform',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Card shell */}
        <div
          className="relative rounded-[32px] overflow-hidden h-full"
          style={{
            background: pkg.popular
              ? 'linear-gradient(150deg, rgba(50,20,96,0.97) 0%, rgba(28,8,58,0.99) 100%)'
              : 'linear-gradient(150deg, rgba(28,10,55,0.75) 0%, rgba(14,4,30,0.88) 100%)',
            backdropFilter: 'blur(28px)',
            boxShadow: pkg.popular
              ? `0 0 0 1.5px rgba(232,199,106,${hovered ? 0.7 : 0.45}), 0 30px 80px rgba(0,0,0,0.6), 0 0 60px rgba(232,199,106,0.08)`
              : `0 0 0 1px rgba(124,58,237,${hovered ? 0.5 : 0.22}), 0 20px 50px rgba(0,0,0,0.45)`,
          }}
        >
          {/* Specular light reflection */}
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-200"
            style={{
              background: `radial-gradient(circle at ${tilt.gx}% ${tilt.gy}%, rgba(255,255,255,${hovered ? 0.06 : 0}) 0%, transparent 55%)`,
            }}
          />

          {/* Top shimmer line */}
          <div
            className="absolute top-0 left-6 right-6 h-px"
            style={{
              background: pkg.popular
                ? 'linear-gradient(90deg, transparent, rgba(232,199,106,0.6), transparent)'
                : 'linear-gradient(90deg, transparent, rgba(150,100,240,0.3), transparent)',
            }}
          />

          {/* Content */}
          <div className="relative z-10 p-8 flex flex-col h-full">
            {/* Badge */}
            {pkg.badge && (
              <div className="flex justify-center mb-5">
                <motion.span
                  animate={pkg.popular ? { scale: [1, 1.04, 1] } : {}}
                  transition={{ duration: 2.2, repeat: Infinity }}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold tracking-wide"
                  style={pkg.popular
                    ? { background: 'linear-gradient(135deg, #E8C76A, #D4AF37)', color: '#2a1500' }
                    : { background: 'rgba(124,58,237,0.2)', color: '#cdbef0', border: '1px solid rgba(124,58,237,0.4)' }
                  }
                >
                  {pkg.popular && <Star size={10} fill="currentColor" />}
                  {pkg.badge}
                </motion.span>
              </div>
            )}

            {/* Plan label */}
            <div className="text-center mb-6">
              <p
                className="text-[10px] font-bold tracking-[0.2em] uppercase mb-2"
                style={{ color: pkg.popular ? 'rgba(232,199,106,0.65)' : 'rgba(150,100,240,0.65)' }}
              >
                {pkg.nameEn}
              </p>
              <h3 className="font-heading font-bold text-white text-[1.35rem]">{pkg.name}</h3>
            </div>

            {/* Price */}
            <div className="text-center mb-6">
              <div className="flex items-start justify-center gap-1">
                <span className="text-xl font-semibold mt-3 leading-none" style={{ color: pkg.popular ? '#E8C76A' : '#a78fd6' }}>$</span>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={price}
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 12 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="font-heading font-extrabold text-white leading-none"
                    style={{ fontSize: 'clamp(52px, 5vw, 66px)' }}
                  >
                    {price}
                  </motion.span>
                </AnimatePresence>
              </div>
              <p className="text-xs mt-2 leading-relaxed" style={{ color: '#9f8bc0' }}>
                شهرياً · {pkg.sessions} حصص × {pkg.duration} دقيقة
              </p>
              <AnimatePresence>
                {yearly && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 overflow-hidden"
                  >
                    <span
                      className="inline-block text-[11px] font-bold px-3 py-1 rounded-full"
                      style={{ background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.28)' }}
                    >
                      وفر ${saved} شهرياً مع الاشتراك السنوي
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Divider */}
            <div
              className="mb-6 h-px"
              style={{
                background: pkg.popular
                  ? 'linear-gradient(90deg, transparent, rgba(232,199,106,0.35), transparent)'
                  : 'linear-gradient(90deg, transparent, rgba(124,58,237,0.2), transparent)',
              }}
            />

            {/* Features */}
            <ul className="space-y-3.5 flex-1">
              {pkg.features.map((feat, fi) => {
                const Icon = feat.icon
                return (
                  <motion.li
                    key={fi}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.14 + fi * 0.07 + 0.5 }}
                    className="flex items-center gap-3 group/feat"
                  >
                    <div
                      className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 group-hover/feat:scale-110"
                      style={{
                        background: pkg.popular ? 'rgba(232,199,106,0.1)' : 'rgba(124,58,237,0.1)',
                      }}
                    >
                      <Icon size={13} style={{ color: pkg.popular ? '#E8C76A' : '#a78fd6' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{feat.title}</p>
                      <p className="text-[11px] mt-0.5 leading-tight" style={{ color: '#7d6da0' }}>{feat.desc}</p>
                    </div>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: index * 0.14 + fi * 0.07 + 0.6, type: 'spring', stiffness: 400 }}
                      className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: pkg.popular ? 'rgba(232,199,106,0.15)' : 'rgba(124,58,237,0.15)' }}
                    >
                      <Check size={9} style={{ color: pkg.popular ? '#E8C76A' : '#a78fd6' }} />
                    </motion.div>
                  </motion.li>
                )
              })}
            </ul>

            {/* CTA */}
            <CardCTA pkg={pkg} />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Card CTA (magnetic) ──────────────────────────────────────────────────────

function CardCTA({ pkg }) {
  const wrapRef = useRef(null)
  const [mag, setMag] = useState({ x: 0, y: 0 })
  const [hov, setHov] = useState(false)

  const onMove = (e) => {
    const el = wrapRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setMag({
      x: (e.clientX - (r.left + r.width / 2)) * 0.28,
      y: (e.clientY - (r.top + r.height / 2)) * 0.28,
    })
  }

  return (
    <div
      ref={wrapRef}
      className="mt-8"
      onMouseMove={onMove}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setMag({ x: 0, y: 0 }) }}
    >
      <Link
        to={ROUTES.REGISTER}
        style={{
          transform: `translate(${mag.x}px, ${mag.y}px)`,
          transition: hov ? 'transform 0.12s ease-out' : 'transform 0.55s cubic-bezier(0.16,1,0.3,1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '14px 24px',
          borderRadius: 16,
          fontWeight: 700,
          fontSize: 14,
          position: 'relative',
          overflow: 'hidden',
          textDecoration: 'none',
          background: pkg.popular
            ? 'linear-gradient(135deg, #E8C76A 0%, #D4AF37 100%)'
            : 'transparent',
          color: pkg.popular ? '#2a1500' : '#E8C76A',
          border: pkg.popular ? 'none' : '1.5px solid rgba(232,199,106,0.35)',
          boxShadow: pkg.popular
            ? hov ? '0 8px 30px rgba(212,175,55,0.55)' : '0 4px 20px rgba(212,175,55,0.3)'
            : hov ? '0 4px 20px rgba(124,58,237,0.25)' : 'none',
        }}
      >
        {/* Hover overlay for non-popular */}
        {!pkg.popular && (
          <div
            className="absolute inset-0 transition-opacity duration-300"
            style={{
              background: 'linear-gradient(135deg, rgba(232,199,106,0.06), rgba(212,175,55,0.03))',
              opacity: hov ? 1 : 0,
            }}
          />
        )}
        <span className="relative z-10">اشترك الآن</span>
        <ArrowLeft
          size={15}
          className="relative z-10"
          style={{
            transition: 'transform 0.3s ease',
            transform: hov ? 'translateX(-4px)' : 'translateX(0)',
          }}
        />
      </Link>
    </div>
  )
}

// ─── Section heading ──────────────────────────────────────────────────────────

function SectionHeading({ eyebrow, title, subtitle }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
      className="text-center mb-14"
    >
      {eyebrow && (
        <p className="text-[11px] font-bold tracking-[0.22em] uppercase mb-4" style={{ color: '#E8C76A' }}>
          {eyebrow}
        </p>
      )}
      <h2
        className="font-heading font-extrabold text-white mb-4"
        style={{ fontSize: 'clamp(26px, 3.5vw, 44px)' }}
      >
        {title}
      </h2>
      {subtitle && (
        <p className="text-base max-w-xl mx-auto leading-relaxed" style={{ color: '#b3a4d0' }}>
          {subtitle}
        </p>
      )}
    </motion.div>
  )
}

// ─── FAQ item ─────────────────────────────────────────────────────────────────

function FAQItem({ item, index }) {
  const [open, setOpen] = useState(false)
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(26,8,52,0.6)',
        border: `1px solid ${open ? 'rgba(232,199,106,0.25)' : 'rgba(150,100,240,0.14)'}`,
        backdropFilter: 'blur(14px)',
        transition: 'border-color 0.3s ease',
      }}
    >
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between p-5 text-right gap-4"
      >
        <span className="font-medium text-white text-sm leading-relaxed">{item.q}</span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
          style={{
            background: open ? 'rgba(232,199,106,0.15)' : 'rgba(124,58,237,0.18)',
            color: open ? '#E8C76A' : '#a78fd6',
          }}
        >
          <ChevronDown size={14} />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <p className="px-5 pb-5 text-sm leading-loose" style={{ color: '#b3a4d0' }}>{item.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [yearly, setYearly] = useState(false)
  const { scrollYProgress } = useScroll()
  const heroY = useTransform(scrollYProgress, [0, 0.35], [0, -70])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0.25])

  return (
    <div className="min-h-screen overflow-x-hidden" dir="rtl">
      <Background />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <motion.section
        style={{ y: heroY, opacity: heroOpacity }}
        className="relative z-10 pt-36 pb-24 px-[clamp(20px,5vw,68px)] text-center"
      >
        <Particles count={28} />

        {/* Eyebrow badge */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 mb-8"
        >
          <span
            className="px-5 py-2 rounded-full text-xs font-bold tracking-wider uppercase flex items-center gap-2"
            style={{
              background: 'rgba(232,199,106,0.08)',
              border: '1px solid rgba(232,199,106,0.22)',
              color: '#E8C76A',
            }}
          >
            <Sparkles size={11} />
            اختر خطتك المناسبة
          </span>
        </motion.div>

        {/* H1 */}
        <motion.h1
          initial={{ opacity: 0, y: 36 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="font-heading font-extrabold text-white mb-6"
          style={{ fontSize: 'clamp(46px, 6.5vw, 88px)', lineHeight: 1.08, letterSpacing: '-0.02em' }}
        >
          الأسعار والباقات
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.22 }}
          className="text-lg max-w-2xl mx-auto mb-14 leading-loose"
          style={{ color: '#b3a4d0' }}
        >
          استثمر في تعلم كتاب الله مع أفضل المعلمين المعتمدين.
          <br className="hidden sm:block" />
          باقات مرنة مصممة لكل ميزانية وجدول زمني.
        </motion.p>

        {/* Billing toggle */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.34 }}
        >
          <BillingToggle yearly={yearly} onToggle={() => setYearly(v => !v)} />
        </motion.div>
      </motion.section>

      {/* ── Pricing cards ─────────────────────────────────────────────────── */}
      <section className="relative z-10 px-[clamp(16px,4vw,60px)] pb-28">
        <div className="max-w-[1100px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 items-center">
            {PACKAGES.map((pkg, i) => (
              <PricingCard key={pkg.id} pkg={pkg} yearly={yearly} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <section className="relative z-10 px-[clamp(20px,5vw,68px)] pb-28">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {[
              { val: 500,   suf: '+',  label: 'طالب نشط' },
              { val: 50,    suf: '+',  label: 'معلم محترف' },
              { val: 98,    suf: '%',  label: 'نسبة الرضا' },
              { val: 10000, suf: '+',  label: 'حصة منجزة' },
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.88 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="text-center py-6 px-4 rounded-2xl"
                style={{
                  background: 'rgba(26,8,50,0.5)',
                  border: '1px solid rgba(150,100,240,0.12)',
                  backdropFilter: 'blur(14px)',
                }}
              >
                <div className="font-heading font-extrabold text-white mb-1" style={{ fontSize: 'clamp(26px, 3vw, 34px)' }}>
                  <AnimatedNumber value={s.val} />{s.suf}
                </div>
                <p className="text-xs" style={{ color: '#9f8bc0' }}>{s.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Why Tartelah ──────────────────────────────────────────────────── */}
      <section className="relative z-10 px-[clamp(20px,5vw,68px)] pb-28">
        <div className="max-w-6xl mx-auto">
          <SectionHeading
            eyebrow="لماذا ترتيلة"
            title="كل ما تحتاجه في مكان واحد"
            subtitle="منصة شاملة مصممة لتقديم أفضل تجربة تعلم لكتاب الله الكريم"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {WHY_FEATURES.map((feat, i) => {
              const Icon = feat.icon
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.09, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ y: -5, transition: { duration: 0.22 } }}
                  className="p-6 rounded-2xl group cursor-default"
                  style={{
                    background: 'rgba(24,8,48,0.55)',
                    border: '1px solid rgba(150,100,240,0.12)',
                    backdropFilter: 'blur(14px)',
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110"
                    style={{
                      background: 'linear-gradient(135deg, rgba(124,58,237,0.18), rgba(124,58,237,0.07))',
                      border: '1px solid rgba(124,58,237,0.22)',
                    }}
                  >
                    <Icon size={22} style={{ color: '#a78fd6' }} />
                  </div>
                  <h3 className="font-heading font-bold text-white text-base mb-2">{feat.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: '#8f7bb5' }}>{feat.desc}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Comparison table ──────────────────────────────────────────────── */}
      <section className="relative z-10 px-[clamp(20px,5vw,68px)] pb-28">
        <div className="max-w-4xl mx-auto">
          <SectionHeading
            eyebrow="مقارنة الباقات"
            title="قارن بين الخطط"
          />
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(24,8,48,0.55)',
              border: '1px solid rgba(150,100,240,0.14)',
              backdropFilter: 'blur(18px)',
            }}
          >
            {/* Header row */}
            <div className="grid grid-cols-4">
              <div className="p-4 border-b border-r" style={{ borderColor: 'rgba(150,100,240,0.1)' }} />
              {[{ n: 'الأساسية', pop: false }, { n: 'المميزة', pop: true }, { n: 'المكثفة', pop: false }].map(({ n, pop }, ci) => (
                <div
                  key={ci}
                  className="p-4 text-center font-heading font-bold text-sm border-b"
                  style={{
                    borderColor: 'rgba(150,100,240,0.1)',
                    borderRight: ci < 2 ? '1px solid rgba(150,100,240,0.1)' : 'none',
                    color: pop ? '#E8C76A' : '#cdbef0',
                    background: pop ? 'rgba(232,199,106,0.04)' : 'transparent',
                  }}
                >
                  {n}
                  {pop && <div className="w-1.5 h-1.5 rounded-full bg-brand-gold mx-auto mt-1.5" />}
                </div>
              ))}
            </div>

            {/* Data rows */}
            {COMPARISON.map((row, ri) => (
              <motion.div
                key={ri}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: ri * 0.04 }}
                className="grid grid-cols-4 group"
                style={{
                  borderBottom: ri < COMPARISON.length - 1 ? '1px solid rgba(150,100,240,0.07)' : 'none',
                }}
              >
                <div
                  className="p-4 text-sm font-medium border-r transition-colors duration-200 group-hover:text-white"
                  style={{ borderColor: 'rgba(150,100,240,0.08)', color: '#b3a4d0' }}
                >
                  {row.label}
                </div>
                {(['basic', 'popular', 'intensive']).map((key, ci) => (
                  <div
                    key={ci}
                    className="p-4 text-center text-sm flex items-center justify-center"
                    style={{
                      borderRight: ci < 2 ? '1px solid rgba(150,100,240,0.07)' : 'none',
                      background: ci === 1 ? 'rgba(232,199,106,0.03)' : 'transparent',
                      color: ci === 1 ? '#E8C76A' : '#cdbef0',
                    }}
                  >
                    {typeof row[key] === 'boolean'
                      ? row[key]
                        ? <Check size={15} style={{ color: ci === 1 ? '#E8C76A' : '#7c3aed' }} />
                        : <span style={{ color: 'rgba(150,100,200,0.28)' }}>—</span>
                      : row[key]
                    }
                  </div>
                ))}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Trust badges ──────────────────────────────────────────────────── */}
      <section className="relative z-10 px-[clamp(20px,5vw,68px)] pb-28">
        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: Shield, title: 'مدفوعات آمنة 100%',   desc: 'تشفير SSL على كل المعاملات' },
              { icon: Award,  title: 'ضمان استرداد ٧ أيام', desc: 'رضاك التام أو نرد أموالك كاملاً' },
              { icon: Users,  title: 'معلمون معتمدون',       desc: 'إجازات موثوقة بأسانيد متصلة' },
            ].map((item, i) => {
              const Icon = item.icon
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-4 p-5 rounded-2xl"
                  style={{
                    background: 'rgba(24,8,48,0.45)',
                    border: '1px solid rgba(232,199,106,0.1)',
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(232,199,106,0.1)', border: '1px solid rgba(232,199,106,0.2)' }}
                  >
                    <Icon size={18} style={{ color: '#E8C76A' }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{item.title}</p>
                    <p className="text-xs mt-0.5 leading-relaxed" style={{ color: '#8f7bb5' }}>{item.desc}</p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <section className="relative z-10 px-[clamp(20px,5vw,68px)] pb-28">
        <div className="max-w-2xl mx-auto">
          <SectionHeading
            eyebrow="الأسئلة الشائعة"
            title="أسئلة حول الأسعار"
          />
          <div className="space-y-3">
            {FAQS.map((item, i) => (
              <FAQItem key={i} item={item} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <section className="relative z-10 px-[clamp(20px,5vw,68px)] pb-36">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
            className="relative rounded-[36px] overflow-hidden text-center px-8 py-14"
          >
            {/* Shell */}
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(145deg, rgba(48,18,90,0.92) 0%, rgba(26,8,52,0.97) 100%)',
                backdropFilter: 'blur(28px)',
                border: '1.5px solid rgba(232,199,106,0.2)',
                borderRadius: 36,
              }}
            />

            {/* Breathing center glow */}
            <motion.div
              className="absolute inset-0 rounded-[36px] pointer-events-none"
              animate={{ opacity: [0.35, 0.75, 0.35] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
              style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(232,199,106,0.12) 0%, transparent 65%)' }}
            />

            {/* Top shimmer */}
            <div
              className="absolute top-0 left-12 right-12 h-px"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(232,199,106,0.55), transparent)' }}
            />

            <div className="relative z-10">
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                className="w-16 h-16 rounded-[20px] mx-auto mb-7 flex items-center justify-center"
                style={{ background: 'rgba(232,199,106,0.1)', border: '1px solid rgba(232,199,106,0.25)' }}
              >
                <Sparkles size={26} style={{ color: '#E8C76A' }} />
              </motion.div>

              <h2
                className="font-heading font-extrabold text-white mb-4"
                style={{ fontSize: 'clamp(24px, 3.2vw, 38px)', letterSpacing: '-0.01em' }}
              >
                ابدأ رحلتك مع القرآن اليوم
              </h2>
              <p className="mb-9 max-w-md mx-auto leading-relaxed" style={{ color: '#b3a4d0' }}>
                انضم لأكثر من ٥٠٠ طالب يتعلمون القرآن الكريم مع أفضل المعلمين المعتمدين
              </p>

              <Link
                to={ROUTES.REGISTER}
                className="inline-flex items-center gap-3 px-10 py-4 rounded-[16px] font-bold transition-all duration-300 hover:scale-105 text-brand-goldText"
                style={{
                  background: 'linear-gradient(135deg, #E8C76A 0%, #D4AF37 100%)',
                  boxShadow: '0 8px 32px rgba(212,175,55,0.4)',
                  fontSize: 15,
                }}
              >
                <Sparkles size={16} />
                ابدأ الآن مجاناً
              </Link>

              <p className="mt-5 text-xs" style={{ color: 'rgba(150,130,180,0.55)' }}>
                بدون بطاقة ائتمان · ضمان استرداد ٧ أيام
              </p>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
