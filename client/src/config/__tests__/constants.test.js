// Phase 2 Part 2c continuation improvement — "إضافة المزيد من الطلاب لهذا
// المعلم" success-page action. This locks in the exact URL contract the
// button relies on: it must use the real database teacherId (never an
// email/name/array index) and must resolve to the existing teacher-profile
// route with the add-student flow flagged to auto-open, not a new page.
import { describe, test, expect } from 'vitest'
import { buildTeacherAddStudentUrl, ROUTES } from '../constants.js'

describe('buildTeacherAddStudentUrl', () => {
  test('builds the teacher-profile route with the add-student continuation flag, using the real teacher id', () => {
    expect(buildTeacherAddStudentUrl('68f1a2b3c4d5e6f7a8b9c0d1')).toBe('/admin/teachers/68f1a2b3c4d5e6f7a8b9c0d1?action=add')
  })

  test('never builds a URL from anything other than an id (falls back to the teacher list when none is given)', () => {
    expect(buildTeacherAddStudentUrl(undefined)).toBe(ROUTES.ADMIN_TEACHERS)
    expect(buildTeacherAddStudentUrl(null)).toBe(ROUTES.ADMIN_TEACHERS)
    expect(buildTeacherAddStudentUrl('')).toBe(ROUTES.ADMIN_TEACHERS)
  })

  test('reuses the existing ADMIN_TEACHER_PROFILE route shape rather than inventing a new path', () => {
    const url = buildTeacherAddStudentUrl('t1')
    expect(url.startsWith('/admin/teachers/')).toBe(true)
    expect(ROUTES.ADMIN_TEACHER_PROFILE).toBe('/admin/teachers/:id')
  })
})
