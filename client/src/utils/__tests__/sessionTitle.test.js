import { describe, test, expect } from 'vitest'
import { formatSessionTitle, extractSessionIndexInfo } from '../sessionTitle.js'

describe('sessionTitle utility — sequence extraction and cycle normalization', () => {
  describe('extractSessionIndexInfo', () => {
    test('extracts normal quota within package', () => {
      const info = extractSessionIndexInfo('حصة أحمد محمود (11 من 16)')
      expect(info).toEqual({ current: 11, total: 16, label: '11 من 16' })
    })

    test('normalizes legacy title where count exceeded package (17 من 16 -> 1 من 16)', () => {
      const info17 = extractSessionIndexInfo('حصة أحمد محمود (17 من 16)')
      expect(info17).toEqual({ current: 1, total: 16, label: '1 من 16' })

      const info18 = extractSessionIndexInfo('حصة أحمد محمود (18 من 16)')
      expect(info18).toEqual({ current: 2, total: 16, label: '2 من 16' })

      const info24 = extractSessionIndexInfo('حصة أحمد محمود (24 من 16)')
      expect(info24).toEqual({ current: 8, total: 16, label: '8 من 16' })

      const info32 = extractSessionIndexInfo('حصة أحمد محمود (32 من 16)')
      expect(info32).toEqual({ current: 16, total: 16, label: '16 من 16' })
    })

    test('extracts simple session number when no quota is present', () => {
      const info = extractSessionIndexInfo('حصة 5')
      expect(info).toEqual({ current: 5, total: null, label: '5' })
    })
  })

  describe('formatSessionTitle', () => {
    test('auto-normalizes title exceeding package total to cycle back to 1', () => {
      const session = {
        titleAr: 'حصة محمد علي (17 من 16)',
        studentId: { firstNameAr: 'محمد', lastNameAr: 'علي' },
      }
      expect(formatSessionTitle(session)).toBe('محمد علي 1 من 16')
    })

    test('auto-normalizes title 24 of 16 to 8 of 16', () => {
      const session = {
        titleAr: 'حصة محمد علي (24 من 16)',
        studentId: { firstNameAr: 'محمد', lastNameAr: 'علي' },
      }
      expect(formatSessionTitle(session)).toBe('محمد علي 8 من 16')
    })

    test('formats valid in-range quota cleanly as studentName countStr', () => {
      const session = {
        titleAr: 'حصة محمد علي (11 من 16)',
        studentId: { firstNameAr: 'محمد', lastNameAr: 'علي' },
      }
      expect(formatSessionTitle(session)).toBe('محمد علي 11 من 16')
    })

    test('formats session with rawTitle already clean', () => {
      const session = {
        titleAr: 'محمد علي 4 من 16',
      }
      expect(formatSessionTitle(session)).toBe('محمد علي 4 من 16')
    })
  })
})
