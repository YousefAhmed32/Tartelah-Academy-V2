/**
 * TeachersSection — "تعرّف على معلمك قبل أن تبدأ رحلتك"
 * Interactive teacher showcase carousel + a standalone audio-introductions
 * showcase rendered once below the whole carousel (not per-card).
 *
 * Data: 7 male + 4 female teachers.
 * Real recordings (public/audio/recorder-1-*.mp3) belong to the 3 teachers
 * that own them; every other teacher has audio: null and is carousel-only.
 *
 * Carousel is driven by a framer-motion x motionValue (not native scrollLeft),
 * which sidesteps cross-browser RTL scroll-direction inconsistencies while still
 * giving native drag/touch feel via framer's built-in pan-gesture axis locking.
 */

import { useState, useRef, useEffect, useCallback, memo } from 'react'
import { Link } from 'react-router-dom'
import { motion, useMotionValue, useMotionValueEvent, animate, useReducedMotion } from 'framer-motion'
import { ROUTES } from '../../config/constants.js'
import { handleAvatarError } from '../../utils/teacherIdentity.js'

const ILLUSTRATED_AVATARS = ['/images/avter man.png', '/images/avter woman.png']
function fallbackAvatarFor(teacher) {
  return teacher.gender === 'female' ? '/images/avter woman.png' : '/images/avter man.png'
}

// ── Teacher data ──────────────────────────────────────────────────────────────

const TEACHERS = [
  { id: 1, name: 'د/ محمد صلاح', gender: 'male', img: '/images/teacher-1.png', cert: 'إجازة في حفص عن عاصم', rating: '4.9', audio: null },
  { id: 2, name: 'أ/ عبد الرحمان حسن', gender: 'male', img: '/images/teacher-2.png', cert: 'إجازة في حفص عن عاصم', rating: '5.0', audio: null },
  { id: 3, name: 'أ/ أحمد محمد', gender: 'male', img: '/images/teacher-3.png', cert: 'إجازة في شعبة عن عاصم', rating: '4.9', audio: null },
  { id: 4, name: 'أ/ أحمد خليفة', gender: 'male', img: '/images/teacher-4.png', cert: 'إجازة في ورش عن نافع', rating: '4.8', audio: null },
  { id: 5, name: 'أ/ أحمد العطار', gender: 'male', img: '/images/avter man.png', cert: 'إجازة في حفص عن عاصم', rating: '4.9', audio: '/audio/recorder-1-Ahmed Al-Atar.mp3' },
  { id: 6, name: 'أ/ رودينا أحمد', gender: 'male', img: '/images/avter woman.png', cert: 'إجازة في القراءات العشر', rating: '5.0', audio: '/audio/recorder-1-Rodina Ahmed.mp3' },
  { id: 7, name: 'أ/ سعدي محمود', gender: 'male', img: '/images/avter woman.png', cert: 'إجازة في ورش عن نافع', rating: '4.8', audio: '/audio/recorder-1-Saadi Mahmoud.mp3' },
  { id: 8, name: 'أ/ مريم عبد الله', gender: 'female', img: '/images/avter woman.png', cert: 'إجازة في حفص عن عاصم', rating: '4.9', audio: null },
  { id: 9, name: 'أ/ آية محمود', gender: 'female', img: '/images/avter woman.png', cert: 'إجازة في القراءات العشر', rating: '5.0', audio: null },
  { id: 10, name: 'أ/ سارة أحمد', gender: 'female', img: '/images/avter woman.png', cert: 'إجازة في حفص عن عاصم', rating: '4.8', audio: null },
  { id: 11, name: 'أ/ نور الهدى محمد', gender: 'female', img: '/images/avter woman.png', cert: 'إجازة في ورش عن نافع', rating: '4.9', audio: null },
]

const AUDIO_TEACHERS = TEACHERS.filter(t => t.audio)

// ── Icons ─────────────────────────────────────────────────────────────────────

function StarIcon({ size = 15, fill = '#E8C76A' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}>
      <path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.1l1-5.8L3.5 9.2l5.9-.9L12 3Z" />
    </svg>
  )
}

function ChevronIcon({ direction = 'left' }) {
  const d = direction === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d={d} stroke="#E8C76A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function WaveformIcon({ size = 10, color = '#e8ddff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="10" width="4" height="10" rx="1" fill={color} />
      <rect x="10" y="4" width="4" height="16" rx="1" fill={color} />
      <rect x="17" y="8" width="4" height="12" rx="1" fill={color} />
    </svg>
  )
}

// ── Teacher card (carousel — no audio controls here) ─────────────────────────

const TeacherCard = memo(function TeacherCard({ teacher, onJumpToAudio, setCardRef }) {
  const badgeLabel = teacher.gender === 'female' ? 'معلمة' : 'معلم'
  // The two illustrated fallback avatars are square badge art (a circular
  // ring baked into a transparent 1:1 PNG) — cropping them with `cover` to
  // fill a 3:4 portrait frame clips the ring's sides, so they're shown in
  // full via `contain` instead. Real uploaded/photographed portraits keep
  // `cover` so they fill the frame edge-to-edge as before.
  const isIllustrated = ILLUSTRATED_AVATARS.includes(teacher.img)
  return (
    <div ref={setCardRef} className="th-card">
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <img
          src={teacher.img}
          alt={`صورة ${badgeLabel} ${teacher.name}`}
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={(e) => handleAvatarError(e, { defaultAvatar: fallbackAvatarFor(teacher) })}
          style={{
            width: '100%', aspectRatio: '3 / 4',
            objectFit: isIllustrated ? 'contain' : 'cover',
            objectPosition: isIllustrated ? 'center center' : 'center top',
            background: isIllustrated ? '#1d0c40' : undefined,
            display: 'block', userSelect: 'none', WebkitUserDrag: 'none', pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute', top: 10, insetInlineEnd: 10,
            background: 'rgba(20,8,45,0.72)', backdropFilter: 'blur(6px)',
            border: '1px solid rgba(232,199,106,0.35)', borderRadius: 20,
            padding: '4px 10px', fontSize: 11, fontWeight: 700, color: '#E8C76A',
          }}
        >
          {badgeLabel}
        </div>
        {teacher.audio && (
          <button
            type="button"
            onClick={() => onJumpToAudio(teacher.id)}
            aria-label={`الاستماع إلى التعريف الصوتي لـ${teacher.name}`}
            className="th-audio-badge"
            style={{
              position: 'absolute', top: 10, insetInlineStart: 10,
              display: 'flex', alignItems: 'center', gap: 4,
              background: 'rgba(124,58,237,0.32)', backdropFilter: 'blur(6px)',
              border: '1px solid rgba(155,108,240,0.45)', borderRadius: 20,
              padding: '4px 9px', fontSize: 10.5, fontWeight: 700, color: '#e8ddff',
              whiteSpace: 'nowrap', cursor: 'pointer',
            }}
          >
            <WaveformIcon />
            تعريف صوتي
          </button>
        )}
      </div>

      <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ color: '#fff', fontFamily: 'Cairo', fontWeight: 800, fontSize: 16.5 }}>{teacher.name}</div>
        <div style={{ color: '#b6a6d8', fontSize: 13 }}>{teacher.cert}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <StarIcon />
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{teacher.rating}</span>
        </div>
      </div>
    </div>
  )
})

// ── Standalone audio introduction card (used only in the showcase below) ─────

const AudioIntroductionCard = memo(function AudioIntroductionCard({ teacher, playingId, onPlay, highlighted }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [errored, setErrored] = useState(false)

  // Another card started playing — pause this one.
  useEffect(() => {
    if (playingId !== teacher.id && playing) {
      audioRef.current?.pause()
      setPlaying(false)
    }
  }, [playingId, teacher.id, playing])

  // Stop playback if the card unmounts (e.g. navigating away from the page).
  useEffect(() => () => { audioRef.current?.pause() }, [])

  function fmt(s) {
    if (!s || Number.isNaN(s)) return '0:00'
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
  }

  function toggle() {
    const a = audioRef.current
    if (!a || errored) return
    if (playing) {
      a.pause()
      setPlaying(false)
    } else {
      const p = a.play()
      if (p && typeof p.then === 'function') {
        p.then(() => { setPlaying(true); onPlay(teacher.id) }).catch(() => setErrored(true))
      } else {
        setPlaying(true); onPlay(teacher.id)
      }
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

  function handleError() { setErrored(true); setPlaying(false) }

  function seek(e) {
    const a = audioRef.current
    if (!a || !a.duration || errored) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    a.currentTime = Math.max(0, Math.min(1, ratio)) * a.duration
  }

  const badgeLabel = teacher.gender === 'female' ? 'معلمة' : 'معلم'

  return (
    <div
      id={`audio-intro-${teacher.id}`}
      className={`th-audio-intro-card${highlighted ? ' th-audio-intro-card--highlight' : ''}`}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <img
          src={teacher.img}
          alt={`صورة ${badgeLabel} ${teacher.name}`}
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={(e) => handleAvatarError(e, { defaultAvatar: fallbackAvatarFor(teacher) })}
          style={{
            width: 54, height: 54, borderRadius: '50%', objectFit: 'cover', flexShrink: 0,
            border: '1.5px solid rgba(232,199,106,.35)', userSelect: 'none', WebkitUserDrag: 'none',
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#fff', fontFamily: 'Cairo', fontWeight: 800, fontSize: 15 }}>{teacher.name}</div>
          <div style={{ color: '#b6a6d8', fontSize: 12, marginTop: 2 }}>{teacher.cert}</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 5 }}>
            <WaveformIcon size={9} color="#c9b6f2" />
            <span style={{ fontSize: 10.5, fontWeight: 700, color: '#c9b6f2' }}>تعريف صوتي</span>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
        <audio
          ref={audioRef}
          src={teacher.audio}
          preload="metadata"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMeta}
          onEnded={handleEnded}
          onError={handleError}
        />

        <button
          type="button"
          onClick={toggle}
          disabled={errored}
          aria-label={playing ? 'إيقاف تعريف المعلم مؤقتاً' : 'تشغيل تعريف المعلم الصوتي'}
          style={{
            flexShrink: 0,
            width: 36, height: 36,
            borderRadius: '50%',
            border: 'none',
            cursor: errored ? 'not-allowed' : 'pointer',
            opacity: errored ? 0.45 : 1,
            display: 'grid', placeItems: 'center',
            background: playing ? 'linear-gradient(135deg,#E8C76A,#D4AF37)' : 'linear-gradient(135deg,#7C3AED,#5B21B6)',
            boxShadow: playing ? '0 4px 14px rgba(212,175,55,0.45)' : '0 4px 12px rgba(124,58,237,0.35)',
            transition: 'transform .2s, box-shadow .2s',
          }}
          onMouseEnter={e => { if (!errored) e.currentTarget.style.transform = 'scale(1.08)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
        >
          {playing ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#3a2200"><rect x="6" y="4" width="4" height="16" rx="1.5" /><rect x="14" y="4" width="4" height="16" rx="1.5" /></svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z" /></svg>
          )}
        </button>

        <div
          role="slider"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          aria-label="موضع تشغيل التعريف الصوتي"
          onClick={seek}
          style={{ flex: 1, minWidth: 0, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.12)', position: 'relative', overflow: 'hidden', cursor: errored ? 'default' : 'pointer' }}
        >
          <div style={{ height: '100%', borderRadius: 4, width: `${progress}%`, background: 'linear-gradient(90deg,#9b6cf0,#E8C76A)', transition: 'width .15s linear' }} />
        </div>

        <span dir="ltr" style={{ flexShrink: 0, fontSize: 10.5, color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>
          {errored ? '—' : `${fmt(current)} / ${fmt(duration)}`}
        </span>
      </div>
    </div>
  )
})

// ── Standalone audio showcase — rendered ONCE below the whole carousel ───────

function TeacherAudioShowcase({ playingId, onPlay, highlightedId }) {
  if (AUDIO_TEACHERS.length === 0) return null
  return (
    <div className="th-audio-showcase">
      <div aria-hidden="true" className="th-audio-divider" />

      <div style={{ textAlign: 'center', marginBottom: 'clamp(28px,3.4vw,40px)' }}>
        <div
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 14,
            background: 'rgba(232,199,106,0.10)', border: '1px solid rgba(232,199,106,0.22)',
            borderRadius: 30, padding: '6px 16px',
          }}
        >
          <WaveformIcon size={12} color="#E8C76A" />
          <span style={{ color: '#E8C76A', fontWeight: 700, fontSize: 13.5 }}>أصوات من نخبة معلمينا</span>
        </div>

        <h3
          style={{
            fontWeight: 800, fontSize: 'clamp(22px,2.6vw,32px)', lineHeight: 1.3,
            color: '#fff', fontFamily: 'Cairo', margin: '0 auto 10px', maxWidth: 560,
          }}
        >
          تعرّف على معلمك قبل أن تبدأ
        </h3>

        <p style={{ color: '#c4b6e0', fontSize: 'clamp(13.5px,1.3vw,15.5px)', lineHeight: 1.8, maxWidth: 540, margin: '0 auto' }}>
          استمع إلى نبذة صوتية قصيرة من بعض معلمينا، وتعرّف على أسلوبهم وخبراتهم قبل بدء رحلتك التعليمية.
        </p>
      </div>

      <div className="th-audio-grid">
        {AUDIO_TEACHERS.map(teacher => (
          <AudioIntroductionCard
            key={teacher.id}
            teacher={teacher}
            playingId={playingId}
            onPlay={onPlay}
            highlighted={highlightedId === teacher.id}
          />
        ))}
      </div>
    </div>
  )
}

// ── Main section ──────────────────────────────────────────────────────────────

export default function TeachersSection() {
  const viewportRef = useRef(null)
  const trackRef = useRef(null)
  const cardRefs = useRef([])
  const stepRef = useRef(280)
  const maxXRef = useRef(0)
  const highlightTimeoutRef = useRef(null)

  const [playingId, setPlayingId] = useState(null)
  const [maxX, setMaxX] = useState(0)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [highlightedId, setHighlightedId] = useState(null)

  const prefersReducedMotion = useReducedMotion()
  const x = useMotionValue(0)

  const onPlay = useCallback((id) => setPlayingId(id), [])

  const onJumpToAudio = useCallback((teacherId) => {
    const el = document.getElementById(`audio-intro-${teacherId}`)
    if (el) el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' })
    setHighlightedId(teacherId)
    window.clearTimeout(highlightTimeoutRef.current)
    highlightTimeoutRef.current = window.setTimeout(() => setHighlightedId(null), 1600)
  }, [prefersReducedMotion])

  useEffect(() => () => window.clearTimeout(highlightTimeoutRef.current), [])

  // In this RTL layout, card 0 rests flush against the viewport's right edge
  // and overflow extends left (negative x in the DOM), off-screen. So x=0 is
  // "start" (first teachers visible) and x must move POSITIVE to slide the
  // hidden-left cards into view — the reverse of a typical LTR carousel.
  const measure = useCallback(() => {
    const viewport = viewportRef.current
    const track = trackRef.current
    const firstCard = cardRefs.current[0]
    if (!viewport || !track || !firstCard) return

    const cardWidth = firstCard.getBoundingClientRect().width
    const trackStyles = window.getComputedStyle(track)
    const gap = parseFloat(trackStyles.columnGap || trackStyles.gap) || 0
    stepRef.current = cardWidth + gap

    const newMaxX = Math.max(0, track.scrollWidth - viewport.clientWidth)
    maxXRef.current = newMaxX
    setMaxX(newMaxX)

    const cur = x.get()
    if (cur > newMaxX) animate(x, newMaxX, { duration: 0 })
    else if (cur < 0) animate(x, 0, { duration: 0 })
  }, [x])

  useEffect(() => {
    measure()
    const viewport = viewportRef.current
    if (!viewport || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => measure())
    ro.observe(viewport)
    return () => ro.disconnect()
  }, [measure])

  useMotionValueEvent(x, 'change', (v) => {
    setAtStart(v <= 1)
    setAtEnd(v >= maxXRef.current - 1)
  })

  const snapTo = useCallback((target) => {
    const clamped = Math.max(0, Math.min(maxXRef.current, target))
    animate(x, clamped, prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 320, damping: 32, mass: 0.6 })
  }, [x, prefersReducedMotion])

  function goPrev() { snapTo(x.get() - stepRef.current) }
  function goNext() { snapTo(x.get() + stepRef.current) }

  function handleDragEnd(_e, info) {
    setIsDragging(false)
    const step = stepRef.current || 280
    let target = x.get()
    const velocity = info.velocity.x
    if (Math.abs(velocity) > 300) {
      target += velocity > 0 ? step : -step
    }
    const snapped = Math.round(target / step) * step
    snapTo(snapped)
  }

  function handleWheel(e) {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return // vertical intent — let the page scroll
    e.preventDefault()
    const next = Math.max(0, Math.min(maxXRef.current, x.get() - e.deltaX))
    x.set(next)
  }

  return (
    <section
      id="teachers"
      dir="rtl"
      style={{
        position: 'relative',
        background: 'radial-gradient(120% 90% at 100% 0%,#3a1273 0%,#1c0942 45%,#140530 100%)',
        padding: 'clamp(64px,8vw,108px) clamp(20px,5vw,68px)',
        overflow: 'hidden',
      }}
    >
      <div style={{ maxWidth: 1340, margin: '0 auto', position: 'relative', zIndex: 1 }}>

        {/* ── Header ── */}
        <div style={{ textAlign: 'center', marginBottom: 'clamp(40px,5vw,60px)' }}>
          <div
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 18,
              background: 'rgba(155,108,240,0.12)', border: '1px solid rgba(155,108,240,0.22)',
              borderRadius: 30, padding: '7px 18px',
            }}
          >
            <StarIcon size={13} fill="#9b6cf0" />
            <span style={{ color: '#9b6cf0', fontWeight: 700, fontSize: 14 }}>نخبة من أهل القرآن</span>
          </div>

          <h2
            style={{
              fontWeight: 800, fontSize: 'clamp(30px,4vw,50px)', lineHeight: 1.25,
              color: '#fff', fontFamily: 'Cairo', margin: '0 auto 18px', maxWidth: 640,
            }}
          >
            تعرّف على معلمك
            <br />
            قبل أن تبدأ رحلتك
          </h2>

          <p style={{ color: '#c4b6e0', fontSize: 'clamp(15px,1.5vw,17.5px)', lineHeight: 1.9, maxWidth: 620, margin: '0 auto' }}>
            نخبة من المعلمين والمعلمات المتخصصين في القراءات والتجويد وعلوم القرآن، استمع إلى تعريف بعض معلمينا واختر من يناسب رحلتك نحو الإتقان.
          </p>

          <Link
            to={ROUTES.TEACHERS}
            style={{
              cursor: 'pointer', marginTop: 26, display: 'inline-block',
              fontFamily: 'Tajawal', fontWeight: 700, fontSize: 16, color: '#fff',
              background: 'transparent', border: '1.5px solid rgba(232,199,106,.55)',
              borderRadius: 34, padding: '13px 30px', textDecoration: 'none',
              transition: 'transform .25s, border-color .25s, background .25s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = '#E8C76A'; e.currentTarget.style.background = 'rgba(232,199,106,.08)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = 'rgba(232,199,106,.55)'; e.currentTarget.style.background = 'transparent' }}
          >
            عرض جميع المعلمين
          </Link>
        </div>

        {/* ── Carousel ── */}
        <div
          ref={viewportRef}
          role="region"
          aria-roledescription="carousel"
          aria-label="عرض المعلمين"
          style={{ overflow: 'hidden', touchAction: 'pan-y', cursor: isDragging ? 'grabbing' : 'grab' }}
          onWheel={handleWheel}
        >
          <motion.div
            ref={trackRef}
            className="th-track"
            drag="x"
            dragConstraints={{ left: 0, right: maxX }}
            dragElastic={0.06}
            dragMomentum={false}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={handleDragEnd}
            style={{ x, display: 'flex', flexWrap: 'nowrap', userSelect: isDragging ? 'none' : 'auto' }}
          >
            {TEACHERS.map((teacher, i) => (
              <TeacherCard
                key={teacher.id}
                teacher={teacher}
                onJumpToAudio={onJumpToAudio}
                setCardRef={(el) => { cardRefs.current[i] = el }}
              />
            ))}
          </motion.div>
        </div>

        {/* ── Nav arrows ── */}
        <div dir="ltr" style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 22 }}>
          <button
            type="button"
            onClick={goNext}
            disabled={atEnd}
            aria-label="المعلم التالي"
            className="th-arrow"
            style={{ opacity: atEnd ? 0.35 : 1, cursor: atEnd ? 'not-allowed' : 'pointer' }}
            onMouseEnter={e => { if (!atEnd) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = '#E8C76A' } }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = 'rgba(232,199,106,.4)' }}
          >
            <ChevronIcon direction="left" />
          </button>
          <button
            type="button"
            onClick={goPrev}
            disabled={atStart}
            aria-label="المعلم السابق"
            className="th-arrow"
            style={{ opacity: atStart ? 0.35 : 1, cursor: atStart ? 'not-allowed' : 'pointer' }}
            onMouseEnter={e => { if (!atStart) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = '#E8C76A' } }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = 'rgba(232,199,106,.4)' }}
          >
            <ChevronIcon direction="right" />
          </button>
        </div>

        {/* ── Standalone audio introductions showcase (once, below everything above) ── */}
        <TeacherAudioShowcase playingId={playingId} onPlay={onPlay} highlightedId={highlightedId} />
      </div>

      {/* ── CSS ── */}
      <style>{`
        .th-track { gap: 22px; }

        .th-card {
          flex: 0 0 23%;
          background: #1d0c40;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 20px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: 0 12px 30px rgba(0,0,0,.18);
          transition: transform .35s cubic-bezier(.2,.7,.2,1), box-shadow .35s;
        }
        .th-card:hover { transform: translateY(-8px); }

        .th-audio-badge:focus-visible {
          outline: 2px solid #E8C76A;
          outline-offset: 2px;
        }

        .th-arrow {
          width: 46px; height: 46px; border-radius: 50%;
          border: 1px solid rgba(232,199,106,.4);
          background: transparent;
          display: grid; place-items: center;
          transition: transform .25s, border-color .25s, background .25s;
        }
        .th-arrow:focus-visible {
          outline: 2px solid #E8C76A;
          outline-offset: 2px;
        }

        .th-audio-showcase { margin-top: clamp(32px,6vw,72px); }

        .th-audio-divider {
          height: 1px;
          margin-bottom: clamp(28px,4vw,44px);
          background: linear-gradient(90deg, transparent, rgba(232,199,106,0.4), transparent);
          box-shadow: 0 0 18px rgba(232,199,106,0.18);
        }

        .th-audio-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 18px;
        }

        .th-audio-intro-card {
          background: linear-gradient(155deg, rgba(58,18,115,0.42), rgba(15,6,35,0.55));
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(232,199,106,0.18);
          border-radius: 18px;
          box-shadow: 0 10px 24px rgba(0,0,0,0.25);
          padding: 16px 18px;
          transition: border-color .4s, box-shadow .4s;
        }
        .th-audio-intro-card--highlight {
          border-color: rgba(232,199,106,0.75);
          box-shadow: 0 0 0 3px rgba(232,199,106,0.22), 0 10px 26px rgba(0,0,0,0.3);
        }

        @media (min-width: 640px) {
          .th-audio-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (min-width: 1024px) {
          .th-audio-grid { grid-template-columns: repeat(3, 1fr); }
        }

        @media (max-width: 1279px) { .th-card { flex: 0 0 31%; } }
        @media (max-width: 1023px) { .th-card { flex: 0 0 46%; } }
        @media (max-width: 639px) {
          .th-card { flex: 0 0 84%; }
          .th-track { gap: 14px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .th-card, .th-card:hover { transition: none !important; transform: none !important; }
          .th-audio-intro-card { transition: none !important; }
        }
      `}</style>
    </section>
  )
}
