import { Fragment, useEffect, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronRight, ChevronLeft, LayoutGrid, SlidersHorizontal, ShieldCheck, Award, Clock, ArrowLeft } from 'lucide-react'
import { ROUTES } from '../../config/constants.js'
import HeroSection from '../../components/home/HeroSection.jsx'
import TestimonialsSection from '../../components/home/TestimonialsSection.jsx'
import SuccessStoriesSection from '../../components/home/SuccessStoriesSection.jsx'
import TeachersSection from '../../components/home/TeachersSection.jsx'
import { usePackages } from '../../hooks/usePackages.js'
import { formatCurrency } from '../../utils/format.js'
import useHomepageInteractionAudio from '../../hooks/useHomepageInteractionAudio.js'
import useMotionCapabilities from '../../hooks/useMotionCapabilities.js'
import RevealSection from '../../components/motion/RevealSection.jsx'
import MaskReveal from '../../components/motion/MaskReveal.jsx'
import RadialReveal from '../../components/motion/RadialReveal.jsx'
import StaggerGroup from '../../components/motion/StaggerGroup.jsx'
import { EASE_CINEMATIC, itemVariant } from '../../components/motion/motion.constants.js'

const HERO_AUDIO_SRC = encodeURI('/audio/hero section.mp3')

// Per-section choreography map — deliberately different `from` directions so
// no two sections read the same way (see JOURNEY_DIRECTIONS, PRICING
// DIRECTIONS below for the same idea applied to card grids).
const JOURNEY_DIRECTIONS = ['right', 'left', 'center', 'lower-left', 'lower-right']
const PRICING_DIRECTIONS = ['lower-right', 'center', 'lower-left', 'lower-right']

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
  const { packages, isLoading: pkgLoading, isError: pkgError, refetch: refetchPkgs } = usePackages({ activeOnly: true, landingOnly: true })
  const { reducedMotion, finePointer, narrow } = useMotionCapabilities()
  const contactRef = useRef(null)
  const carouselRef = useRef(null)

  // View mode for multiple packages: 'carousel' (smooth slider) or 'grid' (all visible)
  const [viewMode, setViewMode] = useState('carousel')
  const [canScrollPrev, setCanScrollPrev] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(true)

  const updateScrollState = useCallback(() => {
    const el = carouselRef.current
    if (!el) return
    const current = Math.abs(el.scrollLeft)
    const maxScroll = el.scrollWidth - el.clientWidth
    setCanScrollPrev(current > 15)
    setCanScrollNext(current < maxScroll - 15)
  }, [])

  useEffect(() => {
    const el = carouselRef.current
    if (!el) return
    updateScrollState()
    el.addEventListener('scroll', updateScrollState, { passive: true })
    window.addEventListener('resize', updateScrollState, { passive: true })
    return () => {
      el.removeEventListener('scroll', updateScrollState)
      window.removeEventListener('resize', updateScrollState)
    }
  }, [packages, updateScrollState])

  const scrollCarousel = (direction) => {
    const el = carouselRef.current
    if (!el) return
    const step = (el.clientWidth > 768 ? 334 : 290) * (direction === 'next' ? -1 : 1)
    el.scrollBy({ left: step, behavior: 'smooth' })
  }

  // Starts on the first user interaction anywhere on the homepage (click,
  // scroll, touch, key, wheel) and stops the moment this page unmounts —
  // i.e. as soon as the user navigates to any other route.
  useHomepageInteractionAudio(HERO_AUDIO_SRC, { volume: 0.7, loop: false })

  // Pointer-spotlight for the closing CTA — mutates CSS vars directly on the
  // DOM node (no setState) so the mousemove rate never drives React renders.
  useEffect(() => {
    if (!finePointer || reducedMotion) return
    const el = contactRef.current
    if (!el) return
    function onMove(e) {
      const rect = el.getBoundingClientRect()
      el.style.setProperty('--spot-x', `${((e.clientX - rect.left) / rect.width) * 100}%`)
      el.style.setProperty('--spot-y', `${((e.clientY - rect.top) / rect.height) * 100}%`)
    }
    el.addEventListener('pointermove', onMove, { passive: true })
    return () => el.removeEventListener('pointermove', onMove)
  }, [finePointer, reducedMotion])

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
        <div className="section-bridge section-bridge--from-dark" aria-hidden="true" />
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
                      delay={i * 0.12}
                      reducedMotion={reducedMotion}
                    />
                  )}
                  <RevealSection
                    from={JOURNEY_DIRECTIONS[i % JOURNEY_DIRECTIONS.length]}
                    distance={narrow ? 20 : 56}
                    delay={i * 0.1}
                    duration={0.7}
                    reducedMotion={reducedMotion}
                    className={`journey-step-slot${step.active ? ' journey-step-slot--active' : ''}`}
                  >
                    <JourneyStepCard step={step} />
                  </RevealSection>
                </Fragment>
              ))}
            </div>
          </div>

          {/* Lead text */}
          <div className="journey-lead">
            <h2 className="section-heading section-heading--lg">
              <MaskReveal as="span" viewport reducedMotion={reducedMotion} delay={0}>
                <span className="text-gradient-purple">ابدأ رحلتك</span>
              </MaskReveal>
              <MaskReveal as="span" viewport reducedMotion={reducedMotion} delay={0.1}>
                <span className="heading-dark">مع القرآن</span>
              </MaskReveal>
            </h2>
            <RevealSection as={motion.p} from="right" delay={0.22} reducedMotion={reducedMotion} className="lead-copy journey-lead__copy">
              اختر المسار الذي يناسبك، وسنرشدك خطوة بخطوة حتى تحقق هدفك في تعلم كتاب الله
            </RevealSection>
            <RevealSection from="right" delay={0.34} reducedMotion={reducedMotion}>
              <Link to={ROUTES.PROGRAMS} className="btn-primary">
                اختر مسارك الآن
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg>
              </Link>
            </RevealSection>
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
        <div className="section-bridge section-bridge--from-dark" aria-hidden="true" />
        <div className="section-container platform-row">

          {/* Lead text */}
          <RevealSection as={motion.div} from="right" reducedMotion={reducedMotion} className="platform-lead">
            <h2 className="section-heading">
              <span className="text-gradient-purple">منصة ذكية</span><br />
              <span className="heading-dark">لتجربة تعلم متكاملة</span>
            </h2>
            <StaggerGroup staggerChildren={0.1} delayChildren={0.15} className="platform-features">
              {PLATFORM_FEATURES.map((f) => (
                <motion.div
                  key={f}
                  className="platform-feature"
                  variants={itemVariant({ x: reducedMotion ? 0 : 24, duration: 0.55, ease: EASE_CINEMATIC })}
                >
                  <span className="platform-feature__icon">
                    <CheckIcon color="#1F9D57" />
                  </span>
                  <span className="platform-feature__text">{f}</span>
                </motion.div>
              ))}
            </StaggerGroup>
            <RevealSection from="right" delay={0.45} reducedMotion={reducedMotion}>
              <Link to={ROUTES.PROGRAMS} className="btn-primary platform-cta">
                استكشف المنصة
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M11 6l-6 6 6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </Link>
            </RevealSection>
          </RevealSection>

          {/* Dashboard image — product-reveal: starts tilted in 3D, resolves flat */}
          <motion.div
            className="platform-image"
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, rotateY: 22, scale: 0.94 }}
            whileInView={{ opacity: 1, rotateY: 0, scale: 1 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: reducedMotion ? 0.4 : 0.95, ease: EASE_CINEMATIC }}
            style={{ perspective: 1200 }}
          >
            <div className={reducedMotion ? undefined : 'platform-image__float'}>
              <img src="/images/dashboard.png" alt="لوحة التحكم الذكية" />
            </div>
          </motion.div>
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
        <div className="section-bridge section-bridge--from-dark" aria-hidden="true" />
        <div className="section-container community-row">

          {/* Stats column */}
          <StaggerGroup staggerChildren={0.1} className="community-stats">
            {COMMUNITY_STATS.map((s) => (
              <motion.div
                key={s.label}
                className="community-stat"
                variants={itemVariant({ y: reducedMotion ? 0 : 22, duration: 0.55, ease: EASE_CINEMATIC })}
              >
                <span className="community-stat__icon">{s.icon}</span>
                <div>
                  <div className="community-stat__value">{s.val}</div>
                  <div className="community-stat__label">{s.label}</div>
                </div>
              </motion.div>
            ))}
          </StaggerGroup>

          {/* World map — emerges from a circular portal, distinct from every other section's entrance */}
          <RadialReveal className="community-map" reducedMotion={reducedMotion}>
            <img src="/images/worldmap.png" alt="مجتمع عالمي" />
          </RadialReveal>

          {/* Lead text */}
          <div className="community-lead">
            <h2 className="section-heading">
              <MaskReveal as="span" viewport reducedMotion={reducedMotion} delay={0}>
                <span className="text-gradient-purple">مجتمع عالمي</span>
              </MaskReveal>
              <MaskReveal as="span" viewport reducedMotion={reducedMotion} delay={0.1}>
                <span className="heading-dark">يجمع القرآن</span>
              </MaskReveal>
            </h2>
            <RevealSection as={motion.p} from="right" delay={0.2} reducedMotion={reducedMotion} className="lead-copy community-lead__copy">
              طلاب من أكثر من 100 دولة يتعلمون ويتواصلون في بيئة آمنة ومحفزة
            </RevealSection>
            <RevealSection from="right" delay={0.32} reducedMotion={reducedMotion}>
              <Link to={ROUTES.REGISTER} className="btn-primary community-cta">
                انضم إلى مجتمعنا
              </Link>
            </RevealSection>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          PRICING — real, admin-managed packages (single source of truth)
      ════════════════════════════════════════ */}
      <section id="pricing" className="pricing-section">
        <div className="pricing-ambient-glow" aria-hidden="true" />

        <div className="section-container">
          {/* Top-Centered Header */}
          <div className="pricing-header">
            <RevealSection from="center" delay={0.05} reducedMotion={reducedMotion}>
              <div className="pricing-header__badge">
                <span className="pricing-header__badge-dot" />
                <span>باقات وخطط الاشتراك</span>
              </div>
            </RevealSection>

            <h2 className="pricing-header__title">
              <MaskReveal as="span" viewport reducedMotion={reducedMotion} delay={0.1}>
                <span className="text-gradient-purple">اختر الخطة</span>
              </MaskReveal>
              {' '}
              <MaskReveal as="span" viewport reducedMotion={reducedMotion} delay={0.18}>
                <span className="heading-dark">المناسبة لك</span>
              </MaskReveal>
            </h2>

            <RevealSection as={motion.p} from="up" delay={0.25} reducedMotion={reducedMotion} className="pricing-header__subtitle">
              خطط تعليمية مرنة وتفاعلية تناسب جميع المستويات والأعمار في حفظ وتلاوة القرآن الكريم مع نخبة من المعلمين المعتمدين
            </RevealSection>
          </div>

          {/* Pricing Controls (When > 4 packages) */}
          {!pkgLoading && !pkgError && packages.length > 4 && (
            <div className="pricing-controls">
              <div className="pricing-controls__info">
                <span className="pricing-controls__count-pill">{packages.length} باقات متاحة</span>
                <span className="hidden sm:inline">تصفح الخطط واختر ما يناسب جدولك وأهدافك</span>
              </div>

              <div className="pricing-controls__actions">
                {/* View Switcher: Carousel vs Grid */}
                <div className="pricing-view-toggle">
                  <button
                    type="button"
                    onClick={() => setViewMode('carousel')}
                    className={`pricing-view-toggle__btn ${viewMode === 'carousel' ? 'pricing-view-toggle__btn--active' : ''}`}
                    title="عرض شريط متحرك"
                  >
                    <SlidersHorizontal size={15} />
                    <span>متحرك</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`pricing-view-toggle__btn ${viewMode === 'grid' ? 'pricing-view-toggle__btn--active' : ''}`}
                    title="عرض شبكي كامل"
                  >
                    <LayoutGrid size={15} />
                    <span>شبكة</span>
                  </button>
                </div>

                {/* Navigation Arrows (Only active in carousel mode) */}
                {viewMode === 'carousel' && (
                  <div className="flex items-center gap-1.5" dir="ltr">
                    <button
                      type="button"
                      onClick={() => scrollCarousel('next')}
                      disabled={!canScrollNext}
                      className="pricing-nav-btn"
                      aria-label="الباقات التالية"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollCarousel('prev')}
                      disabled={!canScrollPrev}
                      className="pricing-nav-btn"
                      aria-label="الباقات السابقة"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pricing Cards Body */}
          {pkgLoading ? (
            <div className="pricing-skeleton-grid">
              {[0, 1, 2, 3].map(i => (
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
          ) : packages.length > 4 && viewMode === 'carousel' ? (
            /* Carousel track for multiple packages (> 4) */
            <div className="pricing-carousel-container">
              <div ref={carouselRef} className="pricing-carousel-track">
                {packages.map((pkg, i) => (
                  <div key={pkg._id} className="pricing-carousel-item">
                    <RevealSection
                      from={PRICING_DIRECTIONS[i % PRICING_DIRECTIONS.length]}
                      distance={narrow ? 20 : 40}
                      delay={i * 0.08}
                      reducedMotion={reducedMotion}
                    >
                      <PriceCard
                        id={pkg._id}
                        name={pkg.nameAr}
                        sub={pkg.descriptionAr}
                        price={formatCurrency(pkg.price, pkg.currency)}
                        caption={`${pkg.sessionsPerMonth} حصة شهرياً${pkg.durationDays ? ` · لمدة ${humanizeDuration(pkg.durationDays)}` : ''}`}
                        features={pkg.featuresAr || []}
                        popular={pkg.isPopular}
                        reducedMotion={reducedMotion}
                      />
                    </RevealSection>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Balanced responsive grid for <= 4 packages (or grid view) */
            <div className={`pricing-grid-adaptive pricing-grid-adaptive--${packages.length <= 4 ? packages.length : 'many'}`}>
              {packages.map((pkg, i) => (
                <RevealSection
                  key={pkg._id}
                  from={PRICING_DIRECTIONS[i % PRICING_DIRECTIONS.length]}
                  distance={narrow ? 20 : 40}
                  delay={i * 0.08}
                  reducedMotion={reducedMotion}
                >
                  <PriceCard
                    id={pkg._id}
                    name={pkg.nameAr}
                    sub={pkg.descriptionAr}
                    price={formatCurrency(pkg.price, pkg.currency)}
                    caption={`${pkg.sessionsPerMonth} حصة شهرياً${pkg.durationDays ? ` · لمدة ${humanizeDuration(pkg.durationDays)}` : ''}`}
                    features={pkg.featuresAr || []}
                    popular={pkg.isPopular}
                    reducedMotion={reducedMotion}
                  />
                </RevealSection>
              ))}
            </div>
          )}

          {/* Bottom Bar: Trust Indicators & View All Link */}
          <div className="pricing-bottom-bar">
            <div className="pricing-trust-badges">
              <div className="pricing-trust-badge">
                <ShieldCheck size={18} />
                <span>ضمان استرداد كامل خلال 7 أيام</span>
              </div>
              <div className="pricing-trust-badge">
                <Award size={18} />
                <span>معلمون ومعلمات معتمدون بإجازات مسندة</span>
              </div>
              <div className="pricing-trust-badge">
                <Clock size={18} />
                <span>مرونة تامة في تحديد وتعديل المواعيد</span>
              </div>
            </div>

            <Link to={ROUTES.PRICING} className="pricing-view-all-link">
              <span>عرض كل الباقات والمقارنة بالتفصيل</span>
              <ArrowLeft size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          CONTACT / CTA
      ════════════════════════════════════════ */}
      <section id="contact" ref={contactRef} className="contact-section">
        <div className="section-bridge section-bridge--from-light" aria-hidden="true" />
        <div className="contact-overlay" />
        {finePointer && !reducedMotion && <div className="contact-spotlight" aria-hidden="true" />}
        <div className="section-container contact-content">
          <RevealSection from="center" duration={0.9} reducedMotion={reducedMotion} className="contact-text">
            <h2 className="contact-heading">
              <span className="contact-heading__gold">ابدأ رحلتك</span>
              {' '}مع كتاب الله
            </h2>
            <div className="contact-subheading">اليوم هو أفضل يوم لتبدأ!</div>
            <p className="contact-copy">
              انضم إلى آلاف الطلاب وابدأ رحلتك التعليمية في ترتيلة أونلاين
            </p>
            <RevealSection from="up" delay={0.2} reducedMotion={reducedMotion} className="contact-cta">
              <Link to={ROUTES.CONTACT} className="contact-btn contact-btn--ghost">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.4A8 8 0 1 1 21 12Z" stroke="#fff" strokeWidth="1.7" strokeLinejoin="round" /></svg>
                تواصل معنا
              </Link>
              <Link to={ROUTES.REGISTER} className="contact-btn contact-btn--gold">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M11 6l-6 6 6 6" stroke="#2a1500" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                ابدأ رحلتك الآن
              </Link>
            </RevealSection>
          </RevealSection>
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
              <div style={{ color: '#7c6aaa', fontSize: 10, letterSpacing: 3, fontWeight: 600 }}>ONLINE</div>
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
        .section-container { max-width: 1340px; margin: 0 auto; position: relative; z-index: 1; }
        /* Section-to-section continuity — a soft, restrained atmospheric
           dissolve across the hard color-boundary seams. Brand-purple at low
           opacity (matching the ambient glows already used elsewhere), NOT
           near-black — a dark, full-width band at any real opacity reads as
           a drop-shadow, not a color continuation. Confined to each
           section's own top edge (within its existing top padding) so it
           never overlaps content. */
        .section-bridge { position: absolute; top: 0; inset-inline: 0; height: clamp(24px, 4vw, 64px); z-index: 0; pointer-events: none; }
        .section-bridge--from-dark { background: linear-gradient(to bottom, rgba(124,58,237,0.14), rgba(124,58,237,0.04) 60%, transparent); }
        .section-bridge--from-light { background: linear-gradient(to bottom, rgba(251,250,254,0.28), rgba(251,250,254,0.08) 60%, transparent); }
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
        .journey-section { position: relative; background: #F6F4FB; padding: clamp(64px,8vw,110px) clamp(20px,5vw,68px); }
        .journey-row { display: flex; align-items: center; gap: clamp(32px,5vw,72px); flex-wrap: wrap; }
        .journey-steps-wrap { flex: 1 1 600px; min-width: 0; }
        .journey-steps { display: flex; align-items: flex-end; gap: 0; }
        /* Flex-slot sizing lives on the reveal wrapper (the real flex item),
           kept separate from .journey-step's own visual/hover styling below
           so the entrance transform (on the wrapper) never fights the
           hover transform (on the card). */
        .journey-step-slot { flex: 1; min-width: 122px; align-self: center; }
        .journey-step-slot--active { flex: 1.05; min-width: 130px; align-self: stretch; }
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
          .journey-step-slot, .journey-step-slot--active { flex: none; min-width: 0; width: 100%; max-width: 560px; margin: 0 auto; align-self: auto; }
          .journey-connector { width: auto; height: auto; padding: 2px 0; }
          .journey-connector__h { display: none; }
          .journey-connector__v { display: block; margin: 0 auto; }
        }
        @media (max-width: 479px) {
          .journey-step, .journey-step--active { padding: 22px 16px; }
        }

        /* ── Platform ── */
        .platform-section { position: relative; background: #F8F7FC; padding: clamp(64px,8vw,108px) clamp(20px,5vw,68px); }
        .platform-row { display: flex; align-items: center; gap: clamp(34px,5vw,70px); flex-wrap: wrap; }
        .platform-lead { flex: 0 1 360px; min-width: 260px; text-align: right; order: 2; }
        .platform-features { margin-top: 28px; display: flex; flex-direction: column; gap: 18px; }
        .platform-feature { display: flex; align-items: center; gap: 12px; justify-content: flex-start; flex-direction: row-reverse; }
        .platform-feature__icon { flex-shrink: 0; width: 26px; height: 26px; border-radius: 50%; background: #E6F4EC; display: grid; place-items: center; }
        .platform-feature__text { color: #374151; font-size: 16.5px; }
        .platform-cta { margin-top: 30px; }
        .platform-image { flex: 1 1 600px; min-width: 0; order: 1; }
        .platform-image img { width: 100%; height: auto; display: block; border-radius: 18px; filter: drop-shadow(0 30px 60px rgba(36,12,82,.16)); }
        /* Gentle ambient float after the entrance settles — product feels alive, not static */
        .platform-image__float { animation: platformFloat 6.5s ease-in-out infinite; }
        @keyframes platformFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        @media (max-width: 900px) {
          .platform-lead, .platform-image { flex-basis: 100%; }
        }

        /* ── Community ── */
        .community-section { position: relative; background: #F8F7FC; padding: clamp(60px,7vw,100px) clamp(20px,5vw,68px); }
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

        /* ── Pricing Section (Top-tier SaaS Redesign) ── */
        .pricing-section {
          position: relative;
          background: linear-gradient(180deg, #FDFCFE 0%, #F6F2FD 50%, #FDFCFE 100%);
          padding: clamp(64px, 7.5vw, 104px) clamp(20px, 5vw, 68px);
          overflow: hidden;
        }
        .pricing-ambient-glow {
          position: absolute;
          top: 15%;
          left: 50%;
          transform: translateX(-50%);
          width: 800px;
          height: 380px;
          background: radial-gradient(circle, rgba(109, 52, 214, 0.05) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }
        .pricing-header {
          text-align: center;
          max-width: 760px;
          margin: 0 auto clamp(32px, 4.5vw, 48px);
          position: relative;
          z-index: 1;
        }
        .pricing-header__badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 18px;
          border-radius: 9999px;
          background: rgba(109, 52, 214, 0.08);
          border: 1px solid rgba(109, 52, 214, 0.16);
          color: #5B2BC4;
          font-family: Cairo, sans-serif;
          font-size: 13.5px;
          font-weight: 700;
          margin-bottom: 14px;
        }
        .pricing-header__badge-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #D4AF37;
          box-shadow: 0 0 8px rgba(212, 175, 55, 0.6);
        }
        .pricing-header__title {
          font-family: Cairo, sans-serif;
          font-weight: 800;
          font-size: clamp(30px, 3.8vw, 46px);
          line-height: 1.25;
          margin-bottom: 12px;
        }
        .pricing-header__subtitle {
          font-family: Tajawal, sans-serif;
          font-size: clamp(15px, 1.3vw, 17.5px);
          color: #64748B;
          line-height: 1.8;
          max-width: 620px;
          margin: 0 auto;
        }

        /* ── Controls & Navigation Bar ── */
        .pricing-controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          max-width: 1340px;
          margin: 0 auto 24px;
          position: relative;
          z-index: 2;
        }
        .pricing-controls__info {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: Cairo, sans-serif;
          font-size: 14px;
          color: #64748B;
          font-weight: 600;
        }
        .pricing-controls__count-pill {
          background: #FFFFFF;
          border: 1px solid #ECE6F6;
          border-radius: 20px;
          padding: 4px 14px;
          color: #1A0447;
          font-weight: 700;
        }
        .pricing-controls__actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .pricing-view-toggle {
          display: inline-flex;
          align-items: center;
          background: #FFFFFF;
          border: 1px solid #ECE6F6;
          border-radius: 12px;
          padding: 3px;
          box-shadow: 0 2px 8px rgba(36, 12, 82, 0.04);
        }
        .pricing-view-toggle__btn {
          border: none;
          background: transparent;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 9px;
          font-family: Cairo, sans-serif;
          font-size: 13px;
          font-weight: 700;
          color: #64748B;
          transition: all 0.2s ease;
        }
        .pricing-view-toggle__btn--active {
          background: #5B2BC4;
          color: #FFFFFF;
          box-shadow: 0 3px 10px rgba(91, 43, 196, 0.25);
        }
        .pricing-nav-btn {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: #FFFFFF;
          border: 1px solid #ECE6F6;
          color: #1A0447;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(36, 12, 82, 0.04);
        }
        .pricing-nav-btn:hover:not(:disabled) {
          background: #5B2BC4;
          border-color: #5B2BC4;
          color: #FFFFFF;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(91, 43, 196, 0.22);
        }
        .pricing-nav-btn:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        /* ── Carousel Track ── */
        .pricing-carousel-container {
          position: relative;
          max-width: 1340px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }
        .pricing-carousel-track {
          display: flex;
          gap: 24px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
          padding: 16px 4px 32px;
          scrollbar-width: thin;
          scrollbar-color: rgba(109, 52, 214, 0.2) transparent;
        }
        .pricing-carousel-track::-webkit-scrollbar {
          height: 6px;
        }
        .pricing-carousel-track::-webkit-scrollbar-track {
          background: #F1EDFA;
          border-radius: 8px;
        }
        .pricing-carousel-track::-webkit-scrollbar-thumb {
          background: #C5B2EA;
          border-radius: 8px;
        }
        .pricing-carousel-track::-webkit-scrollbar-thumb:hover {
          background: #6D34D6;
        }
        .pricing-carousel-item {
          flex: 0 0 310px;
          width: 310px;
          scroll-snap-align: start;
        }
        @media (max-width: 480px) {
          .pricing-carousel-item {
            flex: 0 0 85vw;
            width: 85vw;
            max-width: 320px;
          }
        }

        /* ── Adaptive Grid (for <= 4 or Grid View) ── */
        .pricing-grid-adaptive {
          display: grid;
          gap: 24px;
          max-width: 1340px;
          margin: 0 auto;
          padding: 16px 4px 32px;
          position: relative;
          z-index: 1;
        }
        .pricing-grid-adaptive--1 {
          max-width: 380px;
          grid-template-columns: 1fr;
        }
        .pricing-grid-adaptive--2 {
          max-width: 760px;
          grid-template-columns: repeat(2, 1fr);
        }
        .pricing-grid-adaptive--3 {
          max-width: 1140px;
          grid-template-columns: repeat(3, 1fr);
        }
        .pricing-grid-adaptive--4 {
          max-width: 1340px;
          grid-template-columns: repeat(4, 1fr);
        }
        .pricing-grid-adaptive--many {
          max-width: 1340px;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        }
        @media (max-width: 1120px) {
          .pricing-grid-adaptive--4 {
            grid-template-columns: repeat(2, 1fr);
          }
          .pricing-grid-adaptive--3 {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 680px) {
          .pricing-grid-adaptive--2,
          .pricing-grid-adaptive--3,
          .pricing-grid-adaptive--4 {
            grid-template-columns: 1fr;
            max-width: 360px;
          }
        }

        /* ── Skeleton & Empty State ── */
        .pricing-skeleton-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 24px;
          max-width: 1340px;
          margin: 0 auto;
        }
        .pricing-skeleton-card {
          height: 460px;
          border-radius: 24px;
          background: #EFEAF8;
        }
        .pricing-empty-state {
          background: #FFFFFF;
          border: 1px solid #ECE6F6;
          border-radius: 24px;
          padding: 48px 24px;
          text-align: center;
          max-width: 500px;
          margin: 0 auto;
          box-shadow: 0 10px 30px rgba(36, 12, 82, 0.04);
        }
        .pricing-empty-state p {
          color: #6B7280;
          font-family: Cairo, sans-serif;
          font-size: 16px;
          margin-bottom: 20px;
        }

        /* ── Price Card Design System ── */
        .price-card {
          position: relative;
          background: #FFFFFF;
          border: 1.5px solid #F1EDFA;
          border-radius: 24px;
          padding: 32px 24px 28px;
          box-shadow: 0 12px 32px rgba(26, 4, 71, 0.05);
          text-align: right;
          transition: transform 0.35s cubic-bezier(0.2, 0.7, 0.2, 1), box-shadow 0.35s, border-color 0.35s;
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        .price-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 22px 46px rgba(75, 31, 176, 0.1);
          border-color: #D6C7F7;
        }
        .price-card--popular {
          border: 2px solid #E8B24A;
          box-shadow: 0 22px 50px rgba(212, 160, 50, 0.18);
        }
        .price-card--popular:hover {
          transform: translateY(-8px);
          box-shadow: 0 28px 56px rgba(212, 160, 50, 0.24);
        }
        .price-card__sweep-clip {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          overflow: hidden;
          pointer-events: none;
        }
        .price-card__sweep {
          position: absolute;
          inset: 0;
          background: linear-gradient(100deg, transparent 40%, rgba(232, 199, 106, 0.35) 50%, transparent 60%);
        }
        .price-card__badge {
          position: absolute;
          top: -14px;
          inset-inline-start: 50%;
          transform: translateX(-50%);
          background: linear-gradient(135deg, #F3D37D, #D4AF37);
          color: #3A2200;
          font-family: Cairo, sans-serif;
          font-weight: 800;
          font-size: 13px;
          padding: 5px 18px;
          border-radius: 30px;
          white-space: nowrap;
          box-shadow: 0 6px 18px rgba(212, 175, 55, 0.4);
          z-index: 2;
        }
        .price-card__header {
          margin-bottom: 14px;
        }
        .price-card__name {
          font-family: Cairo, sans-serif;
          font-weight: 800;
          font-size: 22px;
          color: #1A0447;
          line-height: 1.3;
        }
        .price-card__sub {
          color: #8E95A5;
          font-size: 13.5px;
          font-family: Tajawal, sans-serif;
          margin-top: 5px;
          line-height: 1.5;
          min-height: 38px;
        }
        .price-card__price-row {
          margin-top: 10px;
          display: flex;
          align-items: baseline;
          gap: 6px;
          justify-content: flex-start;
          flex-direction: row-reverse;
        }
        .price-card__price {
          font-family: Cairo, sans-serif;
          font-weight: 800;
          font-size: 38px;
          color: #1A0447;
          letter-spacing: -0.5px;
        }
        .price-card__caption-wrap {
          margin-top: 6px;
        }
        .price-card__caption {
          display: inline-block;
          font-family: Tajawal, sans-serif;
          font-size: 13px;
          color: #6D34D6;
          background: #F4EFFF;
          padding: 3px 10px;
          border-radius: 8px;
          font-weight: 600;
        }
        .price-card--popular .price-card__caption {
          color: #8D5B00;
          background: #FDF6E2;
        }
        .price-card__divider {
          height: 1px;
          background: #F1EDFA;
          margin: 18px 0;
        }
        .price-card--popular .price-card__divider {
          background: #F3EBD9;
        }
        .price-card__features {
          display: flex;
          flex-direction: column;
          gap: 12px;
          font-size: 14.5px;
          color: #4B5563;
          font-family: Tajawal, sans-serif;
          margin: 0;
          padding: 0;
          list-style: none;
          flex-grow: 1;
        }
        .price-card__feature {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-direction: row-reverse;
          justify-content: flex-start;
          line-height: 1.4;
        }
        .price-card__check-wrap {
          flex-shrink: 0;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #EFEAF8;
          display: grid;
          place-items: center;
        }
        .price-card__check-wrap--popular {
          background: #FBF3DF;
        }
        .price-card__action {
          margin-top: 24px;
        }
        .price-card__btn {
          display: block;
          width: 100%;
          font-family: Tajawal, sans-serif;
          font-weight: 700;
          font-size: 15.5px;
          border: none;
          border-radius: 12px;
          padding: 13px;
          text-align: center;
          text-decoration: none;
          cursor: pointer;
          transition: transform 0.25s, box-shadow 0.25s, background 0.25s;
          background: linear-gradient(135deg, #5B2BC4, #3D1894);
          color: #FFFFFF;
          min-height: 46px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 14px rgba(91, 43, 196, 0.2);
        }
        .price-card__btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 22px rgba(91, 43, 196, 0.32);
        }
        .price-card--popular .price-card__btn {
          background: linear-gradient(135deg, #F3D37D, #D4AF37);
          color: #2A1500;
          font-weight: 800;
          box-shadow: 0 8px 22px rgba(212, 175, 55, 0.35);
        }
        .price-card--popular .price-card__btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(212, 175, 55, 0.45);
        }
        .price-card__btn:focus-visible {
          outline: 2px solid #6D34D6;
          outline-offset: 3px;
        }

        /* ── Pricing Bottom Bar / Guarantee ── */
        .pricing-bottom-bar {
          margin-top: clamp(32px, 4vw, 48px);
          border-top: 1px solid #ECE6F6;
          padding-top: 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 20px;
          max-width: 1340px;
          margin-inline: auto;
          position: relative;
          z-index: 1;
        }
        .pricing-trust-badges {
          display: flex;
          align-items: center;
          gap: clamp(16px, 3vw, 32px);
          flex-wrap: wrap;
        }
        .pricing-trust-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: Tajawal, sans-serif;
          font-size: 14px;
          color: #556070;
          font-weight: 600;
        }
        .pricing-trust-badge svg {
          color: #D4AF37;
          flex-shrink: 0;
        }
        .pricing-view-all-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: Cairo, sans-serif;
          font-weight: 700;
          font-size: 15px;
          color: #5B2BC4;
          text-decoration: none;
          padding: 10px 22px;
          border-radius: 12px;
          background: #FFFFFF;
          border: 1.5px solid rgba(91, 43, 196, 0.2);
          box-shadow: 0 2px 8px rgba(36, 12, 82, 0.04);
          transition: all 0.25s ease;
        }
        .pricing-view-all-link:hover {
          background: #5B2BC4;
          color: #FFFFFF;
          border-color: #5B2BC4;
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(91, 43, 196, 0.24);
        }
        @media (max-width: 768px) {
          .pricing-bottom-bar {
            flex-direction: column;
            align-items: stretch;
            text-align: center;
          }
          .pricing-trust-badges {
            justify-content: center;
          }
          .pricing-view-all-link {
            justify-content: center;
          }
        }

        /* ── Contact / CTA ── */
        .contact-section {
          position: relative; background: #160734 url('/images/footer_bg.png') center/cover no-repeat;
          min-height: clamp(380px,42vw,520px); display: flex; align-items: center;
          padding: clamp(40px,6vw,72px) clamp(20px,5vw,68px); overflow: hidden;
        }
        .contact-overlay { position: absolute; inset: 0; background: linear-gradient(270deg,rgba(22,7,52,.78) 0%,rgba(22,7,52,.4) 42%,rgba(22,7,52,0) 64%); }
        /* Pointer-following spotlight — desktop only, driven by --spot-x/--spot-y
           set directly on the section element (no React state / re-renders). */
        .contact-spotlight {
          position: absolute; inset: 0; z-index: 1; pointer-events: none;
          background: radial-gradient(360px circle at var(--spot-x,50%) var(--spot-y,50%), rgba(232,199,106,0.14), transparent 70%);
        }
        .contact-content { position: relative; z-index: 2; width: 100%; display: flex; justify-content: flex-start; }
        .contact-text { width: min(560px,100%); text-align: right; }
        .contact-heading { font-weight: 800; font-size: clamp(32px,4.4vw,56px); line-height: 1.2; color: #fff; font-family: Cairo, sans-serif; }
        .contact-heading__gold {
          background: linear-gradient(120deg,#E8C76A,#F7E7A8,#D4AF37,#E8C76A); background-size: 260% 100%;
          -webkit-background-clip: text; background-clip: text; color: transparent;
          animation: contactGoldSweep 1.8s ease-in-out 0.5s 1 both;
        }
        @keyframes contactGoldSweep { 0% { background-position: 100% 0; } 100% { background-position: 0% 0; } }
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
          .contact-heading__gold { animation: none; background-position: 0 0; }
          .platform-image__float { animation: none; }
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

function JourneyConnector({ color, flipEnd = false, delay = 0, reducedMotion = false }) {
  // The path itself "draws" via animated pathLength — reads as the journey
  // being built step by step rather than a static dotted line fading in.
  const pathMotion = reducedMotion
    ? {}
    : {
      initial: { pathLength: 0, opacity: 0 },
      whileInView: { pathLength: 1, opacity: 1 },
      viewport: { once: true, margin: '-40px' },
      transition: { duration: 0.65, delay, ease: EASE_CINEMATIC },
    }
  const dotMotion = reducedMotion
    ? {}
    : {
      initial: { opacity: 0, scale: 0 },
      whileInView: { opacity: 1, scale: 1 },
      viewport: { once: true, margin: '-40px' },
      transition: { duration: 0.3, delay: delay + 0.55, ease: EASE_CINEMATIC },
    }
  return (
    <span className="journey-connector" aria-hidden="true">
      <svg className="journey-connector__h" width="34" height="30" viewBox="0 0 34 30" fill="none">
        <motion.path d="M2 22C10 22 9 8 17 8s7 14 15 14" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeDasharray="0.1 7" {...pathMotion} />
        <motion.circle cx={flipEnd ? 2 : 32} cy="22" r="2.4" fill={color} {...dotMotion} />
      </svg>
      <svg className="journey-connector__v" width="24" height="28" viewBox="0 0 24 28" fill="none">
        <motion.path d="M12 2v24" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeDasharray="0.1 6" {...pathMotion} />
      </svg>
    </span>
  )
}

function PriceCard({ id, name, sub, price, caption, features, popular, reducedMotion = false }) {
  return (
    <div className={`price-card${popular ? ' price-card--popular' : ''}`}>
      {popular && !reducedMotion && (
        <div className="price-card__sweep-clip" aria-hidden="true">
          <motion.div
            className="price-card__sweep"
            initial={{ x: '-120%', opacity: 0 }}
            whileInView={{ x: '120%', opacity: [0, 1, 0] }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 1, ease: 'easeInOut', delay: 0.4 }}
          />
        </div>
      )}
      {popular && <div className="price-card__badge">الأكثر طلباً</div>}
      <div className="price-card__header">
        <h3 className="price-card__name">{name}</h3>
        {sub && <p className="price-card__sub">{sub}</p>}
      </div>
      <div className="price-card__price-row">
        <span className="price-card__price">{price}</span>
      </div>
      {caption && (
        <div className="price-card__caption-wrap">
          <span className="price-card__caption">{caption}</span>
        </div>
      )}
      <div className="price-card__divider" />
      <ul className="price-card__features" aria-label={`مزايا ${name}`}>
        {features.map((f, idx) => (
          <li key={idx} className="price-card__feature">
            <span className={`price-card__check-wrap ${popular ? 'price-card__check-wrap--popular' : ''}`}>
              <CheckIcon color={popular ? '#B48208' : '#6D34D6'} />
            </span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <div className="price-card__action">
        <Link to={id ? `${ROUTES.REGISTER}?package=${id}` : ROUTES.REGISTER} className="price-card__btn">
          ابدأ الآن
        </Link>
      </div>
    </div>
  )
}
