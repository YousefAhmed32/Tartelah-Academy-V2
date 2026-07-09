// Prevents two audio/video tracks from ever being audible at once. Generic
// over the DOM rather than coupled to any specific widget, so it keeps
// working if new <audio>/<video> elements (e.g. a re-enabled RecitationWidget)
// show up on the page later.
export function pauseOtherMedia(exceptEl) {
  if (typeof document === 'undefined') return
  document.querySelectorAll('audio, video').forEach((el) => {
    if (el !== exceptEl && !el.paused) {
      try { el.pause() } catch { /* ignore */ }
    }
  })
}
