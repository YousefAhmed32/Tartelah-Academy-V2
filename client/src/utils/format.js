export function formatNumber(n) {
  if (!n && n !== 0) return '0'
  // Western digits — see formatCurrency's numberingSystem note below.
  return new Intl.NumberFormat('ar-EG', { numberingSystem: 'latn' }).format(n)
}

// Pricing is communicated manually (WhatsApp/sales) until currency is
// finalized, so this intentionally returns a bare number — no currency
// symbol or label — regardless of the `currency` argument callers still pass.
export function formatCurrency(amount) {
  return formatNumber(amount)
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
