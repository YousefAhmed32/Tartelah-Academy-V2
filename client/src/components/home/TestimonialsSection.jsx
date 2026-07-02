/**
 * TestimonialsSection — Real customer proof using WhatsApp screenshots and audio.
 * Inserted into the Landing Page between Platform and Community sections.
 *
 * Assets:
 *   /massege (1-4).png          — real WhatsApp conversation screenshots
 *   /audio/Customer opinion-1/2/3.mp3, enhaza-1/2.mp3, fatiha.mp3 — real voice testimonials
 */

import { useState, useRef, useEffect, useCallback, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ── Testimonial data ──────────────────────────────────────────────────────────
// Maps real assets to card metadata. Quotes are intentionally humble/authentic.

const FEATURED = {
  id:          'f0',
  image:       '/MSGC-1.png',
  audio:       '/audio/Customer opinion-1.mp3',
  name:        'ولي أمر',
  initial:     'و',
  level:       'متابع منذ ٦ أشهر',
  rating:      5,
  quote:       'ترتيلة غيّرت كل شيء — ابني ينتظر حصة القرآن كل أسبوع بشوق حقيقي.',
  achievement: 'أتم جزء عم في ٣ أشهر',
  color:       '#9b6cf0',
}

const GRID_CARDS = [
  {
    id:      'g1',
    image:   '/MSGC-2.png',
    audio:   '/audio/Customer opinion-2.mp3',
    name:    'ولي أمر طالبة',
    initial: 'أ',
    level:   'مستوى مبتدئ',
    rating:  5,
    quote:   'الأستاذة تمتلك صبراً لا ينتهي مع الأطفال.',
  },
  {
    id:      'g2',
    image:   '/MSGC-3.png',
    audio:   '/audio/Customer opinion-3.mp3',
    name:    'طالبة',
    initial: 'س',
    level:   'مستوى متوسط',
    rating:  5,
    quote:   'أحسست بتحسن واضح في تجويدي بعد أسبوعين فقط.',
  },
  {
    id:      'g3',
    image:   '/MSGC-4.png',
    audio:   '/audio/enhaza-1.mp3',
    name:    'ولي أمر',
    initial: 'م',
    level:   'مستوى متقدم',
    rating:  5,
    quote:   'المنهج منظم ومدروس، والمتابعة مستمرة دائماً.',
  },
]

const AUDIO_CARDS = [
  {
    id:      'a4',
    audio:   '/audio/enhaza-2.mp3',
    name:    'طالبة',
    initial: 'ن',
    level:   'مستوى مبتدئ',
    rating:  5,
    quote:   'رحلة تعلم لا تُنسى — أنصح كل أم بهذه المنصة.',
    color:   '#9b6cf0',
  },
  {
    id:      'a5',
    audio:   '/audio/fatiha.mp3',
    name:    'أم فاطمة',
    initial: 'ف',
    level:   'طالبة جديدة',
    rating:  5,
    quote:   'المعلمة تتعامل مع كل طالبة بأسلوب مختلف ومناسب.',
    color:   '#E8C76A',
  },
]

// ── Animation preset ──────────────────────────────────────────────────────────

const fadeUp = (delay = 0) => ({
  initial:    { opacity: 0, y: 28 },
  whileInView:{ opacity: 1, y: 0 },
  viewport:   { once: true, margin: '-80px' },
  transition: { duration: 0.62, delay, ease: [0.22, 0.85, 0.22, 1] },
})

// ── Stars ─────────────────────────────────────────────────────────────────────

function Stars({ n = 5, size = 15 }) {
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i < n ? '#E8C76A' : 'rgba(255,255,255,0.15)'}>
          <path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.1l1-5.8L3.5 9.2l5.9-.9L12 3Z" />
        </svg>
      ))}
    </div>
  )
}

// ── Equalizer bars ────────────────────────────────────────────────────────────

const EQ_HEIGHTS = [
  { min: 4,  max: 18, dur: '0.55s' },
  { min: 12, max: 6,  dur: '0.40s' },
  { min: 6,  max: 20, dur: '0.62s' },
  { min: 16, max: 4,  dur: '0.48s' },
  { min: 8,  max: 16, dur: '0.58s' },
]

function EqualizerBars({ color = '#E8C76A' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2.5, height: 20 }} aria-hidden="true">
      {EQ_HEIGHTS.map((b, i) => (
        <div
          key={i}
          className={`eq-bar eq-bar-${i + 1}`}
          style={{
            width: 3, borderRadius: 2, background: color,
            minHeight: b.min, animationDuration: b.dur,
          }}
        />
      ))}
    </div>
  )
}

// ── Custom audio player ───────────────────────────────────────────────────────

const CustomAudioPlayer = memo(function CustomAudioPlayer({
  src, id, playingId, onPlay, compact = false, dark = true,
}) {
  const audioRef  = useRef(null)
  const [playing,  setPlaying]  = useState(false)
  const [progress, setProgress] = useState(0)
  const [current,  setCurrent]  = useState(0)
  const [duration, setDuration] = useState(0)
  const [loaded,   setLoaded]   = useState(false)
  const [spinning, setSpinning] = useState(false)

  // Pause when another player takes over
  useEffect(() => {
    if (playingId !== id && playing && audioRef.current) {
      audioRef.current.pause()
      setPlaying(false)
    }
  }, [playingId, id, playing])

  function fmt(s) {
    if (!s || isNaN(s)) return '0:00'
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
  }

  function toggle() {
    const a = audioRef.current
    if (!a) return
    if (!loaded) {
      // First interaction: trigger load then play
      setSpinning(true)
      a.preload = 'metadata'
      a.load()
      const onReady = () => {
        setLoaded(true)
        setSpinning(false)
        a.play()
        setPlaying(true)
        onPlay(id)
        a.removeEventListener('canplay', onReady)
      }
      a.addEventListener('canplay', onReady)
      return
    }
    if (playing) {
      a.pause(); setPlaying(false)
    } else {
      a.play(); setPlaying(true); onPlay(id)
    }
  }

  function handleTimeUpdate() {
    const a = audioRef.current
    if (!a || !a.duration) return
    setCurrent(a.currentTime)
    setProgress((a.currentTime / a.duration) * 100)
  }

  function handleLoadedMeta() {
    setDuration(audioRef.current?.duration || 0)
  }

  function handleEnded() {
    setPlaying(false); setProgress(0); setCurrent(0)
    if (audioRef.current) audioRef.current.currentTime = 0
  }

  function seek(e) {
    const a = audioRef.current
    if (!a || !loaded || !a.duration) return
    const rect  = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    a.currentTime = Math.max(0, Math.min(1, ratio)) * a.duration
  }

  const bg     = dark ? 'rgba(255,255,255,0.06)' : 'rgba(124,58,237,0.07)'
  const border = dark ? 'rgba(255,255,255,0.10)' : 'rgba(124,58,237,0.15)'
  const txtCol = dark ? 'rgba(255,255,255,0.50)' : '#A09AB8'
  const barBg  = dark ? 'rgba(255,255,255,0.12)' : 'rgba(124,58,237,0.12)'
  const btnSz  = compact ? 36 : 44

  return (
    <div
      style={{
        background:           bg,
        border:               `1px solid ${border}`,
        borderRadius:         14,
        padding:              compact ? '10px 14px' : '12px 16px',
        backdropFilter:       'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="none"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMeta}
        onEnded={handleEnded}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

        {/* Play / Pause / Spinner */}
        <button
          onClick={toggle}
          aria-label={playing ? 'إيقاف مؤقت' : 'تشغيل التسجيل الصوتي'}
          style={{
            flexShrink: 0,
            width:      btnSz, height: btnSz,
            borderRadius: '50%',
            border:     'none',
            cursor:     'pointer',
            display:    'grid', placeItems: 'center',
            background: playing
              ? 'linear-gradient(135deg,#9b6cf0,#6D34D6)'
              : 'linear-gradient(135deg,#7C3AED,#5B21B6)',
            boxShadow: playing
              ? '0 6px 20px rgba(124,58,237,0.55)'
              : '0 4px 14px rgba(124,58,237,0.35)',
            transition: 'box-shadow 0.2s, transform 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
        >
          {spinning ? (
            <span
              style={{
                width: 18, height: 18, borderRadius: '50%',
                border: '2.5px solid rgba(255,255,255,0.28)',
                borderTopColor: '#fff',
                display: 'block', animation: 'audio-spin 0.8s linear infinite',
              }}
            />
          ) : playing ? (
            <svg width={compact ? 14 : 17} height={compact ? 14 : 17} viewBox="0 0 24 24" fill="#fff">
              <rect x="6" y="4" width="4" height="16" rx="1.5" /><rect x="14" y="4" width="4" height="16" rx="1.5" />
            </svg>
          ) : (
            <svg width={compact ? 14 : 17} height={compact ? 14 : 17} viewBox="0 0 24 24" fill="#fff">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Waveform / progress area */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
          {playing && !compact && <EqualizerBars color="#E8C76A" />}

          {/* Seek bar */}
          <div
            role="slider" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}
            aria-label="موضع التشغيل"
            onClick={seek}
            style={{
              height: 4, cursor: 'pointer', borderRadius: 4,
              background: barBg, position: 'relative', overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute', top: 0, right: 0,
                height: '100%', borderRadius: 4,
                width: `${100 - progress}%`,
                background: 'transparent',
              }}
            />
            <div
              style={{
                height: '100%', borderRadius: 4,
                width: `${progress}%`,
                background: 'linear-gradient(90deg,#9b6cf0,#E8C76A)',
                transition: 'width 0.15s linear',
              }}
            />
          </div>
        </div>

        {/* Time display */}
        <span
          dir="ltr"
          style={{
            flexShrink: 0, fontSize: compact ? 10 : 11,
            color: txtCol, fontFamily: 'monospace',
            letterSpacing: 0.5,
          }}
        >
          {fmt(current)} / {fmt(duration || 0)}
        </span>
      </div>
    </div>
  )
})

// ── Lightbox ──────────────────────────────────────────────────────────────────

function Lightbox({ src, alt, onClose }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      onClick={onClose}
      role="dialog" aria-modal="true" aria-label="عرض الصورة بالكامل"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.92)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, cursor: 'zoom-out',
      }}
    >
      <motion.img
        src={src}
        alt={alt || ''}
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.88, opacity: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 0.85, 0.22, 1] }}
        onClick={e => e.stopPropagation()}
        style={{
          maxHeight: '90vh', maxWidth: '90vw', width: 'auto',
          borderRadius: 20, cursor: 'default',
          boxShadow: '0 40px 80px rgba(0,0,0,0.8)',
          objectFit: 'contain',
        }}
      />

      {/* Close button */}
      <button
        onClick={onClose}
        aria-label="إغلاق"
        style={{
          position: 'absolute', top: 20, right: 20,
          width: 44, height: 44, borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.2)',
          background: 'rgba(255,255,255,0.08)',
          display: 'grid', placeItems: 'center',
          color: '#fff', fontSize: 20, cursor: 'pointer',
          backdropFilter: 'blur(8px)',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
      >
        ✕
      </button>
    </motion.div>
  )
}

// ── Avatar badge ──────────────────────────────────────────────────────────────

function AvatarBadge({ initial, size = 40, color = '#7C3AED' }) {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        background: `linear-gradient(135deg, ${color}40, ${color}20)`,
        border: `1.5px solid ${color}55`,
        display: 'grid', placeItems: 'center',
        fontFamily: 'Cairo', fontWeight: 800,
        fontSize: size * 0.4, color: '#fff',
      }}
    >
      {initial}
    </div>
  )
}

// ── Featured card ─────────────────────────────────────────────────────────────

function FeaturedCard({ data, playingId, onPlay, onImageClick }) {
  return (
    <motion.div
      {...fadeUp(0.15)}
      style={{
        borderRadius: 24,
        background:   'linear-gradient(145deg,rgba(50,20,100,0.9),rgba(20,8,50,0.95))',
        border:       '1px solid rgba(255,255,255,0.09)',
        overflow:     'hidden',
        boxShadow:    '0 32px 72px rgba(0,0,0,0.45)',
        height:       '100%',
        display:      'flex',
        flexDirection:'column',
      }}
    >
      {/* WhatsApp screenshot — click to zoom */}
      <div
        style={{ position: 'relative', cursor: 'zoom-in', overflow: 'hidden', flexShrink: 0 }}
        onClick={() => onImageClick(data.image, `محادثة ${data.name}`)}
        role="button" tabIndex={0}
        aria-label="فتح الصورة بالكامل"
        onKeyDown={e => e.key === 'Enter' && onImageClick(data.image, `محادثة ${data.name}`)}
      >
        <motion.img
          src={data.image}
          alt={`رسالة واتساب من ${data.name}`}
          loading="lazy"
          style={{
            width: '100%', height: 280, objectFit: 'cover', objectPosition: 'top',
            display: 'block', transition: 'transform 0.45s ease',
          }}
          whileHover={{ scale: 1.03 }}
          transition={{ duration: 0.45 }}
        />

        {/* Gradient overlay on image */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(20,8,50,0.9) 100%)' }} />

        {/* Zoom hint */}
        <div
          style={{
            position: 'absolute', top: 12, left: 12,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 8, padding: '5px 9px',
            fontSize: 11, color: 'rgba(255,255,255,0.7)',
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
            <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M11 8v6M8 11h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          تكبير
        </div>

        {/* WhatsApp badge */}
        <div
          style={{
            position: 'absolute', top: 12, right: 12,
            background: '#25D366', borderRadius: 8, padding: '4px 8px',
            fontSize: 11, fontWeight: 700, color: '#fff',
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="#fff">
            <path d="M21 12a9 9 0 1 1-8.53-8.97L14 5.5l-1.5 3.5s-1-1-2-.5c-2 1-2 4-2 4s0 2 2 3 3.5-.5 3.5-.5l1 2.5-2 .5A9.05 9.05 0 0 1 3 12" />
          </svg>
          واتساب حقيقي
        </div>
      </div>

      {/* Card body */}
      <div style={{ padding: '22px 24px 24px', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Name + achievement */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AvatarBadge initial={data.initial} size={44} color={data.color} />
            <div>
              <div style={{ color: '#fff', fontFamily: 'Cairo', fontWeight: 800, fontSize: 16 }}>{data.name}</div>
              <div style={{ color: 'rgba(255,255,255,0.50)', fontSize: 12, marginTop: 2 }}>{data.level}</div>
            </div>
          </div>
          <Stars n={data.rating} size={15} />
        </div>

        {/* Achievement badge */}
        <div
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(232,199,106,0.12)',
            border: '1px solid rgba(232,199,106,0.25)',
            borderRadius: 20, padding: '6px 14px', alignSelf: 'flex-start',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="#E8C76A">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#E8C76A' }}>{data.achievement}</span>
        </div>

        {/* Quote */}
        <blockquote
          style={{
            margin: 0, flex: 1,
            color: 'rgba(255,255,255,0.80)',
            fontSize: 15, lineHeight: 1.85, fontStyle: 'italic',
            borderRight: '2px solid rgba(155,108,240,0.45)',
            paddingRight: 14,
          }}
        >
          «{data.quote}»
        </blockquote>

        {/* Audio player */}
        <CustomAudioPlayer
          src={data.audio}
          id={data.id}
          playingId={playingId}
          onPlay={onPlay}
          dark={true}
        />

      </div>
    </motion.div>
  )
}

// ── Grid card ─────────────────────────────────────────────────────────────────

function GridCard({ data, playingId, onPlay, onImageClick, delay = 0 }) {
  return (
    <motion.div
      {...fadeUp(delay)}
      style={{
        borderRadius: 18,
        background:   'rgba(255,255,255,0.04)',
        border:       '1px solid rgba(255,255,255,0.08)',
        overflow:     'hidden',
        display:      'flex',
        gap:          0,
        transition:   'transform 0.32s cubic-bezier(0.2,0.7,0.2,1), box-shadow 0.32s',
      }}
      whileHover={{ y: -4, boxShadow: '0 22px 48px rgba(0,0,0,0.45)' }}
    >
      {/* Thumbnail — click to zoom */}
      <div
        style={{
          width: 120, flexShrink: 0, cursor: 'zoom-in', overflow: 'hidden',
          position: 'relative',
        }}
        onClick={() => onImageClick(data.image, `محادثة ${data.name}`)}
        role="button" tabIndex={0}
        aria-label="فتح الصورة بالكامل"
        onKeyDown={e => e.key === 'Enter' && onImageClick(data.image, `محادثة ${data.name}`)}
      >
        <motion.img
          src={data.image}
          alt={`رسالة واتساب من ${data.name}`}
          loading="lazy"
          style={{
            width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top',
            display: 'block',
          }}
          whileHover={{ scale: 1.06 }}
          transition={{ duration: 0.4 }}
        />
        {/* Gradient */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right,transparent 60%,rgba(20,8,50,0.8))' }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 9, minWidth: 0 }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <AvatarBadge initial={data.initial} size={34} color="#7C3AED" />
            <div style={{ minWidth: 0 }}>
              <div style={{ color: '#fff', fontFamily: 'Cairo', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{data.name}</div>
              <div style={{ color: 'rgba(255,255,255,0.40)', fontSize: 11, marginTop: 1 }}>{data.level}</div>
            </div>
          </div>
          <Stars n={data.rating} size={11} />
        </div>

        <p style={{ margin: 0, color: 'rgba(255,255,255,0.68)', fontSize: 13, lineHeight: 1.7, flex: 1 }}>
          «{data.quote}»
        </p>

        <CustomAudioPlayer src={data.audio} id={data.id} playingId={playingId} onPlay={onPlay} compact dark />

      </div>
    </motion.div>
  )
}

// ── Audio-only card ───────────────────────────────────────────────────────────

function AudioCard({ data, playingId, onPlay, delay = 0 }) {
  return (
    <motion.div
      {...fadeUp(delay)}
      style={{
        borderRadius: 20,
        background:   'linear-gradient(140deg,rgba(40,15,85,0.85),rgba(18,6,40,0.90))',
        border:       '1px solid rgba(255,255,255,0.08)',
        padding:      '22px 24px',
        display:      'flex', flexDirection: 'column', gap: 14,
        boxShadow:    '0 16px 40px rgba(0,0,0,0.28)',
      }}
      whileHover={{ y: -4, boxShadow: '0 24px 52px rgba(0,0,0,0.45)' }}
      transition={{ duration: 0.32 }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <AvatarBadge initial={data.initial} size={44} color={data.color} />
          <div>
            <div style={{ color: '#fff', fontFamily: 'Cairo', fontWeight: 800, fontSize: 15 }}>{data.name}</div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 2 }}>{data.level}</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <Stars n={data.rating} size={13} />
          <div style={{
            background: 'rgba(155,108,240,0.14)', border: '1px solid rgba(155,108,240,0.22)',
            borderRadius: 20, padding: '3px 9px', fontSize: 10, color: '#9b6cf0', fontWeight: 600,
          }}>
            تسجيل صوتي
          </div>
        </div>
      </div>

      {/* Quote */}
      <p style={{ margin: 0, color: 'rgba(255,255,255,0.72)', fontSize: 14, lineHeight: 1.8, fontStyle: 'italic' }}>
        «{data.quote}»
      </p>

      {/* Player */}
      <CustomAudioPlayer src={data.audio} id={data.id} playingId={playingId} onPlay={onPlay} dark />
    </motion.div>
  )
}

// ── Main section ──────────────────────────────────────────────────────────────

export default function TestimonialsSection() {
  const [playingId,  setPlayingId]  = useState(null)
  const [lightboxImg, setLightbox]  = useState(null)

  const onPlay = useCallback((id) => setPlayingId(id), [])
  const onImg  = useCallback((src, alt) => setLightbox({ src, alt }), [])
  const onClose = useCallback(() => setLightbox(null), [])

  return (
    <section
      id="testimonials"
      dir="rtl"
      style={{
        position: 'relative',
        background: 'radial-gradient(115% 130% at 20% 0%,#2a0e5e 0%,#1c0942 45%,#130430 100%)',
        padding:    'clamp(72px,8vw,108px) clamp(20px,5vw,68px)',
        overflow:   'hidden',
      }}
    >
      {/* Ambient glows */}
      <div aria-hidden="true" style={{ position: 'absolute', top: '-10%', right: '5%', width: 560, height: 560, borderRadius: '50%', background: 'radial-gradient(circle,rgba(124,58,237,0.18) 0%,transparent 70%)', filter: 'blur(72px)', pointerEvents: 'none' }} />
      <div aria-hidden="true" style={{ position: 'absolute', bottom: '-5%', left: '10%', width: 440, height: 440, borderRadius: '50%', background: 'radial-gradient(circle,rgba(212,175,55,0.10) 0%,transparent 70%)', filter: 'blur(64px)', pointerEvents: 'none' }} />

      <div style={{ maxWidth: 1340, margin: '0 auto', position: 'relative', zIndex: 1 }}>

        {/* ── Section header ── */}
        <motion.div {...fadeUp(0)} style={{ textAlign: 'center', marginBottom: 'clamp(40px,5vw,64px)' }}>

          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 18,
            background: 'rgba(155,108,240,0.12)', border: '1px solid rgba(155,108,240,0.22)',
            borderRadius: 30, padding: '7px 18px',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#9b6cf0">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <span style={{ color: '#9b6cf0', fontWeight: 600, fontSize: 14 }}>تجارب حقيقية</span>
          </div>

          <h2 style={{
            fontFamily: 'Cairo', fontWeight: 800, color: '#fff',
            fontSize: 'clamp(30px,4vw,50px)', lineHeight: 1.2, margin: '0 auto 16px',
            maxWidth: 680,
          }}>
            ماذا يقول طلابنا
            <span style={{ background: 'linear-gradient(120deg,#E8C76A,#D4AF37)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}> وأولياء الأمور؟</span>
          </h2>

          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 'clamp(15px,1.5vw,18px)', lineHeight: 1.85, maxWidth: 500, margin: '0 auto' }}>
            آلاف الطلاب بدأوا رحلتهم معنا...
            <br />
            وهذه بعض التجارب الحقيقية بأصواتهم ورسائلهم.
          </p>
        </motion.div>

        {/* ── Desktop: Featured (left) + Grid (right) ── */}
        <div className="testimonials-main-grid">

          {/* Featured card */}
          <div className="testimonials-featured">
            <FeaturedCard
              data={FEATURED}
              playingId={playingId}
              onPlay={onPlay}
              onImageClick={onImg}
            />
          </div>

          {/* Grid of 3 smaller cards */}
          <div className="testimonials-grid-col">
            {GRID_CARDS.map((card, i) => (
              <GridCard
                key={card.id}
                data={card}
                playingId={playingId}
                onPlay={onPlay}
                onImageClick={onImg}
                delay={0.18 + i * 0.10}
              />
            ))}
          </div>

        </div>

        {/* ── Audio-only cards row ── */}
        <div className="testimonials-audio-row">
          {AUDIO_CARDS.map((card, i) => (
            <AudioCard
              key={card.id}
              data={card}
              playingId={playingId}
              onPlay={onPlay}
              delay={0.25 + i * 0.12}
            />
          ))}
        </div>

        {/* ── Trust footer ── */}
        <motion.div {...fadeUp(0.35)} style={{ textAlign: 'center', marginTop: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'clamp(20px,3vw,40px)', flexWrap: 'wrap' }}>
          {[
            { icon: '🔒', text: 'محتوى موثّق حقيقي' },
            { icon: '🎙️', text: 'تسجيلات صوتية أصلية' },
            { icon: '📱', text: 'رسائل واتساب حقيقية' },
          ].map(({ icon, text }) => (
            <div
              key={text}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: 500,
              }}
            >
              <span style={{ fontSize: 16 }}>{icon}</span>
              {text}
            </div>
          ))}
        </motion.div>

      </div>

      {/* ── Lightbox ── */}
      <AnimatePresence>
        {lightboxImg && (
          <Lightbox src={lightboxImg.src} alt={lightboxImg.alt} onClose={onClose} />
        )}
      </AnimatePresence>

      {/* ── CSS — equalizer keyframes + layout ── */}
      <style>{`
        /* Equalizer bar animations */
        .eq-bar { animation-timing-function: ease-in-out; animation-iteration-count: infinite; animation-direction: alternate; }
        .eq-bar-1 { animation-name: eq1; }
        .eq-bar-2 { animation-name: eq2; }
        .eq-bar-3 { animation-name: eq3; }
        .eq-bar-4 { animation-name: eq4; }
        .eq-bar-5 { animation-name: eq5; }
        @keyframes eq1 { 0%{height:4px}  100%{height:18px} }
        @keyframes eq2 { 0%{height:14px} 100%{height:5px}  }
        @keyframes eq3 { 0%{height:7px}  100%{height:20px} }
        @keyframes eq4 { 0%{height:17px} 100%{height:4px}  }
        @keyframes eq5 { 0%{height:9px}  100%{height:15px} }
        @keyframes audio-spin { to { transform: rotate(360deg) } }

        /* Desktop: Featured left + grid right */
        .testimonials-main-grid {
          display: grid;
          grid-template-columns: 52% 1fr;
          gap: clamp(20px,2.4vw,32px);
          margin-bottom: clamp(20px,2.4vw,32px);
        }
        .testimonials-featured { display: flex; flex-direction: column; }
        .testimonials-grid-col { display: flex; flex-direction: column; gap: clamp(14px,1.6vw,20px); }

        /* Audio-only row */
        .testimonials-audio-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: clamp(16px,2vw,28px);
          margin-top: 0;
        }

        /* Mobile: single column, horizontal snap for grid */
        @media (max-width: 860px) {
          .testimonials-main-grid {
            grid-template-columns: 1fr;
          }
          .testimonials-grid-col {
            display: flex;
            flex-direction: row;
            overflow-x: auto;
            gap: 16px;
            padding-bottom: 8px;
            scroll-snap-type: x mandatory;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
          }
          .testimonials-grid-col::-webkit-scrollbar { display: none }
          .testimonials-grid-col > * {
            flex: 0 0 min(84vw,380px);
            scroll-snap-align: start;
          }
        }

        @media (max-width: 600px) {
          .testimonials-audio-row {
            grid-template-columns: 1fr;
          }
        }

        /* Respect reduced motion preference */
        @media (prefers-reduced-motion: reduce) {
          .eq-bar { animation: none !important; height: 8px !important; }
        }
      `}</style>
    </section>
  )
}
