export function formatNumber(n) {
  if (!n && n !== 0) return '0'
  // Western digits — see formatCurrency's numberingSystem note below.
  return new Intl.NumberFormat('ar-EG', { numberingSystem: 'latn' }).format(n)
}

// Intl wraps currency output in invisible LRM/RLM marks (U+200E/U+200F) for
// bidi correctness, but some webfonts (e.g. Cairo) mis-shape glyphs adjacent
// to them, causing visible glyph overlap. Layout direction is set explicitly
// via `dir` where this is rendered, so the marks are safe to strip.
const BIDI_MARKS_RE = new RegExp(
  `[${String.fromCharCode(0x200e)}${String.fromCharCode(0x200f)}]`, 'g'
)

export function formatCurrency(amount, currency = 'EGP') {
  const formatted = new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    // Cairo (this app's heading font) has a broken glyph for the
    // Arabic-Indic zero digit that renders as overlapping garbage whenever
    // an amount contains a zero. Western digits sidestep the font bug and
    // are common practice for monetary amounts in Arabic UIs regardless.
    numberingSystem: 'latn',
  }).format(amount)
  return formatted.replace(BIDI_MARKS_RE, '')
}

export function getInitials(firstName = '', lastName = '') {
  return `${(firstName[0] || '').toUpperCase()}${(lastName[0] || '').toUpperCase()}`
}

export function truncate(str, max = 80) {
  if (!str) return ''
  return str.length > max ? `${str.slice(0, max)}…` : str
}

export function capitalizeFirst(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// Guards every `.map()`/`.filter()` call site against a non-array API response
// (missing endpoint, unexpected error shape, network hiccup) so a bad payload
// degrades to an empty list instead of throwing "x.map is not a function".
export function toArray(value) {
  return Array.isArray(value) ? value : []
}

export function scoreToGrade(score) {
  if (score >= 9) return { label: 'ممتاز', color: '#22c55e' }
  if (score >= 7) return { label: 'جيد جداً', color: '#7c3aed' }
  if (score >= 5) return { label: 'جيد', color: '#f59e0b' }
  if (score >= 3) return { label: 'مقبول', color: '#f97316' }
  return { label: 'ضعيف', color: '#ef4444' }
}
