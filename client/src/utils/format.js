export function formatNumber(n) {
  if (!n && n !== 0) return '0'
  return new Intl.NumberFormat('ar-SA').format(n)
}

export function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount)
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

export function scoreToGrade(score) {
  if (score >= 9) return { label: 'ممتاز', color: '#22c55e' }
  if (score >= 7) return { label: 'جيد جداً', color: '#7c3aed' }
  if (score >= 5) return { label: 'جيد', color: '#f59e0b' }
  if (score >= 3) return { label: 'مقبول', color: '#f97316' }
  return { label: 'ضعيف', color: '#ef4444' }
}
