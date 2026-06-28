import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '../../config/constants.js'

/* ─────────────────────────────────────────────
   Shared micro-components
───────────────────────────────────────────── */

function CheckIcon({ color = '#6D34D6' }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M5 13l4 4 10-11" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function StarIcon({ size = 17, fill = '#E8C76A' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}>
      <path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.1l1-5.8L3.5 9.2l5.9-.9L12 3Z" />
    </svg>
  )
}

function ArrowLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ─────────────────────────────────────────────
   Animated counter hook
───────────────────────────────────────────── */
function useCountUp(targets, duration = 1700) {
  const [counts, setCounts] = useState({ students: 0, teachers: 0, hours: 0, rating: 0 })
  const rafRef = useRef(null)
  const startedRef = useRef(false)

  function start() {
    if (startedRef.current) return
    startedRef.current = true
    const startTime = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - startTime) / duration)
      const e = 1 - Math.pow(1 - t, 3)
      setCounts({
        students: Math.round(targets.students * e),
        teachers: Math.round(targets.teachers * e),
        hours:    Math.round(targets.hours * e),
        rating:   parseFloat((targets.rating * e).toFixed(1)),
      })
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }, [])
  return [counts, start]
}

/* ─────────────────────────────────────────────
   Pricing logic
───────────────────────────────────────────── */
const BASE = { basic: 19, pro: 39, prem: 69, fam: 99 }
const MULT = { سنوي: 1, فصلي: 1.12, شهري: 1.3 }
function price(key, period) { return '$' + Math.round(BASE[key] * MULT[period]) }

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
export default function HomePage() {
  const [period, setPeriod] = useState('سنوي')
  const [counts, startCount] = useCountUp({ students: 20, teachers: 120, hours: 10, rating: 4.9 })

  // Trigger counter when hero is visible
  const heroRef = useRef(null)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) startCount() }, { threshold: 0.3 })
    if (heroRef.current) obs.observe(heroRef.current)
    return () => obs.disconnect()
  }, [])

  return (
    <div style={{ background: '#0f0226', width: '100%', overflowX: 'hidden' }}>

      {/* ════════════════════════════════════════
          HERO
      ════════════════════════════════════════ */}
      <section
        id="top"
        ref={heroRef}
        style={{
          position: 'relative',
          minHeight: '780px',
          padding: '120px clamp(20px,5vw,68px) 36px',
          background: "#150232 url('/images/hero_bg.png') center/cover no-repeat",
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {/* Overlay gradient */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(270deg,rgba(15,2,38,.72) 0%,rgba(15,2,38,.32) 38%,rgba(15,2,38,0) 60%)' }} />

        {/* Listen widget */}
        <div
          className="listen-widget"
          style={{ position: 'absolute', insetInlineEnd: 'clamp(18px,5vw,70px)', top: '42%', zIndex: 3, display: 'flex', alignItems: 'center', gap: 14 }}
        >
          <button style={{ cursor: 'pointer', width: 62, height: 62, borderRadius: '50%', border: '2px solid rgba(232,199,106,.7)', background: 'rgba(20,4,46,.35)', display: 'grid', placeItems: 'center', backdropFilter: 'blur(4px)', transition: 'transform .25s, box-shadow .25s' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#E8C76A"><path d="M8 5v14l11-7z" /></svg>
          </button>
          <div style={{ lineHeight: 1.5 }}>
            <div style={{ color: '#cdbfe8', fontSize: 14, fontWeight: 500 }}>استمع لتلاوة</div>
            <div style={{ color: '#fff', fontSize: 17, fontWeight: 700, fontFamily: 'Cairo' }}>سورة الرحمن</div>
          </div>
        </div>

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 4, maxWidth: 1340, margin: '0 auto', width: '100%', display: 'flex', justifyContent: 'flex-start' }}>
          <div style={{ width: 'min(620px,100%)', textAlign: 'right' }}>
            <h1 style={{ fontWeight: 900, lineHeight: 1.12, fontSize: 'clamp(40px,5.8vw,82px)', color: '#fff', letterSpacing: '-1px', fontFamily: 'Cairo' }}>
              تعلم{' '}
              <span style={{ background: 'linear-gradient(120deg,#E8C76A,#D4AF37)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>القرآن</span>
              <br />
              كما لم تتخيل من قبل
            </h1>

            <p style={{ marginTop: 22, fontSize: 'clamp(17px,1.5vw,21px)', lineHeight: 1.85, color: '#cfc3e8', fontWeight: 400, maxWidth: 540, marginInlineEnd: 'auto' }}>
              منصة تربوية أونلاين تجمع بين{' '}
              <span style={{ color: '#E8C76A' }}>أصالة العلم</span>
              {' '}وقوة التقنية لتمنحك{' '}
              <span style={{ color: '#E8C76A' }}>تجربة تعلم فريدة</span>
              {' '}وملهمة.
            </p>

            {/* CTA Buttons */}
            <div className="hero-cta" style={{ marginTop: 32, display: 'flex', gap: 16, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <Link
                to={ROUTES.PROGRAMS}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, fontFamily: 'Tajawal', fontWeight: 700, fontSize: 17, color: '#fff', background: 'rgba(255,255,255,.04)', border: '1.5px solid rgba(255,255,255,.22)', borderRadius: 38, padding: '16px 32px', textDecoration: 'none', transition: 'transform .25s, border-color .25s, background .25s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = '#E8C76A'; e.currentTarget.style.background = 'rgba(232,199,106,.08)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = 'rgba(255,255,255,.22)'; e.currentTarget.style.background = 'rgba(255,255,255,.04)' }}
              >
                استكشف المسارات
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M11 6l-6 6 6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </Link>
              <Link
                to={ROUTES.REGISTER}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, fontFamily: 'Tajawal', fontWeight: 800, fontSize: 17, color: '#2a1500', background: 'linear-gradient(135deg,#E8C76A,#D4AF37)', border: 'none', borderRadius: 38, padding: '16px 36px', boxShadow: '0 14px 34px rgba(212,175,55,.42)', textDecoration: 'none', transition: 'transform .25s, box-shadow .25s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 14px 34px rgba(212,175,55,.65)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 14px 34px rgba(212,175,55,.42)' }}
              >
                ابدأ رحلتك الآن
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M11 6l-6 6 6 6" stroke="#2a1500" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </Link>
            </div>

            {/* Stats */}
            <div className="hero-stats" style={{ marginTop: 48, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 'clamp(18px,2.6vw,40px)' }}>
              <div style={{ textAlign: 'center' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 8px', display: 'block' }}><path d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21a8 8 0 0 1 16 0" stroke="#E8C76A" strokeWidth="1.7" strokeLinecap="round" /></svg>
                <div style={{ color: '#fff', fontFamily: 'Cairo', fontWeight: 800, fontSize: 'clamp(22px,2.2vw,28px)' }}>+{counts.students}K</div>
                <div style={{ color: '#b3a4d0', fontSize: 14, marginTop: 2 }}>طالب وطالبة</div>
              </div>
              <div className="stat-div" style={{ width: 1, height: 52, background: 'rgba(255,255,255,.16)' }} />
              <div style={{ textAlign: 'center' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 8px', display: 'block' }}><path d="m12 4 10 5-10 5L2 9l10-5Z" stroke="#E8C76A" strokeWidth="1.7" strokeLinejoin="round" /><path d="M6 11v5c0 1.1 2.7 3 6 3s6-1.9 6-3v-5" stroke="#E8C76A" strokeWidth="1.7" strokeLinecap="round" /></svg>
                <div style={{ color: '#fff', fontFamily: 'Cairo', fontWeight: 800, fontSize: 'clamp(22px,2.2vw,28px)' }}>+{counts.teachers}</div>
                <div style={{ color: '#b3a4d0', fontSize: 14, marginTop: 2 }}>معلم متخصص</div>
              </div>
              <div className="stat-div" style={{ width: 1, height: 52, background: 'rgba(255,255,255,.16)' }} />
              <div style={{ textAlign: 'center' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 8px', display: 'block' }}><circle cx="12" cy="12" r="9" stroke="#E8C76A" strokeWidth="1.7" /><path d="M12 7v5l3 3" stroke="#E8C76A" strokeWidth="1.7" strokeLinecap="round" /></svg>
                <div style={{ color: '#fff', fontFamily: 'Cairo', fontWeight: 800, fontSize: 'clamp(22px,2.2vw,28px)' }}>+{counts.hours}K</div>
                <div style={{ color: '#b3a4d0', fontSize: 14, marginTop: 2 }}>ساعة تعليمية</div>
              </div>
              <div className="stat-div" style={{ width: 1, height: 52, background: 'rgba(255,255,255,.16)' }} />
              <div style={{ textAlign: 'center' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="#E8C76A" style={{ margin: '0 auto 8px', display: 'block' }}><path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.1l1-5.8L3.5 9.2l5.9-.9L12 3Z" /></svg>
                <div style={{ color: '#fff', fontFamily: 'Cairo', fontWeight: 800, fontSize: 'clamp(22px,2.2vw,28px)' }}>{counts.rating.toFixed(1)}/5</div>
                <div style={{ color: '#b3a4d0', fontSize: 14, marginTop: 2 }}>تقييم الطلاب</div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{ position: 'absolute', bottom: 18, insetInlineStart: '50%', transform: 'translateX(-50%)', zIndex: 4 }}>
          <div style={{ width: 42, height: 42, borderRadius: '50%', border: '1.5px solid rgba(232,199,106,.5)', display: 'grid', placeItems: 'center', animation: 'floaty 2.4s ease-in-out infinite' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="m6 9 6 6 6-6M6 4l6 6 6-6" stroke="#E8C76A" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          JOURNEY
      ════════════════════════════════════════ */}
      <section id="journey" style={{ background: '#F6F4FB', padding: 'clamp(64px,8vw,110px) clamp(20px,5vw,68px)' }}>
        <div style={{ maxWidth: 1340, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 'clamp(32px,5vw,72px)', flexWrap: 'wrap' }}>

          {/* Steps */}
          <div style={{ flex: '1 1 600px', minWidth: 0, display: 'flex', alignItems: 'stretch', gap: 14, justifyContent: 'flex-start', overflowX: 'auto', paddingBottom: 8 }} dir="ltr">
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 0, flex: 1 }}>

              {/* Step 1 */}
              <JourneyStep
                icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1.5" stroke="#6D34D6" strokeWidth="1.7" /><rect x="14" y="3" width="7" height="7" rx="1.5" stroke="#6D34D6" strokeWidth="1.7" /><rect x="3" y="14" width="7" height="7" rx="1.5" stroke="#6D34D6" strokeWidth="1.7" /><rect x="14" y="14" width="7" height="7" rx="1.5" stroke="#6D34D6" strokeWidth="1.7" /></svg>}
                num="1" title="تقييم المستوى" desc="اختبار تحديد المستوى لتحديد نقاط القوة لديك بدقة"
              />
              <WavyConnector color="#b9a4ec" />

              {/* Step 2 */}
              <JourneyStep
                icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 6c-1.6-1-3.6-1.5-6-1.5v13c2.4 0 4.4.5 6 1.5 1.6-1 3.6-1.5 6-1.5v-13c-2.4 0-4.4.5-6 1.5Z" stroke="#6D34D6" strokeWidth="1.6" strokeLinejoin="round" /><path d="M12 6v13" stroke="#6D34D6" strokeWidth="1.6" /></svg>}
                num="2" title="خطة مخصصة" desc="خطة تعلم خاصة تناسب أهدافك ووقتك"
              />
              <WavyConnector color="#E8A23C" />

              {/* Step 3 - active */}
              <div
                style={{ flex: 1.05, minWidth: 148, background: '#fff', borderRadius: 22, padding: '32px 16px', textAlign: 'center', boxShadow: '0 22px 50px rgba(212,150,40,.22)', border: '2px solid #E8B24A', alignSelf: 'stretch', display: 'flex', flexDirection: 'column', justifyContent: 'center', transition: 'transform .35s cubic-bezier(.2,.7,.2,1), box-shadow .35s', cursor: 'default' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-8px)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = '' }}
              >
                <div style={{ width: 56, height: 56, margin: '0 auto', borderRadius: '50%', background: '#fff', border: '2px solid #E8B24A', display: 'grid', placeItems: 'center' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3" stroke="#E29A2E" strokeWidth="1.7" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" stroke="#E29A2E" strokeWidth="1.7" strokeLinecap="round" /><circle cx="17" cy="9" r="2.3" stroke="#E29A2E" strokeWidth="1.7" /><path d="M15.5 19a4 4 0 0 1 6-3.4" stroke="#E29A2E" strokeWidth="1.7" strokeLinecap="round" /></svg>
                </div>
                <div style={{ marginTop: 14, fontFamily: 'Cairo', fontWeight: 800, color: '#E29A2E', fontSize: 18 }}>3</div>
                <div dir="rtl" style={{ marginTop: 8, fontFamily: 'Cairo', fontWeight: 800, color: '#1A0447', fontSize: 18 }}>تعلم وتطوير</div>
                <div dir="rtl" style={{ marginTop: 8, color: '#6B7280', fontSize: 14, lineHeight: 1.7 }}>تعلم مع معلمين متخصصين ومتابعة مستمرة</div>
              </div>
              <WavyConnector color="#E8A23C" flipEnd />

              {/* Step 4 */}
              <JourneyStep
                icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 19h16M7 16l3-4 3 3 4-6" stroke="#6D34D6" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                num="4" title="ممارسة وتطبيق" desc="تطبيق ما تعلمته من خلال أنشطة تفاعلية"
              />
              <WavyConnector color="#b9a4ec" />

              {/* Step 5 */}
              <JourneyStep
                icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M7 4h10v3a5 5 0 0 1-10 0V4Z" stroke="#6D34D6" strokeWidth="1.7" strokeLinejoin="round" /><path d="M17 5h2.5a2.5 2.5 0 0 1-2.5 4M7 5H4.5A2.5 2.5 0 0 0 7 9M10 14h4M9 20h6M12 14v6" stroke="#6D34D6" strokeWidth="1.6" strokeLinecap="round" /></svg>}
                num="5" title="إتقان وتحقيق" desc="تقييم التقدم والاحتفال بالإنجاز بإتقان"
              />
            </div>
          </div>

          {/* Lead text */}
          <div className="journey-lead" style={{ flex: '0 1 360px', minWidth: 280, textAlign: 'right' }}>
            <h2 style={{ fontWeight: 800, fontSize: 'clamp(34px,4vw,52px)', lineHeight: 1.2, fontFamily: 'Cairo' }}>
              <span style={{ background: 'linear-gradient(120deg,#7C3AED,#9b5cf0)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>ابدأ رحلتك</span><br />
              <span style={{ color: '#1A0447' }}>مع القرآن</span>
            </h2>
            <p style={{ marginTop: 20, color: '#6B7280', fontSize: 17, lineHeight: 1.9, maxWidth: 380, marginInlineEnd: 0, marginInlineStart: 'auto' }}>
              اختر المسار الذي يناسبك، وسنرشدك خطوة بخطوة حتى تحقق هدفك في تعلم كتاب الله
            </p>
            <Link
              to={ROUTES.PROGRAMS}
              style={{ cursor: 'pointer', marginTop: 28, display: 'inline-flex', alignItems: 'center', gap: 12, fontFamily: 'Tajawal', fontWeight: 700, fontSize: 17, color: '#fff', background: 'linear-gradient(135deg,#6D34D6,#4B1Fb0)', border: 'none', borderRadius: 14, padding: '16px 30px', boxShadow: '0 16px 34px rgba(75,31,176,.32)', textDecoration: 'none', transition: 'transform .25s, box-shadow .25s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 16px 34px rgba(75,31,176,.52)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 16px 34px rgba(75,31,176,.32)' }}
            >
              اختر مسارك الآن
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          TEACHERS
      ════════════════════════════════════════ */}
      <section id="teachers" style={{ position: 'relative', background: 'radial-gradient(120% 90% at 100% 0%,#3a1273 0%,#1c0942 45%,#140530 100%)', padding: 'clamp(64px,8vw,108px) clamp(20px,5vw,68px)', overflow: 'hidden' }}>
        <div style={{ maxWidth: 1340, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 'clamp(30px,4vw,64px)', flexWrap: 'wrap' }}>

          {/* Teacher cards */}
          <div style={{ flex: '1 1 720px', minWidth: 300, order: 1 }}>
            <div style={{ display: 'flex', gap: 'clamp(16px,1.8vw,26px)', overflowX: 'auto', paddingBottom: 6 }}>
              {[
                { img: '/images/teacher1.png', name: 'أ. فاطمة محمد', cert: 'إجازة في حفص عن عاصم', rating: '4.9' },
                { img: '/images/teacher2.png', name: 'أ. أحمد حسن', cert: 'إجازة في حفص عن عاصم', rating: '5.0' },
                { img: '/images/teacher3.png', name: 'أ. محمد الغامدي', cert: 'إجازة في شعبة عن عاصم', rating: '4.9' },
                { img: '/images/teacher4.png', name: 'أ. سيف عبدالله', cert: 'إجازة في ورش عن نافع', rating: '4.8' },
              ].map((t) => (
                <div
                  key={t.name}
                  style={{ flex: '1 0 215px', background: '#1d0c40', border: '1px solid rgba(255,255,255,.07)', borderRadius: 20, overflow: 'hidden', transition: 'transform .35s cubic-bezier(.2,.7,.2,1)' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-8px)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = '' }}
                >
                  <img src={t.img} alt={t.name} style={{ width: '100%', height: 268, objectFit: 'cover', display: 'block' }} />
                  <div style={{ padding: '16px 18px 18px' }}>
                    <div style={{ color: '#fff', fontFamily: 'Cairo', fontWeight: 800, fontSize: 18 }}>{t.name}</div>
                    <div style={{ color: '#b6a6d8', fontSize: 14, marginTop: 5 }}>{t.cert}</div>
                    <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <StarIcon />
                      <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{t.rating}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Nav arrows */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 22 }}>
              {[
                <path key="l" d="M15 6l-6 6 6 6" stroke="#E8C76A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
                <path key="r" d="M9 6l6 6-6 6" stroke="#E8C76A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
              ].map((p, i) => (
                <button
                  key={i}
                  style={{ cursor: 'pointer', width: 46, height: 46, borderRadius: '50%', border: '1px solid rgba(232,199,106,.4)', background: 'transparent', display: 'grid', placeItems: 'center', transition: 'transform .25s, border-color .25s, background .25s' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = '#E8C76A' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = 'rgba(232,199,106,.4)' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">{p}</svg>
                </button>
              ))}
            </div>
          </div>

          {/* Lead text */}
          <div style={{ flex: '0 1 330px', minWidth: 280, textAlign: 'right', order: 2 }}>
            <div style={{ color: '#9b6cf0', fontWeight: 700, fontSize: 16, marginBottom: 14 }}>معلمون متخصصون</div>
            <h2 style={{ fontWeight: 800, fontSize: 'clamp(34px,4vw,52px)', lineHeight: 1.2, color: '#fff', fontFamily: 'Cairo' }}>
              تعلم على يد<br />أهل القرآن
            </h2>
            <p style={{ marginTop: 20, color: '#c4b6e0', fontSize: 17, lineHeight: 1.9, maxWidth: 360, marginInlineStart: 'auto' }}>
              نخبة من المعلمين المتخصصين في القراءات والتجويد وعلوم القرآن لمساعدتك على الإتقان خطوة بخطوة
            </p>
            <Link
              to={ROUTES.TEACHERS}
              style={{ cursor: 'pointer', marginTop: 28, display: 'inline-block', fontFamily: 'Tajawal', fontWeight: 700, fontSize: 17, color: '#fff', background: 'transparent', border: '1.5px solid rgba(232,199,106,.55)', borderRadius: 34, padding: '15px 34px', textDecoration: 'none', transition: 'transform .25s, border-color .25s, background .25s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = '#E8C76A'; e.currentTarget.style.background = 'rgba(232,199,106,.08)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = 'rgba(232,199,106,.55)'; e.currentTarget.style.background = 'transparent' }}
            >
              عرض جميع المعلمين
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          PLATFORM
      ════════════════════════════════════════ */}
      <section id="platform" style={{ background: '#F8F7FC', padding: 'clamp(64px,8vw,108px) clamp(20px,5vw,68px)' }}>
        <div style={{ maxWidth: 1340, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 'clamp(34px,5vw,70px)', flexWrap: 'wrap' }}>

          {/* Lead text */}
          <div className="platform-lead" style={{ flex: '0 1 360px', minWidth: 280, textAlign: 'right', order: 2 }}>
            <h2 style={{ fontWeight: 800, fontSize: 'clamp(32px,3.6vw,50px)', lineHeight: 1.25, fontFamily: 'Cairo' }}>
              <span style={{ background: 'linear-gradient(120deg,#7C3AED,#9b5cf0)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>منصة ذكية</span><br />
              <span style={{ color: '#1A0447' }}>لتجربة تعلم متكاملة</span>
            </h2>
            <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
              {[
                'لوحة تحكم ذكية لمتابعتك خطوة بخطوة',
                'دورة الحفظ بسهولة مع أفضل المعلمين',
                'التقارير اليومية وتحليلات التطور الأسبوعية',
                'محتوى تفاعلي واختبارات ذكية',
              ].map((f) => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-start', flexDirection: 'row-reverse' }}>
                  <span style={{ flexShrink: 0, width: 26, height: 26, borderRadius: '50%', background: '#E6F4EC', display: 'grid', placeItems: 'center' }}>
                    <CheckIcon color="#1F9D57" />
                  </span>
                  <span style={{ color: '#374151', fontSize: 16.5 }}>{f}</span>
                </div>
              ))}
            </div>
            <Link
              to={ROUTES.PROGRAMS}
              style={{ cursor: 'pointer', marginTop: 30, display: 'inline-flex', alignItems: 'center', gap: 12, fontFamily: 'Tajawal', fontWeight: 700, fontSize: 17, color: '#fff', background: 'linear-gradient(135deg,#6D34D6,#4B1Fb0)', border: 'none', borderRadius: 14, padding: '16px 30px', boxShadow: '0 16px 34px rgba(75,31,176,.28)', textDecoration: 'none', transition: 'transform .25s, box-shadow .25s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = '' }}
            >
              استكشف المنصة
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M11 6l-6 6 6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </Link>
          </div>

          {/* Dashboard image */}
          <div style={{ flex: '1 1 600px', minWidth: 300, order: 1 }}>
            <img src="/images/dashboard.png" alt="لوحة التحكم الذكية" style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 18, filter: 'drop-shadow(0 30px 60px rgba(36,12,82,.16))' }} />
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          STORIES
      ════════════════════════════════════════ */}
      <section id="stories" style={{ position: 'relative', background: 'radial-gradient(110% 120% at 0% 0%,#34106a 0%,#1c0942 46%,#160734 100%)', padding: 'clamp(60px,7vw,96px) clamp(20px,5vw,68px)', overflow: 'hidden' }}>
        <div style={{ maxWidth: 1340, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 'clamp(30px,4vw,60px)', flexWrap: 'wrap' }}>

          {/* Story images */}
          <div style={{ flex: '1 1 660px', minWidth: 300, order: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 'clamp(16px,1.6vw,24px)' }}>
            {[
              { img: '/images/story1.png', alt: 'من القراءة المقطعة إلى ختم القرآن — محمد 13 سنة' },
              { img: '/images/story2.png', alt: 'رحلتي مع التجويد غيرت تلاوتي — سارة 22 سنة' },
              { img: '/images/story3.png', alt: 'حفظت القرآن في 8 أشهر — علي 19 سنة' },
            ].map((s) => (
              <div
                key={s.img}
                style={{ borderRadius: 18, overflow: 'hidden', cursor: 'pointer', boxShadow: '0 20px 44px rgba(0,0,0,.32)', transition: 'transform .35s cubic-bezier(.2,.7,.2,1)' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-8px)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = '' }}
              >
                <img src={s.img} alt={s.alt} style={{ width: '100%', height: 'auto', display: 'block' }} />
              </div>
            ))}
          </div>

          {/* Lead text */}
          <div style={{ flex: '0 1 300px', minWidth: 260, textAlign: 'right', order: 2 }}>
            <h2 style={{ fontWeight: 800, fontSize: 'clamp(32px,3.6vw,48px)', lineHeight: 1.25, color: '#fff', fontFamily: 'Cairo' }}>
              قصص نجاح<br />من واقع تجربتهم
            </h2>
            <p style={{ marginTop: 18, color: '#c4b6e0', fontSize: 16.5, lineHeight: 1.9, maxWidth: 320, marginInlineStart: 'auto' }}>
              آلاف الطلاب حول العالم حققوا أهدافهم في تعلم وحفظ القرآن مع ترتيلة أونلاين
            </p>
            <button
              style={{ cursor: 'pointer', marginTop: 26, fontFamily: 'Tajawal', fontWeight: 700, fontSize: 16, color: '#fff', background: 'transparent', border: '1.5px solid rgba(232,199,106,.5)', borderRadius: 34, padding: '14px 30px', transition: 'transform .25s, border-color .25s, background .25s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = '#E8C76A'; e.currentTarget.style.background = 'rgba(232,199,106,.08)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = 'rgba(232,199,106,.5)'; e.currentTarget.style.background = 'transparent' }}
            >
              شاهد المزيد من القصص
            </button>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          COMMUNITY
      ════════════════════════════════════════ */}
      <section id="community" style={{ background: '#F8F7FC', padding: 'clamp(60px,7vw,100px) clamp(20px,5vw,68px)' }}>
        <div style={{ maxWidth: 1340, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 'clamp(24px,3vw,48px)', flexWrap: 'wrap', justifyContent: 'center' }}>

          {/* Stats column */}
          <div style={{ order: 1, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 26 }}>
            {[
              {
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M2 12h20M12 2c2.5 2.7 4 6.2 4 10s-1.5 7.3-4 10c-2.5-2.7-4-6.2-4-10s1.5-7.3 4-10Z" stroke="#D4AF37" strokeWidth="1.7" /><circle cx="12" cy="12" r="10" stroke="#D4AF37" strokeWidth="1.7" /></svg>,
                val: '+100', label: 'دولة',
              },
              {
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3" stroke="#D4AF37" strokeWidth="1.7" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" stroke="#D4AF37" strokeWidth="1.7" strokeLinecap="round" /><circle cx="17" cy="9" r="2.3" stroke="#D4AF37" strokeWidth="1.7" /><path d="M15.5 19a4 4 0 0 1 6-3.4" stroke="#D4AF37" strokeWidth="1.7" strokeLinecap="round" /></svg>,
                val: '+200K', label: 'طالب وطالبة',
              },
              {
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 5h9M8.5 5v2c0 4-2 7-5 8M6 9c0 2.5 2.5 4.5 6 5.5" stroke="#D4AF37" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /><path d="M13 20l4-9 4 9M14.5 17h5" stroke="#D4AF37" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>,
                val: '+50', label: 'لغات مختلفة',
              },
              {
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M5 13v-1a7 7 0 0 1 14 0v1M5 13h2v5H5a2 2 0 0 1-2-2v-1a2 2 0 0 1 2-2Zm14 0h-2v5h2a2 2 0 0 0 2-2v-1a2 2 0 0 0-2-2Z" stroke="#D4AF37" strokeWidth="1.7" strokeLinejoin="round" /><path d="M17 18a4 4 0 0 1-4 3" stroke="#D4AF37" strokeWidth="1.7" strokeLinecap="round" /></svg>,
                val: '24/7', label: 'دعم ومتابعة',
              },
            ].map((s) => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ flexShrink: 0, width: 50, height: 50, borderRadius: 14, background: '#FBF3DF', display: 'grid', placeItems: 'center' }}>{s.icon}</span>
                <div>
                  <div style={{ fontFamily: 'Cairo', fontWeight: 800, fontSize: 24, color: '#1A0447' }}>{s.val}</div>
                  <div style={{ color: '#6B7280', fontSize: 14 }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* World map */}
          <div style={{ order: 2, flex: '1 1 460px', minWidth: 300, textAlign: 'center' }}>
            <img src="/images/worldmap.png" alt="مجتمع عالمي" style={{ width: '100%', maxWidth: 640, height: 'auto', display: 'block', margin: '0 auto' }} />
          </div>

          {/* Lead text */}
          <div style={{ order: 3, flex: '0 1 300px', minWidth: 260, textAlign: 'right' }}>
            <h2 style={{ fontWeight: 800, fontSize: 'clamp(32px,3.6vw,48px)', lineHeight: 1.25, fontFamily: 'Cairo' }}>
              <span style={{ background: 'linear-gradient(120deg,#7C3AED,#9b5cf0)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>مجتمع عالمي</span><br />
              <span style={{ color: '#1A0447' }}>يجمع القرآن</span>
            </h2>
            <p style={{ marginTop: 18, color: '#6B7280', fontSize: 16.5, lineHeight: 1.9, maxWidth: 320, marginInlineStart: 'auto' }}>
              طلاب من أكثر من 100 دولة يتعلمون ويتواصلون في بيئة آمنة ومحفزة
            </p>
            <Link
              to={ROUTES.REGISTER}
              style={{ cursor: 'pointer', marginTop: 26, display: 'inline-block', fontFamily: 'Tajawal', fontWeight: 700, fontSize: 16, color: '#fff', background: 'linear-gradient(135deg,#6D34D6,#4B1Fb0)', border: 'none', borderRadius: 12, padding: '14px 30px', boxShadow: '0 14px 30px rgba(75,31,176,.26)', textDecoration: 'none', transition: 'transform .25s, box-shadow .25s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = '' }}
            >
              انضم إلى مجتمعنا
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          PRICING
      ════════════════════════════════════════ */}
      <section id="pricing" style={{ background: '#FBFAFE', padding: 'clamp(60px,7vw,100px) clamp(20px,5vw,68px)' }}>
        <div style={{ maxWidth: 1340, margin: '0 auto', display: 'flex', alignItems: 'stretch', gap: 'clamp(28px,4vw,56px)', flexWrap: 'wrap' }}>

          {/* Pricing cards */}
          <div style={{ flex: '1 1 700px', minWidth: 300, order: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 18, alignItems: 'start' }}>

            {/* أساسي */}
            <PriceCard name="أساسي" sub="لبداية رحلتك" price={price('basic', period)} featured={false}
              features={['حصة أسبوعية', 'محتوى مقسّم', 'تقارير تقدم أساسية']}
              checkColor="#6D34D6" btnStyle={{ background: 'linear-gradient(135deg,#5b2bc4,#3d1894)', color: '#fff' }}
            />

            {/* متقدم — featured */}
            <div
              style={{ position: 'relative', background: '#fff', border: '2px solid #E8B24A', borderRadius: 20, padding: '34px 24px 30px', boxShadow: '0 24px 50px rgba(212,160,50,.2)', textAlign: 'right', transition: 'transform .35s cubic-bezier(.2,.7,.2,1)' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-8px)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = '' }}
            >
              <div style={{ position: 'absolute', top: -15, insetInlineStart: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg,#E8C76A,#D4AF37)', color: '#3a2200', fontFamily: 'Cairo', fontWeight: 800, fontSize: 13, padding: '6px 18px', borderRadius: 30, whiteSpace: 'nowrap', boxShadow: '0 8px 18px rgba(212,175,55,.4)' }}>الأكثر اختياراً</div>
              <div style={{ fontFamily: 'Cairo', fontWeight: 800, fontSize: 22, color: '#1A0447' }}>متقدم</div>
              <div style={{ color: '#9aa0ab', fontSize: 14, marginTop: 4 }}>لتعلم مستمر</div>
              <div style={{ marginTop: 18, display: 'flex', alignItems: 'baseline', gap: 6, justifyContent: 'flex-start', flexDirection: 'row-reverse' }}>
                <span style={{ fontFamily: 'Cairo', fontWeight: 800, fontSize: 36, color: '#1A0447' }}>{price('pro', period)}</span>
                <span style={{ color: '#9aa0ab', fontSize: 14 }}>/الشهر</span>
              </div>
              <div style={{ height: 1, background: '#f1e6cf', margin: '20px 0' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 15, color: '#4b5563' }}>
                {['4 حصص أسبوعياً', 'معلم مخصص', 'تقارير تقدم متقدمة', 'محتوى تفاعلي'].map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, flexDirection: 'row-reverse', justifyContent: 'flex-start' }}>
                    <CheckIcon color="#D4AF37" /><span>{f}</span>
                  </div>
                ))}
              </div>
              <Link to={ROUTES.REGISTER} style={{ display: 'block', width: '100%', marginTop: 24, fontFamily: 'Tajawal', fontWeight: 800, fontSize: 15, color: '#3a2200', background: 'linear-gradient(135deg,#E8C76A,#D4AF37)', border: 'none', borderRadius: 11, padding: 13, boxShadow: '0 12px 26px rgba(212,175,55,.36)', textAlign: 'center', textDecoration: 'none', cursor: 'pointer', transition: 'transform .25s, box-shadow .25s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = '' }}
              >ابدأ الآن</Link>
            </div>

            {/* مميز */}
            <PriceCard name="مميز" sub="لتقدم أسرع" price={price('prem', period)} featured={false}
              features={['حصص يومية', 'معلم مخصص', 'تقارير تفصيلية', 'جلسات مراجعة']}
              checkColor="#6D34D6" btnStyle={{ background: 'linear-gradient(135deg,#5b2bc4,#3d1894)', color: '#fff' }}
            />

            {/* عائلي */}
            <PriceCard name="عائلي" sub="لجميع أفراد العائلة" price={price('fam', period)} featured={false}
              features={['حتى 5 أفراد', 'معلم لكل فرد', 'تقارير عائلية', 'دعم خاص']}
              checkColor="#6D34D6" btnStyle={{ background: 'linear-gradient(135deg,#5b2bc4,#3d1894)', color: '#fff' }}
            />
          </div>

          {/* Period picker + lead */}
          <div style={{ flex: '0 1 300px', minWidth: 260, order: 2, textAlign: 'right', alignSelf: 'center' }}>
            <h2 style={{ fontWeight: 800, fontSize: 'clamp(32px,3.6vw,50px)', lineHeight: 1.25, fontFamily: 'Cairo' }}>
              <span style={{ background: 'linear-gradient(120deg,#7C3AED,#9b5cf0)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>اختر الخطة</span><br />
              <span style={{ color: '#1A0447' }}>المناسبة لك</span>
            </h2>
            <p style={{ marginTop: 18, color: '#6B7280', fontSize: 16.5, lineHeight: 1.9, maxWidth: 300, marginInlineStart: 'auto' }}>
              خطط مرنة تناسب جميع احتياجاتك وأهدافك في تعلم القرآن
            </p>
            <div style={{ marginTop: 26, display: 'inline-flex', background: '#efeaf8', borderRadius: 40, padding: 5, gap: 4 }}>
              {['شهري', 'فصلي', 'سنوي'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  style={{
                    cursor: 'pointer', fontFamily: 'Tajawal', fontWeight: 600, fontSize: 14, border: 'none', borderRadius: 34, padding: '10px 20px',
                    background: period === p ? '#ffffff' : 'transparent',
                    color: period === p ? '#1A0447' : '#8b7fb0',
                    boxShadow: period === p ? '0 4px 12px rgba(36,12,82,.14)' : 'none',
                    transition: 'all .25s',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 14 }}>
              <span style={{ display: 'inline-block', background: '#efeaf8', color: '#7c5fc0', fontSize: 13, fontWeight: 600, padding: '7px 16px', borderRadius: 24 }}>خصم 20% —</span>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          CONTACT / CTA
      ════════════════════════════════════════ */}
      <section
        id="contact"
        style={{
          position: 'relative',
          background: "#160734 url('/images/footer_bg.png') center/cover no-repeat",
          minHeight: 'clamp(380px,42vw,520px)',
          display: 'flex',
          alignItems: 'center',
          padding: 'clamp(40px,6vw,72px) clamp(20px,5vw,68px)',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(270deg,rgba(22,7,52,.78) 0%,rgba(22,7,52,.4) 42%,rgba(22,7,52,0) 64%)' }} />
        <div style={{ position: 'relative', zIndex: 2, maxWidth: 1340, margin: '0 auto', width: '100%', display: 'flex', justifyContent: 'flex-start' }}>
          <div style={{ width: 'min(560px,100%)', textAlign: 'right' }}>
            <h2 style={{ fontWeight: 800, fontSize: 'clamp(32px,4.4vw,56px)', lineHeight: 1.2, color: '#fff', fontFamily: 'Cairo' }}>
              <span style={{ background: 'linear-gradient(120deg,#E8C76A,#D4AF37)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>ابدأ رحلتك</span>
              {' '}مع كتاب الله
            </h2>
            <div style={{ marginTop: 14, fontFamily: 'Cairo', fontWeight: 700, fontSize: 'clamp(18px,2vw,24px)', color: '#E8C76A' }}>اليوم هو أفضل يوم لتبدأ!</div>
            <p style={{ marginTop: 14, color: '#cabfe4', fontSize: 'clamp(15px,1.4vw,18px)', lineHeight: 1.85, maxWidth: 430, marginInlineStart: 'auto' }}>
              انضم إلى آلاف الطلاب وابدأ رحلتك التعليمية في ترتيلة أونلاين
            </p>
            <div style={{ marginTop: 28, display: 'flex', gap: 14, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <Link
                to={ROUTES.CONTACT}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'Tajawal', fontWeight: 700, fontSize: 16, color: '#fff', background: 'rgba(255,255,255,.05)', border: '1.5px solid rgba(255,255,255,.28)', borderRadius: 36, padding: '15px 30px', textDecoration: 'none', transition: 'transform .25s, border-color .25s, background .25s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = '#E8C76A'; e.currentTarget.style.background = 'rgba(232,199,106,.08)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = 'rgba(255,255,255,.28)'; e.currentTarget.style.background = 'rgba(255,255,255,.05)' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.4A8 8 0 1 1 21 12Z" stroke="#fff" strokeWidth="1.7" strokeLinejoin="round" /></svg>
                تواصل معنا
              </Link>
              <Link
                to={ROUTES.REGISTER}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'Tajawal', fontWeight: 800, fontSize: 16, color: '#2a1500', background: 'linear-gradient(135deg,#E8C76A,#D4AF37)', border: 'none', borderRadius: 36, padding: '15px 34px', boxShadow: '0 14px 32px rgba(212,175,55,.4)', textDecoration: 'none', transition: 'transform .25s, box-shadow .25s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 14px 32px rgba(212,175,55,.65)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 14px 32px rgba(212,175,55,.4)' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M11 6l-6 6 6 6" stroke="#2a1500" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                ابدأ رحلتك الآن
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════ */}
      {/* <footer style={{ background: '#100327', padding: 'clamp(36px,4vw,52px) clamp(20px,5vw,68px) 30px', borderTop: '1px solid rgba(255,255,255,.06)' }}>
        <div style={{ maxWidth: 1340, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <img src="/images/logo.jpg" alt="ترتيلة أونلاين" style={{ width: 46, height: 46, borderRadius: 13, objectFit: 'cover', border: '1px solid rgba(212,175,55,.4)' }} />
            <div style={{ lineHeight: 1.18 }}>
              <div style={{ color: '#F3E6C0', fontFamily: 'Cairo', fontWeight: 800, fontSize: 16 }}>ترتيلة</div>
              <div style={{ color: '#9b7fd6', fontSize: 10, letterSpacing: 3, fontWeight: 600 }}>ONLINE</div>
            </div>
          </div>
          <nav style={{ display: 'flex', gap: 'clamp(16px,2.4vw,30px)', flexWrap: 'wrap', fontSize: 15 }}>
            {[
              { label: 'الرئيسية', href: '#top' },
              { label: 'مسارات التعلم', href: '#journey' },
              { label: 'المعلمون', href: '#teachers' },
              { label: 'الأسعار', href: '#pricing' },
              { label: 'من نحن', href: '#community' },
              { label: 'تواصل معنا', href: '#contact' },
            ].map((l) => (
              <a
                key={l.href}
                href={l.href}
                style={{ position: 'relative', color: '#E7E0F5', textDecoration: 'none', transition: 'color .25s', whiteSpace: 'nowrap' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#E8C76A' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#E7E0F5' }}
              >
                {l.label}
              </a>
            ))}
          </nav>
        </div>
        <div style={{ maxWidth: 1340, margin: '26px auto 0', paddingTop: 22, borderTop: '1px solid rgba(255,255,255,.06)', textAlign: 'center', color: '#8576a8', fontSize: 14 }}>
          © 2026 ترتيلة أونلاين — جميع الحقوق محفوظة
        </div>
      </footer> */}

      {/* ════════════════════════════════════════
          RESPONSIVE STYLES (via <style>)
      ════════════════════════════════════════ */}
      <style>{`
        @keyframes floaty {
          0%,100% { transform: translateY(0) }
          50% { transform: translateY(-18px) }
        }
        .hero-cta button:hover, .hero-cta a:hover { filter: brightness(1.05) }
        .hero-stats { display: flex }
        @media (max-width: 860px) {
          .journey-lead { order: -1 !important }
        }
        @media (max-width: 760px) {
          .listen-widget { display: none !important }
          .hero-stats { flex-wrap: wrap; gap: 18px 26px !important }
          .stat-div { display: none !important }
        }
        @media (max-width: 560px) {
          .hero-cta { flex-direction: column; align-items: stretch }
          .hero-cta button, .hero-cta a { width: 100%; justify-content: center }
          .hero-stats { display: grid !important; grid-template-columns: 1fr 1fr; gap: 22px 12px !important; justify-items: center }
          .stat-div { display: none !important }
        }
      `}</style>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────── */

function JourneyStep({ icon, num, title, desc }) {
  return (
    <div
      style={{ flex: 1, minWidth: 138, background: '#fff', borderRadius: 20, padding: '26px 16px', textAlign: 'center', boxShadow: '0 14px 36px rgba(36,12,82,.07)', border: '1px solid #eee6f7', alignSelf: 'center', transition: 'transform .35s cubic-bezier(.2,.7,.2,1)' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-8px)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = '' }}
    >
      <div style={{ width: 54, height: 54, margin: '0 auto', borderRadius: '50%', background: '#F1ECFb', display: 'grid', placeItems: 'center' }}>{icon}</div>
      <div style={{ marginTop: 14, fontFamily: 'Cairo', fontWeight: 800, color: '#1A0447', fontSize: 18 }}>{num}</div>
      <div dir="rtl" style={{ marginTop: 8, fontFamily: 'Cairo', fontWeight: 800, color: '#1A0447', fontSize: 18 }}>{title}</div>
      <div dir="rtl" style={{ marginTop: 8, color: '#6B7280', fontSize: 14, lineHeight: 1.7 }}>{desc}</div>
    </div>
  )
}

function WavyConnector({ color, flipEnd = false }) {
  return (
    <div style={{ alignSelf: 'center', flexShrink: 0, width: 34, height: 30 }}>
      <svg width="34" height="30" viewBox="0 0 34 30" fill="none">
        <path d="M2 22C10 22 9 8 17 8s7 14 15 14" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeDasharray="0.1 7" />
        <circle cx={flipEnd ? 2 : 32} cy="22" r="2.4" fill={color} />
      </svg>
    </div>
  )
}

function PriceCard({ name, sub, price, features, checkColor, btnStyle }) {
  return (
    <div
      style={{ background: '#fff', border: '1px solid #ece6f6', borderRadius: 20, padding: '30px 24px', boxShadow: '0 14px 36px rgba(36,12,82,.06)', textAlign: 'right', transition: 'transform .35s cubic-bezier(.2,.7,.2,1)' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-8px)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = '' }}
    >
      <div style={{ fontFamily: 'Cairo', fontWeight: 800, fontSize: 22, color: '#1A0447' }}>{name}</div>
      <div style={{ color: '#9aa0ab', fontSize: 14, marginTop: 4 }}>{sub}</div>
      <div style={{ marginTop: 18, display: 'flex', alignItems: 'baseline', gap: 6, justifyContent: 'flex-start', flexDirection: 'row-reverse' }}>
        <span style={{ fontFamily: 'Cairo', fontWeight: 800, fontSize: 36, color: '#1A0447' }}>{price}</span>
        <span style={{ color: '#9aa0ab', fontSize: 14 }}>/الشهر</span>
      </div>
      <div style={{ height: 1, background: '#eee6f6', margin: '20px 0' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 15, color: '#4b5563' }}>
        {features.map(f => (
          <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, flexDirection: 'row-reverse', justifyContent: 'flex-start' }}>
            <CheckIcon color={checkColor} /><span>{f}</span>
          </div>
        ))}
      </div>
      <Link to={ROUTES.REGISTER} style={{ display: 'block', width: '100%', marginTop: 24, fontFamily: 'Tajawal', fontWeight: 700, fontSize: 15, border: 'none', borderRadius: 11, padding: 13, textAlign: 'center', textDecoration: 'none', cursor: 'pointer', transition: 'transform .25s, box-shadow .25s', ...btnStyle }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = '' }}
      >ابدأ الآن</Link>
    </div>
  )
}