import { describe, test, expect } from 'vitest'
import { isSafeInternalPath } from '../notificationUrl.js'

describe('isSafeInternalPath', () => {
  test('accepts a normal relative path', () => {
    expect(isSafeInternalPath('/student/subscription')).toBe(true)
  })

  test('accepts a path with a query string', () => {
    expect(isSafeInternalPath('/admin/teachers/abc?action=add')).toBe(true)
  })

  test('rejects a protocol-relative URL', () => {
    expect(isSafeInternalPath('//evil.example.com')).toBe(false)
  })

  test('rejects an absolute external URL', () => {
    expect(isSafeInternalPath('https://evil.example.com')).toBe(false)
  })

  test('rejects a javascript: URL', () => {
    expect(isSafeInternalPath('javascript:alert(1)')).toBe(false)
  })

  test('rejects empty/non-string values', () => {
    expect(isSafeInternalPath('')).toBe(false)
    expect(isSafeInternalPath(null)).toBe(false)
    expect(isSafeInternalPath(undefined)).toBe(false)
  })

  test('rejects a path missing the leading slash', () => {
    expect(isSafeInternalPath('student/subscription')).toBe(false)
  })
})
