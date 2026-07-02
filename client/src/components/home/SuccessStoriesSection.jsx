/**
 * SuccessStoriesSection — "قصص النجاح"
 * Admin-driven homepage section spotlighting the best teacher, best student and
 * best achievement — either as three premium cards or a single hero banner,
 * controlled from /admin/success-stories.
 */

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import api from '../../utils/api.js'
import { getFileUrl } from '../../config/constants.js'

// ── Animation preset (matches TestimonialsSection.jsx) ────────────────────────

const fadeUp = (delay = 0) => ({
  initial:    { opacity: 0, y: 28 },
  whileInView:{ opacity: 1, y: 0 },
  viewport:   { once: true, margin: '-80px' },
  transition: { duration: 0.62, delay, ease: [0.22, 0.85, 0.22, 1] },
})

// ── Image fallback ─────────────────────────────────────────────────────────────

function ImageFallback({ label }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)' }}>
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" style={{ color: 'rgba(255,255,255,0.2)' }}>
        <rect x="3" y="3" width="18" height="18" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="9" cy="9" r="1.8" stroke="currentColor" strokeWidth="1.6" />
        <path d="m5 17 4.5-4.5a2 2 0 0 1 2.8 0L17 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      {label && <span style={{ position: 'absolute', bottom: 12, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{label}</span>}
    </div>
  )
}

// ── Card ────────────────────────────────────────────────────────────────────

function StoryCard({ card, delay }) {
  const url = getFileUrl(card.image)
  return (
    <motion.div
      {...fadeUp(delay)}
      whileHover={{ y: -8 }}
      transition={{ duration: 0.4, ease: [0.22, 0.85, 0.22, 1] }}
      className="success-story-card"
      style={{
        position: 'relative',
        borderRadius: 24,
        overflow: 'hidden',
        background: 'linear-gradient(160deg,rgba(50,20,100,0.85),rgba(18,6,40,0.95))',
        border: '1px solid rgba(232,199,106,0.16)',
        boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
      }}
    >
      {/* Glow border on hover via CSS */}
      <div style={{ position: 'relative', height: 300, overflow: 'hidden' }}>
        {url ? (
          <img
            src={url}
            alt={card.nameAr}
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', display: 'block', transition: 'transform 0.5s ease' }}
            className="success-story-img"
          />
        ) : (
          <ImageFallback />
        )}

        {/* Gradient overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 45%, rgba(15,6,35,0.92) 100%)' }} />

        {/* Floating badge */}
        {card.badgeAr && (
          <div
            style={{
              position: 'absolute', top: 16, right: 16,
              background: 'linear-gradient(135deg,#E8C76A,#D4AF37)',
              borderRadius: 30, padding: '7px 16px',
              fontSize: 12.5, fontWeight: 800, color: '#2a1500',
              boxShadow: '0 8px 20px rgba(212,175,55,0.4)',
              fontFamily: 'Cairo',
            }}
          >
            {card.badgeAr}
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '22px 22px 26px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h3 style={{ margin: 0, color: '#fff', fontFamily: 'Cairo', fontWeight: 800, fontSize: 19 }}>{card.nameAr}</h3>
        {card.titleAr && (
          <div style={{ color: '#E8C76A', fontSize: 13.5, fontWeight: 600 }}>{card.titleAr}</div>
        )}
        {card.descriptionAr && (
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.65)', fontSize: 14, lineHeight: 1.8 }}>{card.descriptionAr}</p>
        )}
        {card.ctaText && card.ctaLink && (
          <a
            href={card.ctaLink}
            style={{
              marginTop: 6, alignSelf: 'flex-start',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              color: '#fff', fontSize: 13.5, fontWeight: 700, textDecoration: 'none',
              borderBottom: '1.5px solid rgba(232,199,106,0.5)', paddingBottom: 2,
            }}
          >
            {card.ctaText}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M10 17l5-5-5-5" stroke="#E8C76A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </a>
        )}
      </div>
    </motion.div>
  )
}

// ── Banner ────────────────────────────────────────────────────────────────────

function StoryBanner({ banner }) {
  const url = getFileUrl(banner.image)
  return (
    <motion.div
      {...fadeUp(0.1)}
      style={{
        position: 'relative',
        borderRadius: 28,
        overflow: 'hidden',
        minHeight: 'clamp(320px,42vw,520px)',
        border: '1px solid rgba(232,199,106,0.18)',
        boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
      }}
    >
      {url ? (
        <img
          src={url}
          alt={banner.titleAr || 'قصص النجاح'}
          loading="lazy"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <div style={{ position: 'absolute', inset: 0 }}><ImageFallback label="لم يتم رفع بانر بعد" /></div>
      )}

      {/* Gradient overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,4,26,0.92) 0%, rgba(10,4,26,0.35) 55%, transparent 100%)' }} />

      {/* Text content */}
      <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 'clamp(24px,4vw,56px)', gap: 14 }}>
        {banner.titleAr && (
          <h3 style={{ margin: 0, color: '#fff', fontFamily: 'Cairo', fontWeight: 800, fontSize: 'clamp(24px,3.4vw,40px)', maxWidth: 620 }}>
            {banner.titleAr}
          </h3>
        )}
        {banner.subtitleAr && (
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.75)', fontSize: 'clamp(14px,1.4vw,18px)', maxWidth: 560, lineHeight: 1.8 }}>
            {banner.subtitleAr}
          </p>
        )}
        {banner.buttonText && banner.buttonLink && (
          <a
            href={banner.buttonLink}
            style={{
              marginTop: 8, alignSelf: 'flex-start',
              display: 'inline-flex', alignItems: 'center', gap: 8,
              fontFamily: 'Tajawal', fontWeight: 700, fontSize: 16, color: '#2a1500',
              background: 'linear-gradient(135deg,#E8C76A,#D4AF37)',
              borderRadius: 34, padding: '13px 30px', textDecoration: 'none',
              boxShadow: '0 10px 28px rgba(212,175,55,0.4)',
              transition: 'transform 0.25s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = '' }}
          >
            {banner.buttonText}
          </a>
        )}
      </div>
    </motion.div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div style={{ maxWidth: 1340, margin: '0 auto', padding: '0 clamp(20px,5vw,68px)' }}>
      <div className="success-story-skel-row">
        {[0, 1, 2].map(i => (
          <div key={i} className="success-story-skel-card" />
        ))}
      </div>
    </div>
  )
}

// ── Main section ──────────────────────────────────────────────────────────────

export default function SuccessStoriesSection() {
  const { data, isLoading } = useQuery({
    queryKey: ['success-stories'],
    queryFn: () => api.get('/success-stories').then(r => r.data.data),
    staleTime: 60_000,
  })

  if (isLoading) {
    return (
      <section dir="rtl" style={{ background: '#150636', padding: 'clamp(64px,8vw,100px) 0', overflow: 'hidden' }}>
        <Skeleton />
      </section>
    )
  }

  if (!data || !data.isActive) return null

  const activeCards = (data.cards || [])
    .filter(c => c.isActive && (c.image || c.nameAr))
    .sort((a, b) => a.order - b.order)

  const bannerReady = data.banner?.isActive && data.banner?.image

  if (data.displayMode === 'cards' && activeCards.length === 0) return null
  if (data.displayMode === 'banner' && !bannerReady) return null

  return (
    <section
      id="success-stories"
      dir="rtl"
      style={{
        position: 'relative',
        background: 'radial-gradient(120% 100% at 80% 0%,#2a0e5e 0%,#1c0942 45%,#130430 100%)',
        padding: 'clamp(72px,8vw,108px) clamp(20px,5vw,68px)',
        overflow: 'hidden',
      }}
    >
      {/* Ambient glow */}
      <div aria-hidden="true" style={{ position: 'absolute', top: '-8%', left: '8%', width: 520, height: 520, borderRadius: '50%', background: 'radial-gradient(circle,rgba(232,199,106,0.10) 0%,transparent 70%)', filter: 'blur(70px)', pointerEvents: 'none' }} />
      <div aria-hidden="true" style={{ position: 'absolute', bottom: '-10%', right: '5%', width: 460, height: 460, borderRadius: '50%', background: 'radial-gradient(circle,rgba(124,58,237,0.16) 0%,transparent 70%)', filter: 'blur(64px)', pointerEvents: 'none' }} />

      <div style={{ maxWidth: 1340, margin: '0 auto', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <motion.div {...fadeUp(0)} style={{ textAlign: 'center', marginBottom: 'clamp(40px,5vw,64px)' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 18,
            background: 'rgba(232,199,106,0.12)', border: '1px solid rgba(232,199,106,0.25)',
            borderRadius: 30, padding: '7px 18px',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#E8C76A"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
            <span style={{ color: '#E8C76A', fontWeight: 700, fontSize: 14 }}>نجوم المنصة</span>
          </div>

          <h2 style={{ fontFamily: 'Cairo', fontWeight: 800, color: '#fff', fontSize: 'clamp(30px,4vw,50px)', lineHeight: 1.2, margin: '0 auto 16px', maxWidth: 680 }}>
            قصص
            <span style={{ background: 'linear-gradient(120deg,#E8C76A,#D4AF37)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}> النجاح</span>
          </h2>

          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 'clamp(15px,1.5vw,18px)', lineHeight: 1.85, maxWidth: 520, margin: '0 auto' }}>
            نحتفي بمن يصنعون الفرق — أفضل معلم، وأفضل طالب، وأبرز إنجاز في رحلتنا معًا
          </p>
        </motion.div>

        {/* Content */}
        {data.displayMode === 'banner' ? (
          <StoryBanner banner={data.banner} />
        ) : (
          <div className="success-story-grid">
            {activeCards.map((card, i) => (
              <StoryCard key={card.role} card={card} delay={0.12 + i * 0.1} />
            ))}
          </div>
        )}
      </div>

      {/* CSS */}
      <style>{`
        .success-story-grid {
          display: grid;
          grid-template-columns: repeat(${Math.min(activeCards.length || 3, 3)}, 1fr);
          gap: clamp(20px,2.4vw,32px);
        }
        .success-story-card:hover .success-story-img { transform: scale(1.05); }

        .success-story-skel-row { display: grid; grid-template-columns: repeat(3,1fr); gap: 24px; }
        .success-story-skel-card { height: 380px; border-radius: 24px; background: linear-gradient(100deg, rgba(255,255,255,0.03) 30%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.03) 70%); background-size: 200% 100%; animation: story-shimmer 1.6s ease-in-out infinite; }
        @keyframes story-shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }

        @media (max-width: 900px) {
          .success-story-grid { grid-template-columns: 1fr; }
          .success-story-skel-row { grid-template-columns: 1fr; }
        }

        @media (prefers-reduced-motion: reduce) {
          .success-story-img { transition: none !important; }
          .success-story-skel-card { animation: none !important; }
        }
      `}</style>
    </section>
  )
}
