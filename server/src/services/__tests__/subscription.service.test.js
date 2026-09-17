// Mocked-model tests (no DB test infra in this repo — see wallet.service.test.js
// for the established rationale) exercising createSubscriptionWithOpeningBalance's
// real validation + rollback logic.
jest.mock('../../models/Subscription')
jest.mock('../../models/Package')
jest.mock('../../models/Session')
jest.mock('../../models/TeacherPayrollEntry')
jest.mock('../wallet.service')
jest.mock('../payrollLedger.service')

const Subscription = require('../../models/Subscription')
const Package = require('../../models/Package')
const Session = require('../../models/Session')
const TeacherPayrollEntry = require('../../models/TeacherPayrollEntry')
const walletService = require('../wallet.service')
const { recordEntry } = require('../payrollLedger.service')
const { createSubscriptionWithOpeningBalance, SubscriptionCreationError, OpeningBalanceError } = require('../subscription.service')

function mockPackage(overrides = {}) {
  return { _id: 'pkg1', nameAr: 'باقة 10 حصص', price: 500, durationDays: 30, sessionsPerMonth: 10, isActive: true, ...overrides }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('createSubscriptionWithOpeningBalance', () => {
  test('rejects a package that does not exist', async () => {
    Package.findById.mockResolvedValue(null)
    await expect(createSubscriptionWithOpeningBalance({ studentId: 's1', packageId: 'pkg1', actorId: 'a1' }))
      .rejects.toMatchObject({ status: 404 })
    expect(Subscription.create).not.toHaveBeenCalled()
  })

  test('rejects an inactive package', async () => {
    Package.findById.mockResolvedValue(mockPackage({ isActive: false }))
    await expect(createSubscriptionWithOpeningBalance({ studentId: 's1', packageId: 'pkg1', actorId: 'a1' }))
      .rejects.toThrow(SubscriptionCreationError)
    expect(Subscription.create).not.toHaveBeenCalled()
  })

  test('rejects invalid lessonsUsed/lessonsRemaining before any write', async () => {
    Package.findById.mockResolvedValue(mockPackage())
    await expect(createSubscriptionWithOpeningBalance({
      studentId: 's1', packageId: 'pkg1', lessonsUsed: 99, actorId: 'a1',
    })).rejects.toThrow(OpeningBalanceError)
    expect(Subscription.create).not.toHaveBeenCalled()
  })

  test('with neither lessonsUsed nor lessonsRemaining, credits the full package total (backward-compatible default)', async () => {
    const pkg = mockPackage()
    Package.findById.mockResolvedValue(pkg)
    const subSave = jest.fn().mockResolvedValue(undefined)
    const sub = { _id: 'sub1', save: subSave }
    Subscription.create.mockResolvedValue(sub)
    walletService.applyTransaction.mockResolvedValue({ transaction: { _id: 'tx1' } })

    const result = await createSubscriptionWithOpeningBalance({ studentId: 's1', packageId: 'pkg1', actorId: 'admin1' })

    expect(Subscription.create).toHaveBeenCalledWith(expect.objectContaining({ sessionsRemaining: 10, totalSessions: 10 }))
    expect(walletService.applyTransaction).toHaveBeenCalledWith(expect.objectContaining({
      type: 'opening_balance', amount: 10, idempotencyKey: 'subscription:sub1:opening_balance',
    }))
    expect(result.used).toBe(0)
    expect(result.remaining).toBe(10)
  })

  test('with lessonsUsed given, credits only the remaining balance to the wallet', async () => {
    Package.findById.mockResolvedValue(mockPackage())
    const sub = { _id: 'sub2', save: jest.fn().mockResolvedValue(undefined) }
    Subscription.create.mockResolvedValue(sub)
    walletService.applyTransaction.mockResolvedValue({ transaction: { _id: 'tx2' } })

    const result = await createSubscriptionWithOpeningBalance({
      studentId: 's1', packageId: 'pkg1', lessonsUsed: 6, actorId: 'admin1',
    })

    expect(walletService.applyTransaction).toHaveBeenCalledWith(expect.objectContaining({ type: 'opening_balance', amount: 4 }))
    expect(result.used).toBe(6)
    expect(result.remaining).toBe(4)
  })

  test('credits every imported off-platform lesson to the assigned teacher payroll immediately', async () => {
    Package.findById.mockResolvedValue(mockPackage())
    const sub = { _id: 'sub-import', save: jest.fn().mockResolvedValue(undefined) }
    Subscription.create.mockResolvedValue(sub)
    walletService.applyTransaction.mockResolvedValue({ transaction: { _id: 'tx-import' } })
    Session.create
      .mockResolvedValueOnce({ _id: 'past-1', teacherId: 'teacher1', durationMinutes: 45 })
      .mockResolvedValueOnce({ _id: 'past-2', teacherId: 'teacher1', durationMinutes: 45 })
    recordEntry.mockResolvedValue({ _id: 'payroll-entry' })

    const result = await createSubscriptionWithOpeningBalance({
      studentId: 's1', packageId: 'pkg1', teacherId: 'teacher1', lessonsUsed: 2,
      durationMinutes: 45, actorId: 'admin1',
    })

    expect(Session.create).toHaveBeenCalledTimes(2)
    expect(Session.create).toHaveBeenNthCalledWith(1, expect.objectContaining({
      studentId: 's1', teacherId: 'teacher1', subscriptionId: 'sub-import',
      durationMinutes: 45, status: 'completed', payrollStatus: 'payable',
      subscriptionConsumed: true, quranReportRequired: false,
    }))
    expect(recordEntry).toHaveBeenCalledTimes(2)
    expect(recordEntry).toHaveBeenCalledWith(expect.objectContaining({ _id: 'past-1' }), expect.objectContaining({
      payrollStatus: 'payable', businessRule: 'opening_balance_consumed', createdBy: 'admin1',
    }))
    expect(result.importedSessionIds).toEqual(['past-1', 'past-2'])
  })

  test('rolls back imported sessions, payroll rows, wallet counters, and subscription if teacher credit fails', async () => {
    Package.findById.mockResolvedValue(mockPackage())
    const sub = { _id: 'sub-failed-import', save: jest.fn().mockResolvedValue(undefined) }
    Subscription.create.mockResolvedValue(sub)
    Subscription.deleteOne.mockResolvedValue({})
    walletService.applyTransaction
      .mockResolvedValueOnce({ transaction: { _id: 'tx-opening' } })
      .mockResolvedValueOnce({ transaction: { _id: 'tx-rollback' } })
    Session.create.mockResolvedValueOnce({ _id: 'past-failed', teacherId: 'teacher1', durationMinutes: 60 })
    Session.deleteMany.mockResolvedValue({})
    TeacherPayrollEntry.deleteMany.mockResolvedValue({})
    recordEntry.mockRejectedValueOnce(new Error('payroll write failed'))

    await expect(createSubscriptionWithOpeningBalance({
      studentId: 's1', packageId: 'pkg1', teacherId: 'teacher1', lessonsUsed: 1, actorId: 'admin1',
    })).rejects.toThrow('payroll write failed')

    expect(TeacherPayrollEntry.deleteMany).toHaveBeenCalledWith({ sessionId: { $in: ['past-failed'] } })
    expect(Session.deleteMany).toHaveBeenCalledWith({ _id: { $in: ['past-failed'] } })
    expect(walletService.applyTransaction).toHaveBeenLastCalledWith(expect.objectContaining({
      type: 'opening_balance', amount: -9,
      idempotencyKey: 'subscription:sub-failed-import:opening_balance:rollback',
      metadata: expect.objectContaining({ packageTotal: -10, lessonsUsedAtOpening: -1, rollback: true }),
    }))
    expect(Subscription.deleteOne).toHaveBeenCalledWith({ _id: 'sub-failed-import' })
  })

  test('rolls back (deletes) the just-created Subscription if the wallet credit fails', async () => {
    Package.findById.mockResolvedValue(mockPackage())
    const sub = { _id: 'sub3', save: jest.fn() }
    Subscription.create.mockResolvedValue(sub)
    Subscription.deleteOne.mockResolvedValue({})
    walletService.applyTransaction.mockRejectedValue(new Error('wallet write failed'))

    await expect(createSubscriptionWithOpeningBalance({ studentId: 's1', packageId: 'pkg1', actorId: 'admin1' }))
      .rejects.toThrow('wallet write failed')
    expect(Subscription.deleteOne).toHaveBeenCalledWith({ _id: 'sub3' })
  })

  test('the opening-balance idempotency key is derived deterministically from the subscription id (retry-safe)', async () => {
    Package.findById.mockResolvedValue(mockPackage())
    const sub = { _id: 'sub-fixed', save: jest.fn().mockResolvedValue(undefined) }
    Subscription.create.mockResolvedValue(sub)
    walletService.applyTransaction.mockResolvedValue({ transaction: { _id: 'tx' } })

    await createSubscriptionWithOpeningBalance({ studentId: 's1', packageId: 'pkg1', actorId: 'a1' })
    await createSubscriptionWithOpeningBalance({ studentId: 's1', packageId: 'pkg1', actorId: 'a1' })

    const keys = walletService.applyTransaction.mock.calls.map((c) => c[0].idempotencyKey)
    expect(keys[0]).toBe('subscription:sub-fixed:opening_balance')
    expect(keys[0]).toBe(keys[1])
  })
})
