import { useRef, useState, useEffect } from 'react'

// Real, functioning recitation player — public/audio/fatiha.mp3 is an actual
// Quran recitation asset, so this is wired to genuine play/pause/progress
// state rather than a decorative fake "listen now" button. No autoplay; audio
// only ever starts from an explicit user click.
export default function RecitationWidget({ className = '' }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [errored, setErrored] = useState(false)

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
        p.then(() => setPlaying(true)).catch(() => setErrored(true))
      } else {
        setPlaying(true)
      }
    }
  }

  function handleTimeUpdate() {
    const a = audioRef.current
    if (!a || !a.duration) return
    setCurrent(a.currentTime)
    setProgress((a.currentTime / a.duration) * 100)
  }

  function handleEnded() {
    setPlaying(false); setProgress(0); setCurrent(0)
    if (audioRef.current) audioRef.current.currentTime = 0
  }

  function seek(e) {
    const a = audioRef.current
    if (!a || !a.duration || errored) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    a.currentTime = Math.max(0, Math.min(1, ratio)) * a.duration
  }

  return (
    <div className={`hero-recitation ${className}`}>
      <audio
        ref={audioRef}
        src="/audio/fatiha.mp3"
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={handleEnded}
        onError={() => setErrored(true)}
      />

      <button
        type="button"
        onClick={toggle}
        disabled={errored}
        aria-label={playing ? 'إيقاف تلاوة سورة الفاتحة مؤقتاً' : 'تشغيل تلاوة سورة الفاتحة'}
        className="hero-recitation__play"
      >
        {playing ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#2a1500" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx="1.5" /><rect x="14" y="4" width="4" height="16" rx="1.5" /></svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#2a1500" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
        )}
      </button>

      <div className="hero-recitation__body">
        <div className="hero-recitation__label">{errored ? 'التسجيل غير متاح حالياً' : 'استمع الآن'}</div>
        <div className="hero-recitation__title">سورة الفاتحة</div>
        <div
          role="slider"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          aria-label="موضع تشغيل التلاوة"
          onClick={seek}
          className="hero-recitation__track"
        >
          <div className="hero-recitation__fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <span dir="ltr" className="hero-recitation__time">{fmt(current)} / {fmt(duration)}</span>
    </div>
  )
}
