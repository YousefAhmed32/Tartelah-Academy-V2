// Mocked-model tests — see wallet.service.test.js for the established pattern.
jest.mock('../../models/TeacherPayrollPeriod')
jest.mock('../../models/TeacherPayrollEntry')
jest.mock('../../models/User')
jest.mock('../academySettings.service')
// See payrollLedger.service.test.js's identical comment: short readable
// test ids aren't real hex ObjectId strings, so stub the constructor.
jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose')
  return { ...actual, Types: { ...actual.Types, ObjectId: jest.fn((id) => id) } }
})

const TeacherPayrollPeriod = require('../../models/TeacherPayrollPeriod')
const TeacherPayrollEntry = require('../../models/TeacherPayrollEntry')
const User = require('../../models/User')
const {
  getOrCreatePeriod, computeLiveTotals, getPeriodWithTotals,
  submitForReview, approvePeriod, markPaid, reopenPeriod, listOrgPeriodsForMonth,
  PayrollPeriodError,
} = require('../payrollPeriod.service')

beforeEach(() => { jest.clearAllMocks() })

describe('payrollPeriod.getOrCreatePeriod', () => {
  test('upserts on {teacherId, periodKey} — idempotent by construction', async () => {
    TeacherPayrollPeriod.findOneAndUpdate.mockResolvedValueOnce({ _id: 'p1', periodKey: '2026-09' })
    const period = await getOrCreatePeriod('t1', 2026, 9)
    expect(TeacherPayrollPeriod.findOneAndUpdate).toHaveBeenCalledWith(
      { teacherId: 't1', periodKey: '2026-09' },
      expect.objectContaining({ $setOnInsert: expect.objectContaining({ year: 2026, month: 9 }) }),
      expect.objectContaining({ upsert: true })
    )
    expect(period.periodKey).toBe('2026-09')
  })
})

describe('payrollPeriod.computeLiveTotals', () => {
  test('sums each entry type into the correct bucket, treating penalty amounts as already-negative', async () => {
    TeacherPayrollEntry.aggregate.mockResolvedValueOnce([
      { _id: 'session_payable', amount: 600, count: 6 },
      { _id: 'session_non_payable', amount: 0, count: 1 },
      { _id: 'bonus', amount: 100, count: 1 },
      { _id: 'penalty', amount: -50, count: 1 },
      { _id: 'manual_adjustment', amount: 20, count: 1 },
    ])
    const totals = await computeLiveTotals('period1')
    expect(totals.grossEntitlement).toBe(600)
    expect(totals.bonusesTotal).toBe(100)
    expect(totals.deductionsTotal).toBe(-50)
    expect(totals.settlementsTotal).toBe(20)
    expect(totals.netPayable).toBe(600 + 100 - 50 + 20)
    expect(totals.payableSessionCount).toBe(6)
    expect(totals.sessionCount).toBe(7) // payable + non_payable
  })

  test('excludes voided entries from the match stage', async () => {
    TeacherPayrollEntry.aggregate.mockResolvedValueOnce([])
    await computeLiveTotals('period1')
    expect(TeacherPayrollEntry.aggregate.mock.calls[0][0][0].$match.voided).toBe(false)
  })
})

function makePeriod(overrides = {}) {
  return {
    _id: 'p1', teacherId: 't1', status: 'open', history: [],
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  }
}

describe('payrollPeriod.submitForReview / approvePeriod / markPaid / reopenPeriod', () => {
  test('submitForReview moves open -> pending_review and records a history entry', async () => {
    const period = makePeriod()
    TeacherPayrollPeriod.findById.mockResolvedValueOnce(period)
    TeacherPayrollEntry.aggregate.mockResolvedValueOnce([])
    await submitForReview('p1', { actorId: 'admin1' })
    expect(period.status).toBe('pending_review')
    expect(period.history).toHaveLength(1)
    expect(period.history[0].action).toBe('submitted')
  })

  test('approvePeriod freezes the live totals into the document and stamps approvedBy/approvedAt', async () => {
    const period = makePeriod({ status: 'pending_review' })
    TeacherPayrollPeriod.findById.mockResolvedValueOnce(period)
    TeacherPayrollEntry.aggregate.mockResolvedValueOnce([{ _id: 'session_payable', amount: 300, count: 3 }])

    await approvePeriod('p1', { actorId: 'admin1', reason: 'شهر مكتمل' })
    expect(period.status).toBe('approved')
    expect(period.netPayable).toBe(300)
    expect(period.approvedBy).toBe('admin1')
    expect(period.approvedAt).toBeInstanceOf(Date)
    expect(period.history[0].action).toBe('approved')
  })

  test('approvePeriod rejects an already-approved/paid period', async () => {
    const period = makePeriod({ status: 'paid' })
    TeacherPayrollPeriod.findById.mockResolvedValueOnce(period)
    await expect(approvePeriod('p1', { actorId: 'admin1' })).rejects.toThrow(PayrollPeriodError)
  })

  test('markPaid requires the period to already be approved', async () => {
    const period = makePeriod({ status: 'open' })
    TeacherPayrollPeriod.findById.mockResolvedValueOnce(period)
    await expect(markPaid('p1', { actorId: 'admin1' })).rejects.toThrow(PayrollPeriodError)
  })

  test('markPaid on an already-paid period is a safe idempotent no-op', async () => {
    const period = makePeriod({ status: 'paid' })
    TeacherPayrollPeriod.findById.mockResolvedValueOnce(period)
    const result = await markPaid('p1', { actorId: 'admin1' })
    expect(result).toBe(period)
    expect(period.save).not.toHaveBeenCalled()
  })

  test('markPaid transitions approved -> paid with a reference and a history entry', async () => {
    const period = makePeriod({ status: 'approved', grossEntitlement: 300, netPayable: 300, bonusesTotal: 0, deductionsTotal: 0, settlementsTotal: 0, sessionCount: 3, payableSessionCount: 3 })
    TeacherPayrollPeriod.findById.mockResolvedValueOnce(period)
    await markPaid('p1', { actorId: 'admin1', reference: 'TRX-123' })
    expect(period.status).toBe('paid')
    expect(period.paidReference).toBe('TRX-123')
    expect(period.history.find(h => h.action === 'paid')).toBeTruthy()
  })

  test('reopenPeriod requires a reason', async () => {
    await expect(reopenPeriod('p1', { actorId: 'admin1' })).rejects.toThrow(PayrollPeriodError)
  })

  test('reopenPeriod rejects a period that was never approved/paid', async () => {
    const period = makePeriod({ status: 'open' })
    TeacherPayrollPeriod.findById.mockResolvedValueOnce(period)
    await expect(reopenPeriod('p1', { actorId: 'admin1', reason: 'خطأ إداري' })).rejects.toThrow(PayrollPeriodError)
  })

  test('reopenPeriod moves an approved period back to open and logs the reason', async () => {
    const period = makePeriod({ status: 'approved', netPayable: 300 })
    TeacherPayrollPeriod.findById.mockResolvedValueOnce(period)
    await reopenPeriod('p1', { actorId: 'admin1', reason: 'تصحيح خصم' })
    expect(period.status).toBe('open')
    expect(period.history[0]).toMatchObject({ action: 'reopened', reason: 'تصحيح خصم' })
  })
})

describe('payrollPeriod.getPeriodWithTotals', () => {
  test('an open period returns LIVE-computed totals', async () => {
    const period = { _id: 'p1', status: 'open', toObject: () => ({ _id: 'p1', status: 'open' }) }
    TeacherPayrollPeriod.findById.mockReturnValue({ populate: () => Promise.resolve(period) })
    TeacherPayrollEntry.aggregate.mockResolvedValueOnce([{ _id: 'session_payable', amount: 500, count: 5 }])
    const result = await getPeriodWithTotals('p1')
    expect(result.grossEntitlement).toBe(500)
  })

  test('an approved period returns its FROZEN stored totals — no live aggregation call', async () => {
    const period = { _id: 'p1', status: 'approved', netPayable: 700, toObject: () => ({ _id: 'p1', status: 'approved', netPayable: 700 }) }
    TeacherPayrollPeriod.findById.mockReturnValue({ populate: () => Promise.resolve(period) })
    const result = await getPeriodWithTotals('p1')
    expect(result.netPayable).toBe(700)
    expect(TeacherPayrollEntry.aggregate).not.toHaveBeenCalled()
  })
})

describe('payrollPeriod.listOrgPeriodsForMonth', () => {
  test('creates/loads exactly one period per active teacher (bounded, no N+1 surprise beyond one call per row)', async () => {
    User.find.mockReturnValue({
      select: () => ({ sort: () => ({ skip: () => ({ limit: () => Promise.resolve([{ _id: 't1', firstNameAr: 'A' }, { _id: 't2', firstNameAr: 'B' }]) }) }) }),
    })
    User.countDocuments.mockResolvedValueOnce(2)
    TeacherPayrollPeriod.findOneAndUpdate.mockImplementation((q) => Promise.resolve({ _id: `p-${q.teacherId}`, status: 'open', teacherId: q.teacherId }))
    TeacherPayrollPeriod.findById.mockImplementation((id) => ({ populate: () => Promise.resolve({ _id: id, status: 'open', toObject: () => ({ _id: id, status: 'open' }) }) }))
    TeacherPayrollEntry.aggregate.mockResolvedValue([])

    const result = await listOrgPeriodsForMonth(2026, 9, {})
    expect(result.rows).toHaveLength(2)
    expect(result.total).toBe(2)
  })
})
