/**
 * Date Preset Resolver Utility
 * Computes precise date ranges and their matching baseline comparison periods
 * for analytics, operations, and audit reporting.
 */

function resolveDatePreset(preset, customStart, customEnd) {
  const now = new Date()

  // 1. Custom range
  if (preset === 'custom' || (customStart && customEnd)) {
    const start = new Date(customStart)
    start.setHours(0, 0, 0, 0)
    const end = new Date(customEnd)
    end.setHours(23, 59, 59, 999)

    // Safeguard invalid dates
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return resolveDatePreset('this_month')
    }

    const durationMs = end.getTime() - start.getTime() + 1
    const compEnd = new Date(start.getTime() - 1)
    const compStart = new Date(compEnd.getTime() - durationMs + 1)

    return {
      preset: 'custom',
      label: 'فترة مخصصة',
      start,
      end,
      compStart,
      compEnd,
    }
  }

  // 2. Today
  if (preset === 'today') {
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    const end = new Date(now)
    end.setHours(23, 59, 59, 999)

    const compStart = new Date(start)
    compStart.setDate(compStart.getDate() - 1)
    const compEnd = new Date(end)
    compEnd.setDate(compEnd.getDate() - 1)

    return {
      preset: 'today',
      label: 'اليوم',
      start,
      end,
      compStart,
      compEnd,
    }
  }

  // 3. Yesterday
  if (preset === 'yesterday') {
    const start = new Date(now)
    start.setDate(start.getDate() - 1)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setHours(23, 59, 59, 999)

    const compStart = new Date(start)
    compStart.setDate(compStart.getDate() - 1)
    const compEnd = new Date(end)
    compEnd.setDate(compEnd.getDate() - 1)

    return {
      preset: 'yesterday',
      label: 'أمس',
      start,
      end,
      compStart,
      compEnd,
    }
  }

  // 4. This Week (Starts Saturday, standard 7 days window)
  if (preset === 'this_week') {
    const day = now.getDay() // 0 = Sunday, 6 = Saturday
    const diffToSat = (day + 1) % 7 // Saturday -> 0, Sunday -> 1, etc.
    const start = new Date(now)
    start.setDate(now.getDate() - diffToSat)
    start.setHours(0, 0, 0, 0)

    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    end.setHours(23, 59, 59, 999)

    const compStart = new Date(start)
    compStart.setDate(start.getDate() - 7)
    const compEnd = new Date(end)
    compEnd.setDate(end.getDate() - 7)

    return {
      preset: 'this_week',
      label: 'هذا الأسبوع',
      start,
      end,
      compStart,
      compEnd,
    }
  }

  // 5. Last Month
  if (preset === 'last_month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0)
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)

    const compStart = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0, 0)
    const compEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59, 999)

    return {
      preset: 'last_month',
      label: 'الشهر السابق',
      start,
      end,
      compStart,
      compEnd,
    }
  }

  // 6. Default: This Month
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

  const compStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0)
  const compEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)

  return {
    preset: 'this_month',
    label: 'هذا الشهر',
    start,
    end,
    compStart,
    compEnd,
  }
}

module.exports = {
  resolveDatePreset,
}
