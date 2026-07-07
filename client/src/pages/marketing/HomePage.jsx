import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '../../config/constants.js'
import HeroSection from '../../components/home/HeroSection.jsx'
import TestimonialsSection from '../../components/home/TestimonialsSection.jsx'
import SuccessStoriesSection from '../../components/home/SuccessStoriesSection.jsx'
import TeachersSection from '../../components/home/TeachersSection.jsx'
import { usePackages } from '../../hooks/usePackages.js'
import { formatCurrency } from '../../utils/format.js'

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

/* ─────────────────────────────────────────────
   Duration helper — the Package schema stores a single price for a
   durationDays-long cycle, so we only ever derive a human-readable label
   from it (never invent a monthly/yearly split or a discount).
───────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────
   Journey — data-driven so the row can be recomposed into a vertical
   timeline at narrower widths (see .journey-steps media query) instead of
   forcing a horizontal-scroll carousel on tablet/mobile.
───────────────────────────────────────────── */
const JOURNEY_STEPS = [
  {
    num: '1', title: 'تقييم المستوى', desc: 'اختبار تحديد المستوى لتحديد نقاط القوة لديك بدقة',
    icon: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" strokeWidth="1.7" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" strokeWidth="1.7" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" strokeWidth="1.7" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" strokeWidth="1.7" />
      </>
    ),
  },
  {
    num: '2', title: 'خطة مخصصة', desc: 'خطة تعلم خاصة تناسب أهدافك ووقتك',
    icon: (
      <>
        <path d="M12 6c-1.6-1-3.6-1.5-6-1.5v13c2.4 0 4.4.5 6 1.5 1.6-1 3.6-1.5 6-1.5v-13c-2.4 0-4.4.5-6 1.5Z" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M12 6v13" strokeWidth="1.6" />
      </>
    ),
  },
  {
    num: '3', title: 'تعلم وتطوير', desc: 'تعلم مع معلمين متخصصين ومتابعة مستمرة', active: true,
    icon: (
      <>
        <circle cx="9" cy="8" r="3" strokeWidth="1.7" />
        <path d="M3.5 19a5.5 5.5 0 0 1 11 0" strokeWidth="1.7" strokeLinecap="round" />
        <circle cx="17" cy="9" r="2.3" strokeWidth="1.7" />
        <path d="M15.5 19a4 4 0 0 1 6-3.4" strokeWidth="1.7" strokeLinecap="round" />
      </>
    ),
  },
  {
    num: '4', title: 'ممارسة وتطبيق', desc: 'تطبيق ما تعلمته من خلال أنشطة تفاعلية',
    icon: <path d="M4 19h16M7 16l3-4 3 3 4-6" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />,
  },
  {
    num: '5', title: 'إتقان وتحقيق', desc: 'تقييم التقدم والاحتفال بالإنجاز بإتقان',
    icon: (
      <>
        <path d="M7 4h10v3a5 5 0 0 1-10 0V4Z" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M17 5h2.5a2.5 2.5 0 0 1-2.5 4M7 5H4.5A2.5 2.5 0 0 0 7 9M10 14h4M9 20h6M12 14v6" strokeWidth="1.6" strokeLinecap="round" />
      </>
    ),
  },
]

const PLATFORM_FEATURES = [
  'لوحة تحكم ذكية لمتابعتك خطوة بخطوة',
  'دورة الحفظ بسهولة مع أفضل المعلمين',
  'التقارير اليومية وتحليلات التطور الأسبوعية',
  'محتوى تفاعلي واختبارات ذكية',
]

const COMMUNITY_STATS = [
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
]

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
export default function HomePage() {
  const { packages, isLoading: pkgLoading, isError: pkgError, refetch: refetchPkgs } = usePackages({ activeOnly: true })

  return (
    <div style={{ background: '#0f0226', width: '100%', overflowX: 'hidden' }}>

      {/* ════════════════════════════════════════
          HERO
      ════════════════════════════════════════ */}
      <HeroSection />

      {/* ════════════════════════════════════════
          JOURNEY
      ════════════════════════════════════════ */}
      <section id="journey" className="journey-section">
        <div className="section-container journey-row">

          {/* Steps — horizontal row on wide screens, vertical timeline below 1200px */}
          <div className="journey-steps-wrap">
            <div className="journey-steps">
              {JOURNEY_STEPS.map((step, i) => (
                <Fragment key={step.num}>
                  {i > 0 && (
                    <JourneyConnector
                      color={i === 2 || i === 3 ? '#E8A23C' : '#b9a4ec'}
                      flipEnd={i === 3}
                    />
                  )}
                  <JourneyStepCard step={step} />
                </Fragment>
              ))}
            </div>
          </div>

          {/* Lead text */}
          <div className="journey-lead">
            <h2 className="section-heading section-heading--lg">
              <span className="text-gradient-purple">ابدأ رحلتك</span><br />
              <span className="heading-dark">مع القرآن</span>
            </h2>
            <p className="lead-copy journey-lead__copy">
              اختر المسار الذي يناسبك، وسنرشدك خطوة بخطوة حتى تحقق هدفك في تعلم كتاب الله
            </p>
            <Link to={ROUTES.PROGRAMS} className="btn-primary">
              اختر مسارك الآن
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          TEACHERS
      ════════════════════════════════════════ */}
      <TeachersSection />

      {/* ════════════════════════════════════════
          SUCCESS STORIES — نجوم المنصة
      ════════════════════════════════════════ */}
      <SuccessStoriesSection />

      {/* ════════════════════════════════════════
          PLATFORM
      ════════════════════════════════════════ */}
      <section id="platform" className="platform-section">
        <div className="section-container platform-row">

          {/* Lead text */}
          <div className="platform-lead">
            <h2 className="section-heading">
              <span className="text-gradient-purple">منصة ذكية</span><br />
              <span className="heading-dark">لتجربة تعلم متكاملة</span>
            </h2>
            <div className="platform-features">
              {PLATFORM_FEATURES.map((f) => (
                <div key={f} className="platform-feature">
                  <span className="platform-feature__icon">
                    <CheckIcon color="#1F9D57" />
                  </span>
                  <span className="platform-feature__text">{f}</span>
                </div>
              ))}
            </div>
            <Link to={ROUTES.PROGRAMS} className="btn-primary platform-cta">
              استكشف المنصة
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M11 6l-6 6 6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </Link>
          </div>

          {/* Dashboard image */}
          <div className="platform-image">
            <img src="/images/dashboard.png" alt="لوحة التحكم الذكية" />
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          TESTIMONIALS — real WhatsApp + audio proof
      ════════════════════════════════════════ */}
      <TestimonialsSection />

      {/* ════════════════════════════════════════
          COMMUNITY
      ════════════════════════════════════════ */}
      <section id="community" className="community-section">
        <div className="section-container community-row">

          {/* Stats column */}
          <div className="community-stats">
            {COMMUNITY_STATS.map((s) => (
              <div key={s.label} className="community-stat">
                <span className="community-stat__icon">{s.icon}</span>
                <div>
                  <div className="community-stat__value">{s.val}</div>
                  <div className="community-stat__label">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* World map */}
          <div className="community-map">
            <img src="/images/worldmap.png" alt="مجتمع عالمي" />
          </div>

          {/* Lead text */}
          <div className="community-lead">
            <h2 className="section-heading">
              <span className="text-gradient-purple">مجتمع عالمي</span><br />
              <span className="heading-dark">يجمع القرآن</span>
            </h2>
            <p className="lead-copy community-lead__copy">
              طلاب من أكثر من 100 دولة يتعلمون ويتواصلون في بيئة آمنة ومحفزة
            </p>
            <Link to={ROUTES.REGISTER} className="btn-primary community-cta">
              انضم إلى مجتمعنا
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          PRICING — real, admin-managed packages (single source of truth)
      ════════════════════════════════════════ */}
      <section id="pricing" className="pricing-section">
        <div className="section-container pricing-row">

          {/* Pricing cards */}
          <div className="pricing-cards">
            {pkgLoading ? (
              <div className="pricing-skeleton-grid">
                {[0, 1, 2].map(i => (
                  <div key={i} className="animate-pulse pricing-skeleton-card" />
                ))}
              </div>
            ) : pkgError ? (
              <div className="pricing-empty-state">
                <p>تعذّر تحميل الباقات حالياً</p>
                <button onClick={() => refetchPkgs()} className="btn-gold-pill">
                  إعادة المحاولة
                </button>
              </div>
            ) : packages.length === 0 ? (
              <div className="pricing-empty-state">
                <p>لا توجد باقات متاحة حالياً</p>
              </div>
            ) : (
              <div className="pricing-grid">
                {packages.slice(0, 4).map((pkg) => (
                  <PriceCard
                    key={pkg._id}
                    name={pkg.nameAr}
                    sub={pkg.descriptionAr}
                    price={formatCurrency(pkg.price, pkg.currency)}
                    caption={`${pkg.sessionsPerMonth} حصة شهرياً${pkg.durationDays ? ` · لمدة ${humanizeDuration(pkg.durationDays)}` : ''}`}
                    features={pkg.featuresAr || []}
                    popular={pkg.isPopular}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Lead text */}
          <div className="pricing-lead">
            <h2 className="section-heading">
              <span className="text-gradient-purple">اختر الخطة</span><br />
              <span className="heading-dark">المناسبة لك</span>
            </h2>
            <p className="lead-copy pricing-lead__copy">
              خطط مرنة تناسب جميع احتياجاتك وأهدافك في تعلم القرآن
            </p>
            <Link to={ROUTES.PRICING} className="btn-ghost-purple">
              عرض كل الباقات
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          CONTACT / CTA
      ════════════════════════════════════════ */}
      <section id="contact" className="contact-section">
        <div className="contact-overlay" />
        <div className="section-container contact-content">
          <div className="contact-text">
            <h2 className="contact-heading">
              <span className="contact-heading__gold">ابدأ رحلتك</span>
              {' '}مع كتاب الله
            </h2>
            <div className="contact-subheading">اليوم هو أفضل يوم لتبدأ!</div>
            <p className="contact-copy">
              انضم إلى آلاف الطلاب وابدأ رحلتك التعليمية في ترتيلة أونلاين
            </p>
            <div className="contact-cta">
              <Link to={ROUTES.CONTACT} className="contact-btn contact-btn--ghost">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.4A8 8 0 1 1 21 12Z" stroke="#fff" strokeWidth="1.7" strokeLinejoin="round" /></svg>
                تواصل معنا
              </Link>
              <Link to={ROUTES.REGISTER} className="contact-btn contact-btn--gold">
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
          RESPONSIVE STYLES
      ════════════════════════════════════════ */}
      <style>{`
        /* ── Shared building blocks (reused across Journey/Platform/Community/Pricing) ── */
        .section-container { max-width: 1340px; margin: 0 auto; }
        .section-heading { font-weight: 800; font-size: clamp(32px, 3.6vw, 50px); line-height: 1.25; font-family: Cairo, sans-serif; }
        .section-heading--lg { font-size: clamp(34px, 4vw, 52px); line-height: 1.2; }
        .text-gradient-purple { background: linear-gradient(120deg,#7C3AED,#9b5cf0); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .heading-dark { color: #1A0447; }
        .lead-copy { margin-top: 18px; color: #6B7280; font-size: 16.5px; line-height: 1.9; }

        .btn-primary {
          cursor: pointer; display: inline-flex; align-items: center; gap: 12px;
          font-family: Tajawal, sans-serif; font-weight: 700; font-size: 17px; color: #fff;
          background: linear-gradient(135deg,#6D34D6,#4B1Fb0); border: none; border-radius: 14px;
          padding: 16px 30px; box-shadow: 0 16px 34px rgba(75,31,176,.32); text-decoration: none;
          transition: transform .25s, box-shadow .25s; min-height: 44px;
        }
        .btn-primary:focus-visible { outline: 2px solid #E8C76A; outline-offset: 3px; }
        .btn-ghost-purple {
          cursor: pointer; margin-top: 26px; display: inline-block; font-family: Tajawal, sans-serif;
          font-weight: 700; font-size: 15px; color: #6D34D6; background: #efeaf8; border: none;
          border-radius: 30px; padding: 12px 26px; text-decoration: none; transition: transform .25s;
        }
        .btn-ghost-purple:focus-visible { outline: 2px solid #6D34D6; outline-offset: 3px; }
        .btn-gold-pill {
          cursor: pointer; font-family: Tajawal, sans-serif; font-weight: 700; font-size: 14px; color: #fff;
          background: linear-gradient(135deg,#6D34D6,#4B1Fb0); border: none; border-radius: 30px; padding: 10px 24px;
        }

        /* Hover-only lift effects — gated so touch devices never get a stuck hover state */
        @media (hover: hover) and (pointer: fine) {
          .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 16px 34px rgba(75,31,176,.52); }
          .btn-ghost-purple:hover { transform: translateY(-2px); }
          .journey-step:hover, .journey-step--active:hover { transform: translateY(-8px); }
          .price-card:hover { transform: translateY(-8px); }
          .contact-btn--ghost:hover { transform: translateY(-2px); border-color: #E8C76A; background: rgba(232,199,106,.08); }
          .contact-btn--gold:hover { transform: translateY(-2px); box-shadow: 0 14px 32px rgba(212,175,55,.65); }
        }

        /* ── Journey ── */
        .journey-section { background: #F6F4FB; padding: clamp(64px,8vw,110px) clamp(20px,5vw,68px); }
        .journey-row { display: flex; align-items: center; gap: clamp(32px,5vw,72px); flex-wrap: wrap; }
        .journey-steps-wrap { flex: 1 1 600px; min-width: 0; }
        .journey-steps { display: flex; align-items: flex-end; gap: 0; }
        .journey-step {
          flex: 1; min-width: 122px; background: #fff; border-radius: 20px; padding: 22px 14px;
          text-align: center; box-shadow: 0 14px 36px rgba(36,12,82,.07); border: 1px solid #eee6f7;
          align-self: center; transition: transform .35s cubic-bezier(.2,.7,.2,1);
        }
        .journey-step--active {
          flex: 1.05; min-width: 130px; border-radius: 22px; padding: 28px 14px;
          box-shadow: 0 22px 50px rgba(212,150,40,.22); border: 2px solid #E8B24A;
          align-self: stretch; display: flex; flex-direction: column; justify-content: center;
        }
        .journey-step__icon { width: 54px; height: 54px; margin: 0 auto; border-radius: 50%; background: #F1ECFB; display: grid; place-items: center; color: #6D34D6; }
        .journey-step--active .journey-step__icon { width: 56px; height: 56px; background: #fff; border: 2px solid #E8B24A; color: #E29A2E; }
        .journey-step__num { margin-top: 14px; font-family: Cairo, sans-serif; font-weight: 800; color: #1A0447; font-size: 18px; }
        .journey-step--active .journey-step__num { color: #E29A2E; }
        .journey-step__title { margin-top: 8px; font-family: Cairo, sans-serif; font-weight: 800; color: #1A0447; font-size: 18px; }
        .journey-step__desc { margin-top: 8px; color: #6B7280; font-size: 14px; line-height: 1.7; }
        .journey-connector { align-self: center; flex-shrink: 0; width: 28px; height: 30px; display: grid; place-items: center; }
        .journey-connector__v { display: none; }
        .journey-lead { flex: 0 1 360px; min-width: 280px; text-align: right; }
        .journey-lead__copy { max-width: 380px; margin-inline-start: auto; margin-inline-end: 0; font-size: 17px; }

        /* Below 1440px a horizontal 5-card row squeezed next to a 360px text
           column doesn't leave enough room for the icon + two-line Arabic
           title to read comfortably, so the steps become a vertical timeline
           instead of forcing a horizontal scroll or overlapping content. */
        @media (max-width: 1439px) {
          .journey-lead { order: -1; flex-basis: 100%; }
          .journey-steps-wrap { flex-basis: 100%; }
          .journey-steps { flex-direction: column; align-items: stretch; }
          .journey-step, .journey-step--active { flex: none; min-width: 0; width: 100%; max-width: 560px; margin: 0 auto; }
          .journey-connector { width: auto; height: auto; padding: 2px 0; }
          .journey-connector__h { display: none; }
          .journey-connector__v { display: block; margin: 0 auto; }
        }
        @media (max-width: 479px) {
          .journey-step, .journey-step--active { padding: 22px 16px; }
        }

        /* ── Platform ── */
        .platform-section { background: #F8F7FC; padding: clamp(64px,8vw,108px) clamp(20px,5vw,68px); }
        .platform-row { display: flex; align-items: center; gap: clamp(34px,5vw,70px); flex-wrap: wrap; }
        .platform-lead { flex: 0 1 360px; min-width: 260px; text-align: right; order: 2; }
        .platform-features { margin-top: 28px; display: flex; flex-direction: column; gap: 18px; }
        .platform-feature { display: flex; align-items: center; gap: 12px; justify-content: flex-start; flex-direction: row-reverse; }
        .platform-feature__icon { flex-shrink: 0; width: 26px; height: 26px; border-radius: 50%; background: #E6F4EC; display: grid; place-items: center; }
        .platform-feature__text { color: #374151; font-size: 16.5px; }
        .platform-cta { margin-top: 30px; }
        .platform-image { flex: 1 1 600px; min-width: 0; order: 1; }
        .platform-image img { width: 100%; height: auto; display: block; border-radius: 18px; filter: drop-shadow(0 30px 60px rgba(36,12,82,.16)); }

        @media (max-width: 900px) {
          .platform-lead, .platform-image { flex-basis: 100%; }
        }

        /* ── Community ── */
        .community-section { background: #F8F7FC; padding: clamp(60px,7vw,100px) clamp(20px,5vw,68px); }
        .community-row { display: flex; align-items: center; gap: clamp(24px,3vw,48px); flex-wrap: wrap; justify-content: center; }
        .community-stats { order: 1; flex-shrink: 0; display: flex; flex-direction: column; gap: 26px; }
        .community-stat { display: flex; align-items: center; gap: 14px; }
        .community-stat__icon { flex-shrink: 0; width: 50px; height: 50px; border-radius: 14px; background: #FBF3DF; display: grid; place-items: center; }
        .community-stat__value { font-family: Cairo, sans-serif; font-weight: 800; font-size: 24px; color: #1A0447; }
        .community-stat__label { color: #6B7280; font-size: 14px; }
        .community-map { order: 2; flex: 1 1 460px; min-width: 0; text-align: center; }
        .community-map img { width: 100%; max-width: 640px; height: auto; display: block; margin: 0 auto; }
        .community-lead { order: 3; flex: 0 1 300px; min-width: 240px; text-align: right; }
        .community-lead__copy { max-width: 320px; margin-inline-start: auto; margin-inline-end: 0; }
        .community-cta { margin-top: 26px; padding: 14px 30px; border-radius: 12px; font-size: 16px; box-shadow: 0 14px 30px rgba(75,31,176,.26); }

        @media (max-width: 900px) {
          .community-lead { order: 1; flex-basis: 100%; }
          .community-map { order: 2; flex-basis: 100%; }
          .community-stats { order: 3; flex-basis: 100%; flex-direction: row; flex-wrap: wrap; justify-content: center; gap: 20px 30px; }
        }

        /* ── Pricing ── */
        .pricing-section { background: #FBFAFE; padding: clamp(60px,7vw,100px) clamp(20px,5vw,68px); }
        .pricing-row { display: flex; align-items: stretch; gap: clamp(28px,4vw,56px); flex-wrap: wrap; }
        .pricing-cards { flex: 1 1 700px; min-width: 0; order: 1; }
        .pricing-lead { flex: 0 1 300px; min-width: 240px; order: 2; text-align: right; align-self: center; }
        .pricing-lead__copy { max-width: 300px; margin-inline-start: auto; margin-inline-end: 0; }
        .pricing-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(200px,1fr)); gap: 18px; align-items: start; }
        .pricing-skeleton-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(200px,1fr)); gap: 18px; }
        .pricing-skeleton-card { height: 280px; border-radius: 20px; background: #efeaf8; }
        .pricing-empty-state { background: #fff; border: 1px solid #ece6f6; border-radius: 20px; padding: 40px; text-align: center; }
        .pricing-empty-state p { color: #6B7280; margin-bottom: 16px; }

        @media (max-width: 900px) {
          .pricing-cards, .pricing-lead { flex-basis: 100%; }
          .pricing-lead { align-self: auto; }
        }

        /* ── Price card ── */
        .price-card {
          background: #fff; border: 1px solid #ece6f6; border-radius: 20px; padding: 30px 24px;
          box-shadow: 0 14px 36px rgba(36,12,82,.06); text-align: right;
          transition: transform .35s cubic-bezier(.2,.7,.2,1);
        }
        .price-card--popular { position: relative; border: 2px solid #E8B24A; box-shadow: 0 24px 50px rgba(212,160,50,.2); }
        .price-card__badge {
          position: absolute; top: -15px; inset-inline-start: 50%; transform: translateX(-50%);
          background: linear-gradient(135deg,#E8C76A,#D4AF37); color: #3a2200; font-family: Cairo, sans-serif;
          font-weight: 800; font-size: 13px; padding: 6px 18px; border-radius: 30px; white-space: nowrap;
          box-shadow: 0 8px 18px rgba(212,175,55,.4);
        }
        .price-card__name { font-family: Cairo, sans-serif; font-weight: 800; font-size: 22px; color: #1A0447; }
        .price-card__sub { color: #9aa0ab; font-size: 14px; margin-top: 4px; }
        .price-card__price-row { margin-top: 18px; display: flex; align-items: baseline; gap: 6px; justify-content: flex-start; flex-direction: row-reverse; }
        .price-card__price { font-family: Cairo, sans-serif; font-weight: 800; font-size: 36px; color: #1A0447; }
        .price-card__caption { color: #9aa0ab; font-size: 13px; margin-top: 4px; }
        .price-card__divider { height: 1px; background: #eee6f6; margin: 20px 0; }
        .price-card--popular .price-card__divider { background: #f1e6cf; }
        .price-card__features { display: flex; flex-direction: column; gap: 14px; font-size: 15px; color: #4b5563; }
        .price-card__feature { display: flex; align-items: center; gap: 10px; flex-direction: row-reverse; justify-content: flex-start; }
        .price-card__btn {
          display: block; width: 100%; margin-top: 24px; font-family: Tajawal, sans-serif; font-weight: 700;
          font-size: 15px; border: none; border-radius: 11px; padding: 13px; text-align: center;
          text-decoration: none; cursor: pointer; transition: transform .25s, box-shadow .25s;
          background: linear-gradient(135deg,#5b2bc4,#3d1894); color: #fff; min-height: 44px;
        }
        .price-card--popular .price-card__btn {
          background: linear-gradient(135deg,#E8C76A,#D4AF37); color: #3a2200; font-weight: 800;
          box-shadow: 0 12px 26px rgba(212,175,55,.36);
        }
        .price-card__btn:focus-visible { outline: 2px solid #6D34D6; outline-offset: 3px; }

        /* ── Contact / CTA ── */
        .contact-section {
          position: relative; background: #160734 url('/images/footer_bg.png') center/cover no-repeat;
          min-height: clamp(380px,42vw,520px); display: flex; align-items: center;
          padding: clamp(40px,6vw,72px) clamp(20px,5vw,68px); overflow: hidden;
        }
        .contact-overlay { position: absolute; inset: 0; background: linear-gradient(270deg,rgba(22,7,52,.78) 0%,rgba(22,7,52,.4) 42%,rgba(22,7,52,0) 64%); }
        .contact-content { position: relative; z-index: 2; width: 100%; display: flex; justify-content: flex-start; }
        .contact-text { width: min(560px,100%); text-align: right; }
        .contact-heading { font-weight: 800; font-size: clamp(32px,4.4vw,56px); line-height: 1.2; color: #fff; font-family: Cairo, sans-serif; }
        .contact-heading__gold { background: linear-gradient(120deg,#E8C76A,#D4AF37); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .contact-subheading { margin-top: 14px; font-family: Cairo, sans-serif; font-weight: 700; font-size: clamp(18px,2vw,24px); color: #E8C76A; }
        .contact-copy { margin-top: 14px; color: #cabfe4; font-size: clamp(15px,1.4vw,18px); line-height: 1.85; max-width: 430px; margin-inline-start: auto; margin-inline-end: 0; }
        .contact-cta { margin-top: 28px; display: flex; gap: 14px; justify-content: flex-end; flex-wrap: wrap; }
        .contact-btn {
          cursor: pointer; display: flex; align-items: center; gap: 10px; font-family: Tajawal, sans-serif;
          font-weight: 700; font-size: 16px; border-radius: 36px; padding: 15px 30px; text-decoration: none;
          min-height: 44px; transition: transform .25s, box-shadow .25s, border-color .25s, background .25s;
        }
        .contact-btn--ghost { color: #fff; background: rgba(255,255,255,.05); border: 1.5px solid rgba(255,255,255,.28); }
        .contact-btn--gold { font-weight: 800; color: #2a1500; background: linear-gradient(135deg,#E8C76A,#D4AF37); border: none; box-shadow: 0 14px 32px rgba(212,175,55,.4); }
        .contact-btn:focus-visible { outline: 2px solid #E8C76A; outline-offset: 3px; }

        @media (max-width: 479px) {
          .contact-cta { flex-direction: column; align-items: stretch; }
          .contact-btn { width: 100%; justify-content: center; }
        }

        @media (prefers-reduced-motion: reduce) {
          .journey-step, .journey-step--active, .price-card, .btn-primary, .btn-ghost-purple, .contact-btn { transition: none !important; }
        }
      `}</style>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────── */

function JourneyStepCard({ step }) {
  return (
    <div className={`journey-step${step.active ? ' journey-step--active' : ''}`}>
      <div className="journey-step__icon">
        <svg width={step.active ? 24 : 22} height={step.active ? 24 : 22} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          {step.icon}
        </svg>
      </div>
      <div className="journey-step__num">{step.num}</div>
      <div className="journey-step__title">{step.title}</div>
      <div className="journey-step__desc">{step.desc}</div>
    </div>
  )
}

function JourneyConnector({ color, flipEnd = false }) {
  return (
    <span className="journey-connector" aria-hidden="true">
      <svg className="journey-connector__h" width="34" height="30" viewBox="0 0 34 30" fill="none">
        <path d="M2 22C10 22 9 8 17 8s7 14 15 14" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeDasharray="0.1 7" />
        <circle cx={flipEnd ? 2 : 32} cy="22" r="2.4" fill={color} />
      </svg>
      <svg className="journey-connector__v" width="24" height="28" viewBox="0 0 24 28" fill="none">
        <path d="M12 2v24" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeDasharray="0.1 6" />
      </svg>
    </span>
  )
}

function PriceCard({ name, sub, price, caption, features, popular }) {
  return (
    <div className={`price-card${popular ? ' price-card--popular' : ''}`}>
      {popular && <div className="price-card__badge">الأكثر طلباً</div>}
      <div className="price-card__name">{name}</div>
      {sub && <div className="price-card__sub">{sub}</div>}
      <div className="price-card__price-row">
        <span className="price-card__price">{price}</span>
      </div>
      {caption && <div className="price-card__caption">{caption}</div>}
      <div className="price-card__divider" />
      <div className="price-card__features">
        {features.map(f => (
          <div key={f} className="price-card__feature">
            <CheckIcon color={popular ? '#D4AF37' : '#6D34D6'} /><span>{f}</span>
          </div>
        ))}
      </div>
      <Link to={ROUTES.REGISTER} className="price-card__btn">ابدأ الآن</Link>
    </div>
  )
}
