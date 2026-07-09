import { useEffect } from 'react'
import { pauseOtherMedia } from '../utils/mediaCoordinator.js'

// Browsers only grant audio.play() from an event flagged as "user
// activation" — pointerdown/mousedown/touchstart/keydown/click reliably
// carry that flag; a bare wheel/scroll does not in most engines. So this
// listens on BOTH tiers: the discrete-gesture tier (which almost always
// succeeds) and the wheel/scroll tier (which is attempted anyway, since some
// browsers do allow it, and a rejection there just waits for the next
// event instead of failing silently forever). Deliberately not persisted to
// localStorage: a refresh is a new document, so it must wait for a fresh
// gesture again.
//
// Listens on `window` (capture phase for the discrete tier) rather than any
// single element, since the user may interact anywhere on the homepage —
// including scrolling, which has no single "container" element here (the
// homepage scrolls the document itself; nothing in this app wraps it in an
// overflow:auto box).
const DISCRETE_GESTURE_EVENTS = ['pointerdown', 'mousedown', 'touchstart', 'keydown', 'click']
const SCROLL_GESTURE_EVENTS = ['wheel', 'scroll']

const DEBUG = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV

function log(...args) {
  if (DEBUG) console.debug('[HomepageAudio]', ...args)
}

export default function useHomepageInteractionAudio(src, { volume = 0.7, loop = false } = {}) {
  useEffect(() => {
    const audio = new Audio(src)
    audio.preload = 'auto'
    audio.loop = loop
    audio.volume = volume

    let removed = false
    let attemptInProgress = false
    let played = false

    function removeListeners() {
      if (removed) return
      removed = true
      DISCRETE_GESTURE_EVENTS.forEach((evt) => window.removeEventListener(evt, handleInteraction, { capture: true }))
      SCROLL_GESTURE_EVENTS.forEach((evt) => window.removeEventListener(evt, handleInteraction))
    }

    // Guards against: several events firing from one physical gesture
    // (pointerdown -> touchstart -> scroll, or pointerdown -> mousedown ->
    // click), and overlapping play() attempts.
    function handleInteraction(evt) {
      if (played || attemptInProgress) return
      attemptInProgress = true
      log('interaction:', evt.type)

      pauseOtherMedia(audio)
      try {
        audio.currentTime = 0
      } catch { /* not ready yet — play() still starts from 0 */ }

      log('play attempt')
      const playPromise = audio.play()

      if (playPromise && typeof playPromise.then === 'function') {
        playPromise
          .then(() => {
            log('play success')
            played = true
            attemptInProgress = false
            removeListeners()
          })
          .catch((err) => {
            // Rejected (autoplay policy on a non-activating event like
            // wheel/scroll, transient error, etc.) — do NOT mark as played
            // and keep every listener active so the next valid gesture
            // (including the very next discrete one) retries from scratch.
            log('play rejected:', err && err.name)
            attemptInProgress = false
          })
      } else {
        played = true
        attemptInProgress = false
        removeListeners()
      }
    }

    // Discrete tier — capture phase so a descendant calling
    // stopPropagation() on the bubble phase can't swallow the gesture
    // before it reaches this window-level listener.
    DISCRETE_GESTURE_EVENTS.forEach((evt) => window.addEventListener(evt, handleInteraction, { capture: true, passive: true }))
    // Scroll tier — attempted too; browsers that reject it simply fall
    // through to a retry on the next event above.
    SCROLL_GESTURE_EVENTS.forEach((evt) => window.addEventListener(evt, handleInteraction, { passive: true }))

    return () => {
      removeListeners()
      audio.pause()
      audio.currentTime = 0
      audio.src = ''
    }
  }, [src, volume, loop])
}
