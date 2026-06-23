export function formatDateAr(date) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatDateTimeAr(date) {
  if (!date) return ''
  return new Date(date).toLocaleString('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatTimeAr(date) {
  if (!date) return ''
  return new Date(date).toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function isToday(date) {
  const d = new Date(date)
  const today = new Date()
  return d.toDateString() === today.toDateString()
}

export function isFuture(date) {
  return new Date(date) > new Date()
}

export function isPast(date) {
  return new Date(date) < new Date()
}

export function timeFromNow(date) {
  const now = new Date()
  const d = new Date(date)
  const diff = d - now
  const abs = Math.abs(diff)
  const mins = Math.floor(abs / 60000)
  const hours = Math.floor(abs / 3600000)
  const days = Math.floor(abs / 86400000)
  const past = diff < 0

  if (mins < 1) return 'الآن'
  if (mins < 60) return past ? `منذ ${mins} دقيقة` : `خلال ${mins} دقيقة`
  if (hours < 24) return past ? `منذ ${hours} ساعة` : `خلال ${hours} ساعة`
  return past ? `منذ ${days} يوم` : `خلال ${days} يوم`
}

export function getDayNameAr(date) {
  return new Date(date).toLocaleDateString('ar-SA', { weekday: 'long' })
}

export function formatShortDate(date) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('ar-SA', {
    month: 'short',
    day: 'numeric',
  })
}
