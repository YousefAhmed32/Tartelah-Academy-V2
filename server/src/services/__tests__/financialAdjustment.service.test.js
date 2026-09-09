// Mocked-model tests — see wallet.service.test.js for the established pattern.
jest.mock('../../models/TeacherPayrollEntry')
jest.mock('../../models/User')
jest.mock('../payrollPeriod.service')

const TeacherPayrollEntry = require('../../models/TeacherPayrollEntry')
const User = require('../../models/User')
const periodService = require('../payrollPeriod.service')
const { createTeacherAdjustment, reverseAdjustment, FinancialAdjustmentError } = require('../financialAdjustment.service')

beforeEach(() => {
  jest.clearAllMocks()
  User.findOne.mockResolvedValue({ _id: 't1', role: 'teacher' })
  periodService.getOrCreateCurrentPeriod.mockResolvedValue({ _id: 'period1', status: 'open' })
  periodService.getOrCreatePeriod.mockResolvedValue({ _id: 'period1', status: 'open' })
})

describe('financialAdjustment.createTeacherAdjustment — sign conventions', () => {
  test('a bonus is always stored as a positive amount, regardless of input sign', async () => {
    TeacherPayrollEntry.create.mockImplementationOnce((doc) => Promise.resolve(doc))
    const { entry } = await createTeacherAdjustment({ teacherId: 't1', type: 'bonus', amount: 200, reason: 'أداء متميز', createdBy: 'admin1' })
    expect(entry.amount).toBe(200)
    expect(entry.type).toBe('bonus')
    expect(entry.periodId).toBe('period1')
  })

  test('a penalty is always stored as a negative amount, even if given a positive number', async () => {
    TeacherPayrollEntry.create.mockImplementationOnce((doc) => Promise.resolve(doc))
    const { entry } = await createTeacherAdjustment({ teacherId: 't1', type: 'penalty', amount: 150, reason: 'تأخر متكرر', createdBy: 'admin1' })
    expect(entry.amount).toBe(-150)
  })

  test('a manual_adjustment (settlement/correction) keeps the exact signed amount given', async () => {
    TeacherPayrollEntry.create.mockImplementationOnce((doc) => Promise.resolve(doc))
    const { entry } = await createTeacherAdjustment({ teacherId: 't1', type: 'manual_adjustment', amount: -40, reason: 'تسوية', createdBy: 'admin1' })
    expect(entry.amount).toBe(-40)
  })

  test('rejects a missing/empty reason', async () => {
    await expect(createTeacherAdjustment({ teacherId: 't1', type: 'bonus', amount: 10, reason: '  ', createdBy: 'admin1' }))
      .rejects.toThrow(FinancialAdjustmentError)
  })

  test('rejects an unknown adjustment type', async () => {
    await expect(createTeacherAdjustment({ teacherId: 't1', type: 'not_a_real_type', amount: 10, reason: 'x', createdBy: 'admin1' }))
      .rejects.toThrow(FinancialAdjustmentError)
  })

  test('rejects a nonexistent teacher', async () => {
    User.findOne.mockResolvedValueOnce(null)
    await expect(createTeacherAdjustment({ teacherId: 'ghost', type: 'bonus', amount: 10, reason: 'x', createdBy: 'admin1' }))
      .rejects.toThrow(FinancialAdjustmentError)
  })

  test('refuses to add a new adjustment to an already-approved/paid period', async () => {
    periodService.getOrCreateCurrentPeriod.mockResolvedValueOnce({ _id: 'period1', status: 'approved' })
    await expect(createTeacherAdjustment({ teacherId: 't1', type: 'bonus', amount: 10, reason: 'x', createdBy: 'admin1' }))
      .rejects.toThrow(FinancialAdjustmentError)
  })
})

describe('financialAdjustment.reverseAdjustment', () => {
  test('creates an exact offsetting entry and leaves the original ACTIVE (not voided) — reversal-based, never double-cancelling', async () => {
    const original = { _id: 'e1', type: 'bonus', amount: 200, currency: 'EGP', teacherId: 't1', periodId: 'period1', reason: 'مكافأة', voided: false, save: jest.fn().mockResolvedValue(true) }
    TeacherPayrollEntry.findById.mockResolvedValueOnce(original)
    TeacherPayrollEntry.create.mockImplementationOnce((doc) => Promise.resolve({ _id: 'e2', ...doc }))

    const reversal = await reverseAdjustment('e1', { reason: 'خطأ في الإدخال', actorId: 'admin1' })

    expect(reversal.amount).toBe(-200) // exactly cancels the original when summed
    expect(reversal.supersedes).toBe('e1')
    expect(original.voided).toBe(false) // never voided — both rows stay active and sum to zero
    expect(original.supersededBy).toBe('e2')
  })

  test('refuses to reverse an already-voided entry', async () => {
    TeacherPayrollEntry.findById.mockResolvedValueOnce({ _id: 'e1', type: 'bonus', voided: true })
    await expect(reverseAdjustment('e1', { reason: 'x', actorId: 'admin1' })).rejects.toThrow(FinancialAdjustmentError)
  })

  test('refuses to reverse a session-driven entry (session_payable etc.) — only manual adjustments are reversible this way', async () => {
    TeacherPayrollEntry.findById.mockResolvedValueOnce({ _id: 'e1', type: 'session_payable', voided: false })
    await expect(reverseAdjustment('e1', { reason: 'x', actorId: 'admin1' })).rejects.toThrow(FinancialAdjustmentError)
  })

  test('requires a reason', async () => {
    await expect(reverseAdjustment('e1', { actorId: 'admin1' })).rejects.toThrow(FinancialAdjustmentError)
  })
})
