/**
 * UI UX PRO MAX — Intelligent Session Title & Numbering Utilities
 * Ensures sessions are always presented with the student's name and clear monthly sequence badges,
 * eliminating raw, uninformative titles like "حصة 1" across all cards, tables, and views.
 */

export function formatSessionTitle(session) {
  if (!session) return 'حصة دراسية'
  let rawTitle = (session.titleAr || session.title || '').trim()

  // 1. Extract student name if populated on studentId
  const student = session.studentId
  let studentName = student && typeof student === 'object' && student.firstNameAr
    ? `${student.firstNameAr} ${student.lastNameAr || ''}`.trim()
    : (student?.name || '')

  // 2. Extract quota: "(X من Y)" or "X من Y"
  const quotaMatch = rawTitle.match(/\(?\s*(\d+)\s*من\s*(\d+)\s*\)?/)
  let quotaStr = null
  if (quotaMatch) {
    let current = Number(quotaMatch[1])
    const total = Number(quotaMatch[2])
    if (total > 0 && current > total) {
      current = ((current - 1) % total) + 1
    }
    quotaStr = `${current} من ${total}`
  }

  // 3. If studentName was not on studentId, try extracting it from rawTitle
  // e.g. "حصة محمد أحمد (4 من 16)" -> studentName = "محمد أحمد"
  // or "محمد أحمد 4 من 16" -> studentName = "محمد أحمد"
  if (!studentName && rawTitle) {
    let cleaned = rawTitle
      .replace(/^حصة\s+/, '')
      .replace(/\s*—\s*.*$/, '')
      .replace(/\(?\s*\d+\s*من\s*\d+\s*\)?/g, '')
      .replace(/\(?\s*رقم\s*\d+\s*\)?/g, '')
      .replace(/\s*#?\d+\s*$/g, '')
      .trim()
    if (cleaned && !['تلاوة', 'مجدولة', 'دراسية', 'قرآن كريم', 'قرآن'].includes(cleaned)) {
      studentName = cleaned
    }
  }

  // 4. If we have a studentName:
  if (studentName) {
    if (quotaStr) {
      return `${studentName} ${quotaStr}`
    }
    // Check if rawTitle has a single session number
    const numMatch = rawTitle.match(/(?:رقم|حصة|#)?\s*(\d+)/)
    if (numMatch && !rawTitle.includes(studentName)) {
      return `${studentName} ${numMatch[1]}`
    }
    return studentName
  }

  // 5. If no studentName:
  if (quotaStr) {
    return quotaStr
  }

  const genericMatch = rawTitle.match(/^حصة\s*(\d+)?$/) || rawTitle === 'حصة تلاوة' || rawTitle === 'حصة مجدولة'
  if (genericMatch) {
    const num = genericMatch[1] || ''
    return num ? `حصة ${num}` : 'حصة دراسية'
  }

  return rawTitle || 'حصة دراسية'
}

/**
 * Extracts sequence details from a title like "محمد 4 من 16" or "حصة محمد (1 من 16)" or "حصة 1"
 */
export function extractSessionIndexInfo(titleAr) {
  if (!titleAr) return null
  const quotaMatch = titleAr.match(/\(?\s*(\d+)\s*من\s*(\d+)\s*\)?/)
  if (quotaMatch) {
    let current = Number(quotaMatch[1])
    const total = Number(quotaMatch[2])
    if (total > 0 && current > total) {
      current = ((current - 1) % total) + 1
    }
    return { current, total, label: `${current} من ${total}` }
  }
  const numMatch = titleAr.match(/(?:رقم|حصة|#)?\s*(\d+)/)
  if (numMatch) {
    return { current: Number(numMatch[1]), total: null, label: `${numMatch[1]}` }
  }
  return null
}
