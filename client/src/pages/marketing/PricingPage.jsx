import { useState, useRef, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence, useScroll, useTransform, useInView } from 'framer-motion'
import {
  Check, ChevronDown, Shield, Clock, Award, Users, Headphones,
  Sparkles, Star, ArrowLeft, BarChart3,
} from 'lucide-react'
import { ROUTES } from '../../config/constants.js'
import { usePackages } from '../../hooks/usePackages.js'
import { formatCurrency } from '../../utils/format.js'

// ─── Real-package helpers ────────────────────────────────────────────────────

// The Package schema stores a single `price` for a `durationDays`-long cycle —
// there is no monthly/yearly billing-period concept in the data, so we only
// ever derive a human-readable duration label from it (never invent a second
// price or a discount).
function humanizeDuration(days) {
  if (!days) return ''
  if (days % 365 === 0) return days === 365 ? 'سنة كاملة' : `${days / 365} سنوات`
  if (days % 30 === 0) {
    const months = days / 30
    if (months === 1) return 'شهر واحد'
    if (months === 2) return 'شهرين'
    return `${months} أشهر`
  }
  return `${days} يوم`
}

const WHY_FEATURES = [
  { icon: Users,         title: 'معلمون محترفون',         desc: 'نخبة من أفضل معلمي القرآن بإجازات معتمدة' },
  { icon: Clock,         title: 'جداول مرنة',             desc: 'اختر توقيت حصصك بما يناسب جدولك اليومي' },
  { icon: BarChart3,     title: 'تقارير مفصلة',           desc: 'تتبع تقدمك بتقارير دورية شاملة وتحليل الأداء' },
  { icon: Award,         title: 'شهادات معتمدة',          desc: 'احصل على شهادة إتمام عند إكمال البرنامج' },
  { icon: Sparkles,      title: 'مساعد ذكاء اصطناعي',    desc: 'مساعد ذكي يُجيب على أسئلتك في أي وقت' },
  { icon: Headphones,    title: 'دعم على مدار الساعة',   desc: 'فريق دعم متاح ٢٤/٧ لمساعدتك في أي استفسار' },
]

const FAQS = [
  { q: 'هل يمكنني تغيير باقتي في أي وقت؟',       a: 'نعم، يمكنك تقديم طلب اشتراك في باقة جديدة في أي وقت من لوحة التحكم، وسيقوم فريقنا بمراجعته وتفعيله بعد التأكد من الدفع.' },
  { q: 'ما هي طرق الدفع المتاحة؟',               a: 'التحويل البنكي أو الدفع النقدي حالياً — تختار الباقة وترفع إثبات الدفع، ويقوم فريقنا بمراجعة الطلب وتفعيل باقتك.' },
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

// ─── Pricing card ─────────────────────────────────────────────────────────────

function PricingCard({ pkg, index }) {
  const cardRef = useRef(null)
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 50 })
  const [hovered, setHovered] = useState(false)

  const onMouseMove = useCallback((e) => {
    const el = cardRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2)
    const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2)
    const max = pkg.isPopular ? 7 : 10
    setTilt({
      rx: -dy * max,
      ry: dx * max,
      gx: ((e.clientX - r.left) / r.width) * 100,
      gy: ((e.clientY - r.top) / r.height) * 100,
    })
  }, [pkg.isPopular])

  const onMouseLeave = useCallback(() => {
    setHovered(false)
    setTilt({ rx: 0, ry: 0, gx: 50, gy: 50 })
  }, [])

  return (
    <motion.div
      ref={cardRef}
      className="relative"
      initial={{ opacity: 0, y: 70, scale: 0.88 }}
      animate={{ opacity: 1, y: 0, scale: pkg.isPopular ? 1.06 : 1 }}
      transition={{ duration: 0.75, delay: index * 0.14, ease: [0.16, 1, 0.3, 1] }}
      onMouseMove={onMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={onMouseLeave}
      style={{ zIndex: pkg.isPopular ? 10 : 1, perspective: 1200 }}
    >
      {/* Outer ambient glow */}
      {pkg.isPopular && (
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
      {!pkg.isPopular && hovered && (
        <div
          className="absolute -inset-2 rounded-[36px] pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(124,58,237,0.12) 0%, transparent 70%)',
            filter: 'blur(20px)',
          }}
        />
      )}

      {/* Floating particles on popular card */}
      {pkg.isPopular && (
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
            background: pkg.isPopular
              ? 'linear-gradient(150deg, rgba(50,20,96,0.97) 0%, rgba(28,8,58,0.99) 100%)'
              : 'linear-gradient(150deg, rgba(28,10,55,0.75) 0%, rgba(14,4,30,0.88) 100%)',
            backdropFilter: 'blur(28px)',
            boxShadow: pkg.isPopular
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
              background: pkg.isPopular
                ? 'linear-gradient(90deg, transparent, rgba(232,199,106,0.6), transparent)'
                : 'linear-gradient(90deg, transparent, rgba(150,100,240,0.3), transparent)',
            }}
          />

          {/* Content */}
          <div className="relative z-10 p-8 flex flex-col h-full">
            {/* Badge — derived only from the real isPopular flag, no invented per-package labels */}
            {pkg.isPopular && (
              <div className="flex justify-center mb-5">
                <motion.span
                  animate={{ scale: [1, 1.04, 1] }}
                  transition={{ duration: 2.2, repeat: Infinity }}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold tracking-wide"
                  style={{ background: 'linear-gradient(135deg, #E8C76A, #D4AF37)', color: '#2a1500' }}
                >
                  <Star size={10} fill="currentColor" />
                  الأكثر طلباً
                </motion.span>
              </div>
            )}

            {/* Plan label */}
            <div className="text-center mb-6">
              {pkg.name && (
                <p
                  className="text-[10px] font-bold tracking-[0.2em] uppercase mb-2"
                  style={{ color: pkg.isPopular ? 'rgba(232,199,106,0.65)' : 'rgba(150,100,240,0.65)' }}
                >
                  {pkg.name}
                </p>
              )}
              <h3 className="font-heading font-bold text-white text-[1.35rem]">{pkg.nameAr}</h3>
            </div>

            {/* Price */}
            <div className="text-center mb-6">
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.14 + 0.2 }}
                className="font-heading font-extrabold text-white leading-none"
                style={{ fontSize: 'clamp(40px, 4.2vw, 52px)' }}
              >
                {formatCurrency(pkg.price, pkg.currency)}
              </motion.div>
              <p className="text-xs mt-3 leading-relaxed" style={{ color: '#9f8bc0' }}>
                {pkg.sessionsPerMonth} حصة شهرياً
                {pkg.durationDays ? ` · لمدة ${humanizeDuration(pkg.durationDays)}` : ''}
              </p>
            </div>

            {/* Divider */}
            <div
              className="mb-6 h-px"
              style={{
                background: pkg.isPopular
                  ? 'linear-gradient(90deg, transparent, rgba(232,199,106,0.35), transparent)'
                  : 'linear-gradient(90deg, transparent, rgba(124,58,237,0.2), transparent)',
              }}
            />

            {/* Features — plain admin-authored strings, no invented per-feature icons */}
            <ul className="space-y-3.5 flex-1">
              {(pkg.featuresAr || []).map((feat, fi) => (
                <motion.li
                  key={fi}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.14 + fi * 0.07 + 0.5 }}
                  className="flex items-center gap-3 group/feat"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{feat}</p>
                  </div>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.14 + fi * 0.07 + 0.6, type: 'spring', stiffness: 400 }}
                    className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: pkg.isPopular ? 'rgba(232,199,106,0.15)' : 'rgba(124,58,237,0.15)' }}
                  >
                    <Check size={9} style={{ color: pkg.isPopular ? '#E8C76A' : '#a78fd6' }} />
                  </motion.div>
                </motion.li>
              ))}
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
          background: pkg.isPopular
            ? 'linear-gradient(135deg, #E8C76A 0%, #D4AF37 100%)'
            : 'transparent',
          color: pkg.isPopular ? '#2a1500' : '#E8C76A',
          border: pkg.isPopular ? 'none' : '1.5px solid rgba(232,199,106,0.35)',
          boxShadow: pkg.isPopular
            ? hov ? '0 8px 30px rgba(212,175,55,0.55)' : '0 4px 20px rgba(212,175,55,0.3)'
            : hov ? '0 4px 20px rgba(124,58,237,0.25)' : 'none',
        }}
      >
        {/* Hover overlay for non-popular */}
        {!pkg.isPopular && (
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
  const { packages, isLoading, isError, refetch } = usePackages({ activeOnly: true })
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
      </motion.section>

      {/* ── Pricing cards ─────────────────────────────────────────────────── */}
      <section className="relative z-10 px-[clamp(16px,4vw,60px)] pb-28">
        <div className="max-w-[1100px] mx-auto">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-[32px] animate-pulse"
                  style={{ height: 440, background: 'rgba(24,8,48,0.55)', border: '1px solid rgba(150,100,240,0.14)' }}
                />
              ))}
            </div>
          ) : isError ? (
            <div
              className="rounded-[24px] p-10 text-center"
              style={{ background: 'rgba(24,8,48,0.55)', border: '1px solid rgba(232,199,106,0.15)' }}
            >
              <p className="text-white font-semibold mb-4">تعذّر تحميل الباقات حالياً</p>
              <button
                onClick={() => refetch()}
                className="px-6 py-2.5 rounded-full text-sm font-bold"
                style={{ background: 'linear-gradient(135deg, #E8C76A, #D4AF37)', color: '#2a1500' }}
              >
                إعادة المحاولة
              </button>
            </div>
          ) : packages.length === 0 ? (
            <div
              className="rounded-[24px] p-10 text-center"
              style={{ background: 'rgba(24,8,48,0.55)', border: '1px solid rgba(150,100,240,0.14)' }}
            >
              <p style={{ color: '#b3a4d0' }}>لا توجد باقات متاحة حالياً</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 items-center">
              {packages.map((pkg, i) => (
                <PricingCard key={pkg._id} pkg={pkg} index={i} />
              ))}
            </div>
          )}
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
      {/* Built dynamically from real packages — only structured, trustworthy
          fields (price/sessions/duration) are compared. Feature strings are
          free-text and admin-authored, so they're not reliable enough to turn
          into per-package boolean capability claims — shown on the cards
          above instead, not fabricated here as a comparison matrix. */}
      {!isLoading && !isError && packages.length >= 2 && (
        <section className="relative z-10 px-[clamp(20px,5vw,68px)] pb-28">
          <div className="max-w-4xl mx-auto">
            <SectionHeading
              eyebrow="مقارنة الباقات"
              title="قارن بين الخطط"
            />
            {(() => {
              const cols = packages.slice(0, 4)
              const gridStyle = { gridTemplateColumns: `1.3fr repeat(${cols.length}, 1fr)` }
              const rows = [
                { label: 'السعر', render: (p) => formatCurrency(p.price, p.currency) },
                { label: 'الحصص شهرياً', render: (p) => `${p.sessionsPerMonth} حصة` },
                { label: 'مدة الباقة', render: (p) => humanizeDuration(p.durationDays) },
              ]
              return (
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
                  <div className="grid" style={gridStyle}>
                    <div className="p-4 border-b border-r" style={{ borderColor: 'rgba(150,100,240,0.1)' }} />
                    {cols.map((p, ci) => (
                      <div
                        key={p._id}
                        className="p-4 text-center font-heading font-bold text-sm border-b"
                        style={{
                          borderColor: 'rgba(150,100,240,0.1)',
                          borderRight: ci < cols.length - 1 ? '1px solid rgba(150,100,240,0.1)' : 'none',
                          color: p.isPopular ? '#E8C76A' : '#cdbef0',
                          background: p.isPopular ? 'rgba(232,199,106,0.04)' : 'transparent',
                        }}
                      >
                        {p.nameAr}
                        {p.isPopular && <div className="w-1.5 h-1.5 rounded-full bg-brand-gold mx-auto mt-1.5" />}
                      </div>
                    ))}
                  </div>

                  {/* Data rows */}
                  {rows.map((row, ri) => (
                    <motion.div
                      key={row.label}
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: ri * 0.04 }}
                      className="grid group"
                      style={{ ...gridStyle, borderBottom: ri < rows.length - 1 ? '1px solid rgba(150,100,240,0.07)' : 'none' }}
                    >
                      <div
                        className="p-4 text-sm font-medium border-r transition-colors duration-200 group-hover:text-white"
                        style={{ borderColor: 'rgba(150,100,240,0.08)', color: '#b3a4d0' }}
                      >
                        {row.label}
                      </div>
                      {cols.map((p, ci) => (
                        <div
                          key={p._id}
                          className="p-4 text-center text-sm flex items-center justify-center"
                          style={{
                            borderRight: ci < cols.length - 1 ? '1px solid rgba(150,100,240,0.07)' : 'none',
                            background: p.isPopular ? 'rgba(232,199,106,0.03)' : 'transparent',
                            color: p.isPopular ? '#E8C76A' : '#cdbef0',
                          }}
                        >
                          {row.render(p)}
                        </div>
                      ))}
                    </motion.div>
                  ))}
                </motion.div>
              )
            })()}
          </div>
        </section>
      )}

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
