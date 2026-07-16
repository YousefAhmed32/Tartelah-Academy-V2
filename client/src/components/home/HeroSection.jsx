import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform, useSpring } from 'framer-motion'
import { ROUTES } from '../../config/constants.js'
import HeroStats from './HeroStats.jsx'
import RecitationWidget from './RecitationWidget.jsx'
import HeroJourneyStrip from './HeroJourneyStrip.jsx'
import MaskReveal from '../motion/MaskReveal.jsx'
import useMotionCapabilities from '../../hooks/useMotionCapabilities.js'
import { EASE_CINEMATIC, EASE_SOFT, SPRING_SOFT } from '../motion/motion.constants.js'

// Cinematic hero — single art-directed canvas, not an image-column + text-column
// template. Structure:
//   .hero__photo-layer   — the family photograph as a FULL-BLEED layer (z-0),
//                          feathered top/bottom via mask-image and merged into
//                          the dark backdrop by .hero__photo-blend (a gradient
//                          layer, not a hard rectangle edge).
//   .hero__audio         — the recitation widget, floating over the photo's
//                          own empty (plain-background) region — positioned
//                          independently, not derived from a photo-column width.
//   .hero__container     — text content, right-anchored (RTL primary zone).
//   .hero__journey-wrap  — the "رحلتك التعليمية" strip, a normal-flow child
//                          of the hero (no negative-margin overlap hack) — the
//                          hero simply reserves enough height for it.
// Mobile/tablet does not reuse the desktop's absolute placements: `.hero`
// becomes a single flex column and `.hero__container`/`.hero__main` switch to
// `display:contents`, letting every real content node (badge, title, copy,
// CTAs, photo, audio, stats, journey) be reordered directly via `order` —
// one coherent recomposition instead of stacked breakpoint patches.

// ── Opening timeline — a single, tunable schedule instead of scattered
// per-element delays, so the mount sequence reads as one directed shot list.
const STAGE = {
  badge: 0.15,
  titleLine1: 0.32,
  titleLine2: 0.46,
  titleLine3: 0.58,
  copy: 0.78,
  ctaPrimary: 0.94,
  ctaSecondary: 1.04,
  stats: 1.18,
  journey: 1.05,
}

export default function HeroSection() {
  const { reducedMotion, narrow } = useMotionCapabilities()
  const heroRef = useRef(null)

  // Scroll-linked depth: background drifts slower than content, content
  // eases up faster — classic parallax read without hijacking native scroll
  // (pure transform mapping off scrollYProgress, no wheel/scroll listeners).
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const photoYRaw = useTransform(scrollYProgress, [0, 1], [0, narrow ? 24 : 70])
  const contentYRaw = useTransform(scrollYProgress, [0, 1], [0, narrow ? -14 : -46])
  const glowYRaw = useTransform(scrollYProgress, [0, 1], [0, 34])
  const scrollIndicatorOpacity = useTransform(scrollYProgress, [0, 0.14], [1, 0])

  const photoY = useSpring(photoYRaw, { stiffness: 90, damping: 26, mass: 0.5 })
  const contentY = useSpring(contentYRaw, { stiffness: 90, damping: 26, mass: 0.5 })
  const glowY = useSpring(glowYRaw, { stiffness: 90, damping: 26, mass: 0.5 })

  const parallaxStyle = reducedMotion ? {} : { y: photoY }
  const contentParallaxStyle = reducedMotion ? {} : { y: contentY }
  const glowParallaxStyle = reducedMotion ? {} : { y: glowY }

  return (
    <section id="top" ref={heroRef} className="hero" aria-label="ترتيلة أونلاين — تعلم القرآن الكريم">
      {/* ── Base atmosphere (shows through the photo's feathered edges) ── */}
      <div className="hero__bg-base" aria-hidden="true" />

      {/* ── Photographic foundation: full-bleed, feathered, not a column ── */}
      <motion.div
        className="hero__photo-layer"
        initial={{ opacity: 0, scale: reducedMotion ? 1 : 1.06, filter: reducedMotion ? 'none' : 'blur(6px)' }}
        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
        transition={{ duration: reducedMotion ? 0 : 1.2, ease: EASE_CINEMATIC }}
        style={parallaxStyle}
      >
        <img
          className="hero__photo"
          src="/images/hero_bg-4.png"
          alt="أسرة تستخدم منصة ترتيلة أونلاين لتعلم القرآن الكريم عبر الهاتف والتابلت"
          width="1829"
          height="860"
          fetchPriority="high"
          decoding="async"
        />
        <div className="hero__photo-blend" aria-hidden="true" />
      </motion.div>

      {/* ── Ambient gold glow + geometric texture, above the photo so they read on the dark side ── */}
      <motion.div className="hero__bg-glow" aria-hidden="true" style={glowParallaxStyle} />
      <div className="hero__bg-pattern" aria-hidden="true" />

      {/* ── Recitation widget: floats over the photo's own empty region ── */}
      {/* <RecitationWidget className="hero__audio" /> */}

      {/* ── Primary content zone ── */}
      <motion.div className="hero__container" style={contentParallaxStyle}>
        <div className="hero__main">
          <motion.div
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.85, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ ...SPRING_SOFT, delay: reducedMotion ? 0 : STAGE.badge }}
            className="hero__badge"
          >
            <span className="hero__badge-dot" aria-hidden="true" />
            <span>+20K طالب يتعلمون معنا الآن</span>
          </motion.div>

          <h1 className="hero__title">
            <MaskReveal as="span" className="hero__title-line" delay={STAGE.titleLine1} reducedMotion={reducedMotion}>
              تعلم <span className="hero__title-gold">القرآن</span>
            </MaskReveal>
            <MaskReveal as="span" className="hero__title-line" delay={STAGE.titleLine2} reducedMotion={reducedMotion}>
              كما لم تتخيل
            </MaskReveal>
            <MaskReveal as="span" className="hero__title-line" delay={STAGE.titleLine3} reducedMotion={reducedMotion}>
              من قبل
            </MaskReveal>
          </h1>

          <motion.p
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 16, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: reducedMotion ? 0.4 : 0.8, delay: reducedMotion ? 0 : STAGE.copy, ease: EASE_SOFT }}
            className="hero__copy"
          >
            منصة تربوية أونلاين تجمع بين <span className="hero__copy-gold">أصالة العلم</span> وقوة التقنية
            لتمنحك <span className="hero__copy-gold">تجربة تعلم فريدة</span> وملهمة.
          </motion.p>

          <div className="hero__cta-row">
            <motion.div
              initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 22, y: 14 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ ...SPRING_SOFT, delay: reducedMotion ? 0 : STAGE.ctaPrimary }}
            >
              <Link to={ROUTES.REGISTER} className="hero__cta hero__cta--primary">
                ابدأ رحلتك الآن
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="hero__cta-arrow">
                  <path d="M19 12H5M11 6l-6 6 6 6" stroke="#2a1500" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </motion.div>
            <motion.div
              initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: -22, y: 14 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ ...SPRING_SOFT, delay: reducedMotion ? 0 : STAGE.ctaSecondary }}
            >
              <Link to={ROUTES.PROGRAMS} className="hero__cta hero__cta--secondary">
                استكشف المسارات
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </motion.div>
          </div>

          <motion.div
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reducedMotion ? 0.4 : 0.7, delay: reducedMotion ? 0 : STAGE.stats, ease: EASE_CINEMATIC }}
            className="hero__stats-wrap"
          >
            <HeroStats />
          </motion.div>
        </div>
      </motion.div>

      {/* ── Journey strip — normal flow, hero reserves height for it ── */}
      <div className="hero__journey-wrap">
        <HeroJourneyStrip startDelay={reducedMotion ? 0 : STAGE.journey} reducedMotion={reducedMotion} />
      </div>

      {/* ── Scroll indicator ── */}
      <motion.a
        href="#journey"
        className="hero__scroll"
        aria-label="تابع التمرير لأسفل"
        style={reducedMotion ? {} : { opacity: scrollIndicatorOpacity }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="m6 9 6 6 6-6M6 4l6 6 6-6" stroke="#E8C76A" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.a>

      <style>{`
        .hero {
          position: relative;
          isolation: isolate;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          min-height: max(820px, 100svh);
          padding: clamp(126px, 14vw, 156px) clamp(20px, 5vw, 68px) clamp(96px, 10vw, 124px);
        }

        /* Base atmosphere — the color the photo's feathered edges dissolve into */
        .hero__bg-base {
          position: absolute; inset: 0; z-index: 0;
          background:
            radial-gradient(120% 70% at 88% 8%, rgba(212,175,55,0.10) 0%, transparent 55%),
            radial-gradient(90% 60% at 8% 100%, rgba(124,58,237,0.16) 0%, transparent 60%),
            linear-gradient(150deg, #1A0A2D 0%, #12091F 48%, #070611 100%);
        }

        /* Photo — full-bleed art-directed layer, not a rectangular column.
           Feathered top/bottom via mask so it dissolves into .hero__bg-base
           instead of ending in a hard edge. */
        .hero__photo-layer {
          position: absolute; inset: 0; z-index: 1;
          -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 10%, #000 86%, transparent 100%);
          mask-image: linear-gradient(to bottom, transparent 0%, #000 10%, #000 86%, transparent 100%);
        }
        .hero__photo {
          position: absolute; inset: 0;
          width: 100%; height: 100%;
          object-fit: cover;
          object-position: 0% 38%;
          display: block;
        }
        /* Directional + vertical blend: dark on the content side (physical
           right), open where the family sits (physical left) — these are
           deliberately physical (not logical) directions, since the crop
           itself never flips with document direction. */
        .hero__photo-blend {
          position: absolute; inset: 0;
          background:
            linear-gradient(to bottom, rgba(7,6,17,0.85) 0%, transparent 15%),
            linear-gradient(to top, rgba(7,6,17,0.9) 0%, transparent 22%),
            linear-gradient(to left, rgba(7,6,17,0.96) 0%, rgba(7,6,17,0.84) 22%, rgba(9,6,20,0.5) 44%, rgba(9,6,20,0.14) 64%, transparent 84%);
        }

        /* Ambient glowing-Qur'an art — screen-blended on the dark content side.
           Breathes gently (opacity) and drifts (transform) so the backdrop
           reads as alive/depth rather than a static poster behind the text. */
        .hero__bg-glow {
          position: absolute; inset: 0; z-index: 2;
          background-image: url('/images/hero_bg.png');
          background-repeat: no-repeat;
          background-position: 78% 38%;
          background-size: 44% auto;
          opacity: 0.26;
          mix-blend-mode: screen;
          -webkit-mask-image: radial-gradient(50% 55% at 78% 40%, rgba(0,0,0,0.85) 0%, transparent 78%);
          mask-image: radial-gradient(50% 55% at 78% 40%, rgba(0,0,0,0.85) 0%, transparent 78%);
          animation: heroGlowBreathe 9s ease-in-out infinite;
        }
        @keyframes heroGlowBreathe {
          0%, 100% { opacity: 0.20; transform: scale(1); }
          50% { opacity: 0.32; transform: scale(1.035); }
        }

        /* Restrained Islamic geometric texture — slow independent drift for depth */
        .hero__bg-pattern {
          position: absolute; inset: -40px; z-index: 2; opacity: 0.02;
          background-image: url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff'%3E%3Cpath d='M40 0L50 14H30L40 0zm0 80L30 66h20L40 80zM0 40L14 30v20L0 40zm80 0L66 50V30L80 40zM40 25l8 8-8 8-8-8 8-8z'/%3E%3C/g%3E%3C/svg%3E");
          background-size: 80px 80px;
          animation: heroPatternDrift 40s linear infinite;
        }
        @keyframes heroPatternDrift {
          0% { transform: translate(0, 0); }
          100% { transform: translate(-80px, -80px); }
        }

        /* Recitation widget — floats over the photo's own plain-background
           region (roughly between the family group and the text column);
           tuned independently, not derived from any photo-width variable. */
        .hero__audio {
          position: absolute; z-index: 4;
          top: 45%; inset-inline-end: clamp(300px, 30vw, 460px);
        }

        /* Content */
        .hero__container {
          position: relative; z-index: 5;
          flex: 1 1 auto;
          display: flex; align-items: center;
          max-width: 1520px; margin: 0 auto; width: 100%;
        }
        .hero__main { width: min(640px, 100%); text-align: right; }

        .hero__badge {
          display: inline-flex; align-items: center; gap: 9px;
          background: rgba(15,6,32,0.55);
          border: 1px solid rgba(232,199,106,0.38);
          border-radius: 30px;
          padding: 8px 16px 8px 14px;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          color: #F3E9D2; font-size: 13.5px; font-weight: 600;
          font-family: Tajawal, sans-serif;
        }
        .hero__badge-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: #4ADE80; flex-shrink: 0;
          box-shadow: 0 0 0 0 rgba(74,222,128,0.6);
          animation: heroPulseDot 2s ease-out infinite;
        }

        .hero__title {
          margin: 22px 0 0;
          font-family: Cairo, sans-serif;
          font-weight: 900;
          line-height: 1.14;
          font-size: clamp(46px, 5vw, 82px);
          letter-spacing: -1.5px;
          color: #F7F3E8;
        }
        .hero__title-line { padding-bottom: 0.08em; }
        .hero__title-gold {
          background: linear-gradient(120deg, #E8C76A, #F7E7A8, #D4AF37, #E8C76A);
          background-size: 260% 100%;
          -webkit-background-clip: text; background-clip: text; color: transparent;
          animation: heroGoldSweep 1.8s ease-in-out 1.15s 1 both;
        }
        @keyframes heroGoldSweep {
          0% { background-position: 100% 0; }
          100% { background-position: 0% 0; }
        }

        .hero__copy {
          margin: 22px 0 0;
          font-size: clamp(16.5px, 1.4vw, 20px);
          line-height: 1.85;
          color: #C7BADE;
          max-width: 540px;
          margin-inline-end: auto;
        }
        .hero__copy-gold { color: #E8C76A; font-weight: 600; }

        .hero__cta-row { margin-top: 30px; display: flex; gap: 14px; justify-content: flex-end; flex-wrap: wrap; }
        .hero__cta {
          cursor: pointer; display: inline-flex; align-items: center; gap: 11px;
          font-family: Tajawal, sans-serif; font-weight: 700; font-size: 16.5px;
          border-radius: 34px; padding: 15px 28px; text-decoration: none;
          min-height: 44px;
          transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease, background 0.22s ease;
        }
        .hero__cta--primary {
          color: #2a1500; background: linear-gradient(135deg, #E8C76A, #D4AF37);
          box-shadow: 0 14px 30px rgba(212,175,55,0.35);
        }
        .hero__cta--primary:hover { transform: translateY(-2px); box-shadow: 0 16px 36px rgba(212,175,55,0.5); }
        .hero__cta--primary:hover .hero__cta-arrow { transform: translateX(-3px); }
        .hero__cta-arrow { transition: transform 0.22s ease; }
        .hero__cta--secondary {
          color: #F3E9D2; background: rgba(255,255,255,0.05);
          border: 1.5px solid rgba(255,255,255,0.22);
        }
        .hero__cta--secondary:hover { border-color: #E8C76A; background: rgba(232,199,106,0.08); color: #fff; transform: translateY(-2px); }
        .hero__cta:focus-visible { outline: 2px solid #E8C76A; outline-offset: 3px; }

        .hero__stats-wrap { margin-top: 46px; }

        /* Stats — premium horizontal rhythm under the CTAs */
        .hero-stats { display: flex; align-items: center; justify-content: flex-end; gap: clamp(16px, 2.4vw, 34px); flex-wrap: wrap; }
        .hero-stats__item { display: flex; align-items: center; gap: 10px; }
        .hero-stats__sep { width: 1px; height: 38px; background: rgba(255,255,255,0.14); margin-inline-end: clamp(6px, 1vw, 16px); }
        .hero-stats__icon { flex-shrink: 0; }
        .hero-stats__text { text-align: right; }
        .hero-stats__value { font-family: Cairo, sans-serif; font-weight: 800; font-size: clamp(19px, 1.9vw, 25px); color: #fff; line-height: 1.1; }
        .hero-stats__label { font-size: 12.5px; color: #A99BC4; margin-top: 2px; }

        /* Recitation widget */
        .hero-recitation {
          display: flex; align-items: center; gap: 12px;
          background: rgba(11,7,24,0.62);
          border: 1px solid rgba(232,199,106,0.32);
          border-radius: 16px;
          padding: 10px 14px;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          box-shadow: 0 18px 38px rgba(0,0,0,0.4);
          width: min(300px, 100%);
        }
        .hero-recitation__play {
          flex-shrink: 0; width: 42px; height: 42px; border-radius: 50%; border: none; cursor: pointer;
          background: linear-gradient(135deg, #E8C76A, #D4AF37);
          box-shadow: 0 6px 18px rgba(212,175,55,0.45);
          display: grid; place-items: center;
          transition: transform 0.2s ease;
        }
        .hero-recitation__play:hover { transform: scale(1.07); }
        .hero-recitation__play:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
        .hero-recitation__play:disabled { opacity: 0.5; cursor: not-allowed; }
        .hero-recitation__body { flex: 1; min-width: 0; }
        .hero-recitation__label { font-size: 11px; color: rgba(255,255,255,0.55); font-weight: 500; }
        .hero-recitation__title { font-family: Cairo, sans-serif; font-weight: 800; font-size: 14.5px; color: #fff; margin-top: 1px; }
        .hero-recitation__track { margin-top: 7px; height: 4px; border-radius: 4px; background: rgba(255,255,255,0.16); cursor: pointer; overflow: hidden; }
        .hero-recitation__fill { height: 100%; border-radius: 4px; background: linear-gradient(90deg,#9b6cf0,#E8C76A); transition: width 0.15s linear; }
        .hero-recitation__time { flex-shrink: 0; font-size: 10.5px; color: rgba(255,255,255,0.5); font-family: monospace; }

        /* Journey strip — normal-flow child, the hero's own bottom padding
           already reserves room for it plus the scroll indicator below it. */
        .hero__journey-wrap {
          position: relative; z-index: 6;
          max-width: 1520px; margin: clamp(32px, 4vw, 48px) auto 0; width: 100%;
        }
        .hero-journey {
          position: relative;
          background: rgba(11,7,24,0.68);
          border: 1px solid rgba(232,199,106,0.28);
          border-radius: 26px;
          padding: 26px clamp(20px, 3vw, 40px);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          box-shadow: 0 30px 70px rgba(0,0,0,0.45);
          display: flex; align-items: center; gap: clamp(20px, 3vw, 44px); flex-wrap: wrap;
          overflow: hidden;
        }
        .hero-journey__sweep {
          position: absolute; inset: 0; z-index: 0; pointer-events: none;
          background: linear-gradient(100deg, transparent 40%, rgba(232,199,106,0.16) 50%, transparent 60%);
        }
        .hero-journey__head { position: relative; z-index: 1; flex-shrink: 0; display: flex; flex-direction: column; }
        .hero-journey__eyebrow { font-family: Cairo, sans-serif; font-weight: 800; font-size: 17px; color: #fff; }
        .hero-journey__title { font-size: 13px; color: #E8C76A; font-weight: 700; margin-top: 2px; }
        .hero-journey__steps { position: relative; z-index: 1; flex: 1; display: flex; align-items: center; gap: clamp(14px, 2.2vw, 30px); min-width: 0; }
        .hero-journey__step { display: flex; align-items: center; gap: 12px; min-width: 0; }
        .hero-journey__divider { width: 1px; align-self: stretch; background: rgba(255,255,255,0.12); flex-shrink: 0; margin-inline-end: clamp(6px, 1vw, 14px); transform-origin: center; }
        .hero-journey__num { font-family: Amiri, serif; font-weight: 700; font-size: 20px; color: rgba(232,199,106,0.45); flex-shrink: 0; }
        .hero-journey__icon { flex-shrink: 0; width: 38px; height: 38px; border-radius: 12px; background: rgba(232,199,106,0.1); display: grid; place-items: center; }
        .hero-journey__text { min-width: 0; }
        .hero-journey__step-title { font-family: Cairo, sans-serif; font-weight: 700; font-size: 14.5px; color: #fff; }
        .hero-journey__step-desc { font-size: 12px; color: #A99BC4; margin-top: 2px; }

        /* Scroll indicator — always centered, never coupled to photo geometry */
        .hero__scroll {
          position: absolute; z-index: 6;
          bottom: clamp(28px, 4vw, 44px);
          inset-inline-start: 50%; transform: translateX(-50%);
          width: 42px; height: 42px; border-radius: 50%;
          border: 1.5px solid rgba(232,199,106,0.5);
          display: grid; place-items: center;
          animation: heroScrollFloat 2.4s ease-in-out infinite;
          text-decoration: none;
        }
        .hero__scroll:focus-visible { outline: 2px solid #E8C76A; outline-offset: 3px; }

        @keyframes heroPulseDot {
          0% { box-shadow: 0 0 0 0 rgba(74,222,128,0.55); }
          70% { box-shadow: 0 0 0 6px rgba(74,222,128,0); }
          100% { box-shadow: 0 0 0 0 rgba(74,222,128,0); }
        }
        /* Named uniquely (not "floaty") so it can't collide with HomePage's
           own translateY-only keyframe of the same name — this one must
           preserve the translateX(-50%) centering through every frame. */
        @keyframes heroScrollFloat {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(6px); }
        }

        /* ── Laptop: same architecture, tighter scale ── */
        @media (max-width: 1279px) {
          .hero { padding-top: clamp(118px, 15vw, 140px); }
          .hero__title { font-size: clamp(40px, 5.2vw, 66px); }
          .hero__main { width: min(560px, 100%); }
          .hero__audio { inset-inline-end: clamp(220px, 26vw, 340px); }
          .hero-journey__step-desc { display: none; }
        }

        /* ── Tablet + Mobile: one recomposition system.
           .hero itself is the flex column; .hero__container (the whole text
           block: badge, title, copy, CTAs, stats) and photo/audio/journey
           are reordered as coarse blocks via the order property — a single
           coherent stack, not desktop positions squeezed into a narrower
           viewport. (Note: text is kept together as one real box rather than
           interleaving the photo between individual lines — splitting it
           apart with display:contents made the text fail to paint at all in
           Chromium, so the grouped order below is the deliberate, safe
           choice.) ── */
        @media (max-width: 1023px) {
          .hero { min-height: unset; padding: clamp(120px, 18vw, 148px) clamp(20px, 5vw, 44px) clamp(56px, 8vw, 72px); }

          .hero__container { order: 1; flex: none; width: 100%; max-width: 100%; }
          .hero__photo-layer { order: 2; }
          .hero__audio { order: 3; }
          .hero__journey-wrap { order: 4; }

          .hero__main { width: 100%; text-align: center; }
          .hero__copy { margin-inline: auto; }
          .hero__cta-row, .hero-stats { justify-content: center; }

          .hero__photo-layer {
            position: relative; inset: auto; z-index: auto;
            width: 100%; height: clamp(280px, 42vw, 420px);
            border-radius: 24px; margin-top: 34px; overflow: hidden;
            -webkit-mask-image: none; mask-image: none;
          }
          .hero__photo-blend {
            background: linear-gradient(180deg, transparent 45%, rgba(7,6,17,0.9) 100%);
          }
          .hero__audio { position: relative; inset: auto; top: auto; margin: -46px auto 0; z-index: 4; }
          .hero__journey-wrap { margin-top: clamp(28px, 4vw, 40px); }

          /* Journey strip recomposition: the head (eyebrow + "في 4 خطوات")
             stacks above a real 2×2 grid of steps instead of forcing the
             desktop single row into a horizontal-scroll carousel — every
             step stays visible with no scrolling and no clipped content. */
          .hero-journey { flex-direction: column; align-items: stretch; }
          .hero-journey__steps {
            display: grid; grid-template-columns: repeat(2, 1fr);
            gap: 20px clamp(16px, 3vw, 32px); margin-top: 18px;
          }
          .hero-journey__step-desc { display: block; }
          .hero-journey__divider { display: none; }
          .hero__scroll { display: none; }
        }

        /* ── Mobile: single-column stack — same step anatomy (icon + number +
           title + description), just one per row so nothing has to compress
           below a comfortable reading width. ── */
        @media (max-width: 639px) {
          .hero { padding: clamp(104px, 26vw, 128px) 18px clamp(48px, 12vw, 64px); }
          .hero__badge { font-size: 12px; padding: 7px 13px 7px 12px; }
          .hero__title { font-size: clamp(34px, 10vw, 46px); letter-spacing: -0.5px; }
          .hero__copy { font-size: 15.5px; max-width: 100%; }
          .hero__cta { flex: 1 1 auto; justify-content: center; font-size: 15px; padding: 14px 20px; }
          .hero-stats { justify-content: space-between; gap: 10px 16px; }
          .hero-stats__sep { display: none; }
          .hero-stats__item { flex: 0 0 44%; }
          .hero__photo-layer { height: 260px; }
          .hero-journey { border-radius: 20px; padding: 20px; }
          .hero-journey__steps { grid-template-columns: 1fr; gap: 16px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .hero__scroll { animation: none; }
          .hero__badge-dot { animation: none; }
          .hero__bg-glow { animation: none; opacity: 0.26; }
          .hero__bg-pattern { animation: none; }
          .hero__title-gold { animation: none; background-position: 0 0; }
          .hero__cta, .hero-recitation__play, .hero-journey { transition: none !important; }
        }
      `}</style>
    </section>
  )
}
