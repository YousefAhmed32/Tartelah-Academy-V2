/**
 * UI UX PRO MAX — Intelligent Session Title & Numbering Utilities
 * Ensures sessions are always presented with the student's name and clear monthly sequence badges,
 * eliminating raw, uninformative titles like "حصة 1" across all cards, tables, and views.
 */

export function formatSessionTitle(session) {
  if (!session) return 'حصة دراسية'
  const rawTitle = (session.titleAr || session.title || '').trim()

  // Extract student name if populated
  const student = session.studentId
  const studentName = student && typeof student === 'object' && student.firstNameAr
    ? `${student.firstNameAr} ${student.lastNameAr || ''}`.trim()
    : (student?.name || '')

  // Check if rawTitle is generic ("حصة", "حصة 1", "حصة 2", "حصة تلاوة")
  const genericMatch = rawTitle.match(/^حصة\s*(\d+)?$/) || rawTitle === 'حصة تلاوة' || rawTitle === 'حصة مجدولة'
  
  if (genericMatch) {
    const num = genericMatch[1] || ''
    if (studentName) {
      return num ? `حصة ${studentName} (رقم ${num})` : `حصة ${studentName}`
    }
  }

  // If rawTitle is missing student name but student is known
  if (studentName && !rawTitle.includes(studentName) && rawTitle.startsWith('حصة')) {
    return `${rawTitle} — ${studentName}`
  }

  return rawTitle || (studentName ? `حصة ${studentName}` : 'حصة دراسية')
}

/**
 * Extracts sequence details from a title like "حصة محمد (1 من 16)" or "حصة 1"
 */
export function extractSessionIndexInfo(titleAr) {
  if (!titleAr) return null
  const quotaMatch = titleAr.match(/\((\d+)\s*من\s*(\d+)\)/)
  if (quotaMatch) {
    return { current: Number(quotaMatch[1]), total: Number(quotaMatch[2]), label: `${quotaMatch[1]} من ${quotaMatch[2]}` }
  }
  const numMatch = titleAr.match(/(?:رقم|حصة|#)\s*(\d+)/)
  if (numMatch) {
    return { current: Number(numMatch[1]), total: null, label: `حصة ${numMatch[1]}` }
  }
  return null
}
