const { computeOpeningBalance, OpeningBalanceError } = require('../lessonPolicy')

describe('computeOpeningBalance', () => {
  test('defaults to used:0, remaining:total when neither is provided (backward-compatible default)', () => {
    expect(computeOpeningBalance({ packageTotal: 10 })).toEqual({ used: 0, remaining: 10, total: 10 })
  })

  test('derives remaining from lessonsUsed', () => {
    expect(computeOpeningBalance({ packageTotal: 10, lessonsUsed: 6 })).toEqual({ used: 6, remaining: 4, total: 10 })
  })

  test('derives used from lessonsRemaining', () => {
    expect(computeOpeningBalance({ packageTotal: 10, lessonsRemaining: 4 })).toEqual({ used: 6, remaining: 4, total: 10 })
  })

  test('lessonsUsed at exactly the package total leaves 0 remaining', () => {
    expect(computeOpeningBalance({ packageTotal: 8, lessonsUsed: 8 })).toEqual({ used: 8, remaining: 0, total: 8 })
  })

  test('lessonsRemaining at exactly the package total leaves 0 used', () => {
    expect(computeOpeningBalance({ packageTotal: 8, lessonsRemaining: 8 })).toEqual({ used: 0, remaining: 8, total: 8 })
  })

  test('rejects providing both lessonsUsed and lessonsRemaining', () => {
    expect(() => computeOpeningBalance({ packageTotal: 10, lessonsUsed: 3, lessonsRemaining: 7 })).toThrow(OpeningBalanceError)
  })

  test('rejects lessonsUsed greater than the package total', () => {
    expect(() => computeOpeningBalance({ packageTotal: 10, lessonsUsed: 11 })).toThrow(OpeningBalanceError)
  })

  test('rejects lessonsRemaining greater than the package total', () => {
    expect(() => computeOpeningBalance({ packageTotal: 10, lessonsRemaining: 11 })).toThrow(OpeningBalanceError)
  })

  test('rejects a negative lessonsUsed', () => {
    expect(() => computeOpeningBalance({ packageTotal: 10, lessonsUsed: -1 })).toThrow(OpeningBalanceError)
  })

  test('rejects a negative lessonsRemaining', () => {
    expect(() => computeOpeningBalance({ packageTotal: 10, lessonsRemaining: -1 })).toThrow(OpeningBalanceError)
  })

  test('rejects a non-integer lessonsUsed', () => {
    expect(() => computeOpeningBalance({ packageTotal: 10, lessonsUsed: 2.5 })).toThrow(OpeningBalanceError)
  })

  test('rejects a malformed lessonsUsed string', () => {
    expect(() => computeOpeningBalance({ packageTotal: 10, lessonsUsed: 'abc' })).toThrow(OpeningBalanceError)
  })

  test('rejects an invalid packageTotal', () => {
    expect(() => computeOpeningBalance({ packageTotal: -5 })).toThrow(OpeningBalanceError)
    expect(() => computeOpeningBalance({ packageTotal: NaN })).toThrow(OpeningBalanceError)
  })

  test('every thrown error carries a 400 status and an Arabic message', () => {
    try {
      computeOpeningBalance({ packageTotal: 10, lessonsUsed: 20 })
      throw new Error('should have thrown')
    } catch (err) {
      expect(err.status).toBe(400)
      expect(err.message).toMatch(/[؀-ۿ]/) // contains Arabic characters
    }
  })
})
