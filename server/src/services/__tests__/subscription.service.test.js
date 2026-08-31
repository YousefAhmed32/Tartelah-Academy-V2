// Mocked-model tests (no DB test infra in this repo — see wallet.service.test.js
// for the established rationale) exercising createSubscriptionWithOpeningBalance's
// real validation + rollback logic.
jest.mock('../../models/Subscription')
jest.mock('../../models/Package')
jest.mock('../wallet.service')

const Subscription = require('../../models/Subscription')
const Package = require('../../models/Package')
const walletService = require('../wallet.service')
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
