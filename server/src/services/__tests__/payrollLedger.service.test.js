// Mocked-model tests (no DB test infra in this repo — see wallet.service.test.js
// for the same established pattern). Exercises the canonical hourly-payroll
// formula and the pending-update-in-place vs. approved/paid-void-and-replace
// correction chain.
jest.mock('../../models/TeacherPayrollEntry')
jest.mock('../../models/User')
jest.mock('../payrollPeriod.service')
jest.mock('../academySettings.service')
// Test ids below are short/readable ('t1', 'period1', ...), not real 24-char
// hex ObjectId strings — the service code passes them through
// `new mongoose.Types.ObjectId(id)` for real aggregation pipelines, which
// would otherwise throw on a mocked-model test's fake ids. Stub just the
// constructor (pass-through) rather than switching every id in this file to
// verbose hex strings.
jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose')
  return { ...actual, Types: { ...actual.Types, ObjectId: jest.fn((id) => id) } }
})

const TeacherPayrollEntry = require('../../models/TeacherPayrollEntry')
const User = require('../../models/User')
const periodService = require('../payrollPeriod.service')
const { getAcademyTimezone } = require('../academySettings.service')
const { recordEntry, computeSessionPay, getEarnedAmount } = require('../payrollLedger.service')

const FAKE_PERIOD = { _id: 'period1' }

beforeEach(() => {
  jest.clearAllMocks()
  getAcademyTimezone.mockResolvedValue('Africa/Cairo')
  periodService.getOrCreatePeriod.mockResolvedValue(FAKE_PERIOD)
})

describe('payrollLedger.computeSessionPay', () => {
  test('applies the canonical formula: rate * minutes / 60', () => {
    expect(computeSessionPay(60, 60)).toBe(60)
    expect(computeSessionPay(60, 30)).toBe(30)
    expect(computeSessionPay(50, 45)).toBe(37.5)
  })
  test('handles a zero/missing rate or duration without throwing', () => {
    expect(computeSessionPay(0, 60)).toBe(0)
    expect(computeSessionPay(60, 0)).toBe(0)
    expect(computeSessionPay(undefined, undefined)).toBe(0)
  })
})

describe('payrollLedger.recordEntry', () => {
  const baseSession = { _id: 's1', teacherId: 't1', durationMinutes: 60, scheduledAt: new Date('2026-09-15') }

  test('a payable session snapshots the teacher\'s CURRENT hourlyRate, not salaryPerSession', async () => {
    User.findById.mockReturnValue({ select: () => Promise.resolve({ hourlyRate: 100, salaryPerSession: 999 }) })
    TeacherPayrollEntry.findOne.mockResolvedValueOnce(null)
    TeacherPayrollEntry.create.mockImplementationOnce((doc) => Promise.resolve(doc))

    const entry = await recordEntry(baseSession, { payrollStatus: 'payable', reason: 'x', businessRule: 'teacher_attended_full_session' })

    expect(entry.hourlyRateSnapshot).toBe(100)
    expect(entry.rateSnapshot).toBe(999) // legacy mirror, still captured for backward-compat display
    expect(entry.amount).toBe(100) // 100 * 60 / 60
    expect(entry.payableDurationMinutes).toBe(60)
    expect(entry.periodId).toBe('period1')
  })

  test('non_payable sessions record a zero amount but still snapshot the rate/duration', async () => {
    User.findById.mockReturnValue({ select: () => Promise.resolve({ hourlyRate: 100, salaryPerSession: 0 }) })
    TeacherPayrollEntry.findOne.mockResolvedValueOnce(null)
    TeacherPayrollEntry.create.mockImplementationOnce((doc) => Promise.resolve(doc))

    const entry = await recordEntry(baseSession, { payrollStatus: 'non_payable', reason: 'x' })
    expect(entry.amount).toBe(0)
    expect(entry.payableDurationMinutes).toBe(0)
    expect(entry.scheduledDurationMinutes).toBe(60)
  })

  test('an unresolved (pending/excluded) status produces no entry at all', async () => {
    const entry = await recordEntry(baseSession, { payrollStatus: 'pending' })
    expect(entry).toBeNull()
    expect(TeacherPayrollEntry.create).not.toHaveBeenCalled()
  })

  test('a still-pending existing entry is safely updated in place — no void/replace needed', async () => {
    User.findById.mockReturnValue({ select: () => Promise.resolve({ hourlyRate: 100 }) })
    const existing = { status: 'pending', amount: 50, save: jest.fn().mockResolvedValue(true) }
    TeacherPayrollEntry.findOne.mockResolvedValueOnce(existing)

    const result = await recordEntry(baseSession, { payrollStatus: 'payable', reason: 'recomputed' })
    expect(result).toBe(existing)
    expect(existing.amount).toBe(100)
    expect(existing.save).toHaveBeenCalledTimes(1)
    expect(TeacherPayrollEntry.create).not.toHaveBeenCalled()
  })

  test('an already-APPROVED entry is never mutated in place — it is voided and replaced', async () => {
    User.findById.mockReturnValue({ select: () => Promise.resolve({ hourlyRate: 100 }) })
    const existing = { _id: 'entry1', status: 'approved', amount: 50, type: 'session_payable', save: jest.fn().mockResolvedValue(true) }
    TeacherPayrollEntry.findOne.mockResolvedValueOnce(existing)
    const replacement = { _id: 'entry2' }
    TeacherPayrollEntry.create.mockResolvedValueOnce(replacement)

    const result = await recordEntry(baseSession, { payrollStatus: 'payable', reason: 'corrected duration' })

    expect(existing.voided).toBe(true)
    expect(existing.amount).toBe(50) // original amount left completely untouched
    expect(existing.save).toHaveBeenCalledTimes(2) // once to void, once to link supersededBy
    expect(TeacherPayrollEntry.create).toHaveBeenCalledWith(expect.objectContaining({ sessionId: 's1', supersedes: 'entry1' }))
    expect(existing.supersededBy).toBe('entry2')
    expect(result).toBe(replacement)
  })

  test('an approved entry with an identical recomputed amount is left untouched (no-op)', async () => {
    User.findById.mockReturnValue({ select: () => Promise.resolve({ hourlyRate: 100 }) })
    const existing = { status: 'approved', amount: 100, type: 'session_payable', save: jest.fn() }
    TeacherPayrollEntry.findOne.mockResolvedValueOnce(existing)

    const result = await recordEntry(baseSession, { payrollStatus: 'payable', reason: 'x' })
    expect(result).toBe(existing)
    expect(existing.save).not.toHaveBeenCalled()
    expect(TeacherPayrollEntry.create).not.toHaveBeenCalled()
  })
})

describe('payrollLedger.getEarnedAmount', () => {
  test('excludes voided entries from the aggregation match', async () => {
    TeacherPayrollEntry.aggregate.mockResolvedValueOnce([{ _id: null, totalAmount: 300, count: 3 }])
    await getEarnedAmount('t1', {})
    const pipeline = TeacherPayrollEntry.aggregate.mock.calls[0][0]
    expect(pipeline[0].$match.voided).toBe(false)
  })
})
