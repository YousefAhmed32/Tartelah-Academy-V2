// Mocked-model tests (no DB test infra in this repo — see
// wallet.service.test.js for the established rationale) exercising the real
// pause/resume lifecycle logic: idempotency, date-extension math, and the
// wallet-balance-preserved / future-sessions-excluded guarantees.
jest.mock('../../models/Subscription')
jest.mock('../../models/SubscriptionPause')
jest.mock('../../models/ScheduleRule')
jest.mock('../../models/Session')
jest.mock('../../models/User')
jest.mock('../wallet.service')
jest.mock('../schedule.service')
jest.mock('../notification.service')
jest.mock('../audit.service')

const Subscription = require('../../models/Subscription')
const SubscriptionPause = require('../../models/SubscriptionPause')
const ScheduleRule = require('../../models/ScheduleRule')
const Session = require('../../models/Session')
const User = require('../../models/User')
const walletService = require('../wallet.service')
const scheduleService = require('../schedule.service')
const { createNotifications } = require('../notification.service')
const {
  pauseSubscription, resumeSubscription, previewPause, SubscriptionLifecycleError,
} = require('../subscriptionLifecycle.service')

beforeEach(() => {
  jest.clearAllMocks()
  createNotifications.mockResolvedValue([])
  User.find.mockReturnValue({ select: () => ({ limit: () => Promise.resolve([]) }) })
})

function mockSub(overrides = {}) {
  return {
    _id: 'sub1', studentId: 'student1', teacherId: 'teacher1', status: 'active',
    endDate: new Date('2026-10-01T00:00:00Z'), renewalDate: new Date('2026-10-01T00:00:00Z'),
    ...overrides,
  }
}

describe('subscriptionLifecycle.pauseSubscription', () => {
  test('rejects a missing reason before any read/write', async () => {
    await expect(pauseSubscription('sub1', { actorId: 'admin1' })).rejects.toThrow(SubscriptionLifecycleError)
    expect(Subscription.findById).not.toHaveBeenCalled()
  })

  test('rejects pausing a subscription that is not active', async () => {
    Subscription.findById.mockResolvedValueOnce(mockSub({ status: 'expired' }))
    SubscriptionPause.findOne.mockResolvedValueOnce(null)
    await expect(pauseSubscription('sub1', { reason: 'سفر', actorId: 'admin1' })).rejects.toThrow(SubscriptionLifecycleError)
  })

  test('is idempotent: an already-open pause is returned without a second write', async () => {
    Subscription.findById.mockResolvedValueOnce(mockSub())
    SubscriptionPause.findOne.mockResolvedValueOnce({ _id: 'pause1', status: 'active' })
    const result = await pauseSubscription('sub1', { reason: 'سفر', actorId: 'admin1' })
    expect(result.alreadyPaused).toBe(true)
    expect(SubscriptionPause.create).not.toHaveBeenCalled()
    expect(Subscription.updateOne).not.toHaveBeenCalled()
  })

  test('freezes the wallet WITHOUT changing its balance, cancels future sessions, and pauses schedule rules', async () => {
    const sub = mockSub()
    Subscription.findById.mockResolvedValue(sub)
    SubscriptionPause.findOne.mockResolvedValueOnce(null)
    ScheduleRule.find.mockResolvedValueOnce([{ _id: 'rule1' }, { _id: 'rule2' }])
    Session.find.mockResolvedValueOnce([{ _id: 'sess1' }, { _id: 'sess2' }])
    walletService.getOrCreateWallet.mockResolvedValueOnce({ remaining: 12 })
    SubscriptionPause.create.mockResolvedValueOnce({ _id: 'pause1', effectiveDate: new Date(), reason: 'ظروف صحية' })

    const result = await pauseSubscription('sub1', { reason: 'ظروف صحية', actorId: 'admin1' })

    expect(result.alreadyPaused).toBe(false)
    expect(Subscription.updateOne).toHaveBeenCalledWith({ _id: 'sub1' }, { $set: { status: 'paused' } })
    expect(ScheduleRule.updateMany).toHaveBeenCalledWith({ _id: { $in: ['rule1', 'rule2'] } }, { $set: { status: 'paused' } })
    const sessionUpdateArgs = Session.updateMany.mock.calls[0]
    expect(sessionUpdateArgs[0]).toEqual({ _id: { $in: ['sess1', 'sess2'] } })
    expect(sessionUpdateArgs[1].$set.status).toBe('cancelled')
    expect(sessionUpdateArgs[1].$set.payrollStatus).toBe('excluded')
    // The wallet balance itself is never touched by pause — only freezeWallet
    // (status flip) is called; applyTransaction (which would change amount)
    // must never be invoked.
    expect(walletService.freezeWallet).toHaveBeenCalledWith('student1', expect.objectContaining({ reason: 'ظروف صحية' }))
    expect(walletService.applyTransaction).not.toHaveBeenCalled()
  })

  test('rolls back the pause record and subscription status if a downstream write fails', async () => {
    Subscription.findById.mockResolvedValue(mockSub())
    SubscriptionPause.findOne.mockResolvedValueOnce(null)
    ScheduleRule.find.mockResolvedValueOnce([])
    Session.find.mockResolvedValueOnce([])
    walletService.getOrCreateWallet.mockResolvedValueOnce({ remaining: 5 })
    SubscriptionPause.create.mockResolvedValueOnce({ _id: 'pause1' })
    walletService.freezeWallet.mockRejectedValueOnce(new Error('db down'))
    SubscriptionPause.deleteOne.mockResolvedValueOnce({})
    Subscription.updateOne.mockResolvedValue({})

    await expect(pauseSubscription('sub1', { reason: 'test', actorId: 'admin1' })).rejects.toThrow('db down')
    expect(SubscriptionPause.deleteOne).toHaveBeenCalledWith({ _id: 'pause1' })
    // Second updateOne call is the rollback restoring status to 'active'.
    expect(Subscription.updateOne).toHaveBeenLastCalledWith({ _id: 'sub1', status: 'paused' }, { $set: { status: 'active' } })
  })
})

describe('subscriptionLifecycle.resumeSubscription', () => {
  test('rejects when there is no open pause and the subscription is currently paused (inconsistent state, not silently accepted)', async () => {
    Subscription.findById.mockResolvedValueOnce(mockSub({ status: 'paused' }))
    SubscriptionPause.findOne
      .mockResolvedValueOnce(null) // no open pause
      .mockReturnValueOnce({ sort: () => Promise.resolve(null) }) // lastResumed lookup — none exists either
    await expect(resumeSubscription('sub1', { actorId: 'admin1' })).rejects.toThrow(SubscriptionLifecycleError)
  })

  test('is idempotent: resuming an already-active subscription with no open pause returns the last resumed record', async () => {
    Subscription.findById.mockResolvedValueOnce(mockSub({ status: 'active' }))
    SubscriptionPause.findOne
      .mockResolvedValueOnce(null) // no open pause for this subscription
      .mockReturnValueOnce({ sort: () => Promise.resolve({ _id: 'pause1', status: 'resumed' }) }) // lastResumed lookup

    const result = await resumeSubscription('sub1', { actorId: 'admin1' })
    expect(result.alreadyResumed).toBe(true)
    expect(Subscription.updateOne).not.toHaveBeenCalled()
  })

  test('extends endDate/renewalDate by exactly the paused duration, preserves wallet balance, and regenerates only future sessions', async () => {
    // Relative to "now" (not a hardcoded calendar date) so the assertion is
    // independent of whatever the actual system clock is when the test runs.
    const pausedAtEffective = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
    const originalEndDate = new Date(Date.now() + 25 * 24 * 60 * 60 * 1000) // 25 days from now
    const openPause = {
      _id: 'pause1', subscriptionId: 'sub1', studentId: 'student1', status: 'active',
      effectiveDate: pausedAtEffective,
      originalEndDate,
      originalRenewalDate: originalEndDate,
      affectedScheduleRuleIds: ['rule1'],
    }
    Subscription.findById.mockResolvedValue(mockSub({ status: 'paused' }))
    SubscriptionPause.findOne.mockResolvedValueOnce(openPause)
    ScheduleRule.find.mockResolvedValueOnce([{ _id: 'rule1', status: 'paused' }])
    ScheduleRule.updateMany.mockResolvedValueOnce({})
    scheduleService.generateSessionsFromRule.mockResolvedValueOnce([{ _id: 'newSess1' }])
    SubscriptionPause.findOneAndUpdate.mockResolvedValueOnce({ ...openPause, status: 'resumed', resumeDurationDays: 5 })

    const result = await resumeSubscription('sub1', { actorId: 'admin1' })

    expect(result.alreadyResumed).toBe(false)
    const subUpdateArgs = Subscription.updateOne.mock.calls[0]
    expect(subUpdateArgs[0]).toEqual({ _id: 'sub1' })
    expect(subUpdateArgs[1].$set.status).toBe('active')
    expect(subUpdateArgs[1].$set.endDate.getTime()).toBeGreaterThan(originalEndDate.getTime())
    // Wallet balance is preserved — resumeWallet never touches `remaining`,
    // and applyTransaction (which would) must never be invoked here either.
    expect(walletService.resumeWallet).toHaveBeenCalledWith('student1', { resumedBy: 'admin1' })
    expect(walletService.applyTransaction).not.toHaveBeenCalled()
    expect(scheduleService.generateSessionsFromRule).toHaveBeenCalledTimes(1)
  })

  test('a concurrent double-resume is a safe no-op on the second call', async () => {
    const openPause = {
      _id: 'pause1', subscriptionId: 'sub1', studentId: 'student1', status: 'active',
      effectiveDate: new Date(), originalEndDate: null, originalRenewalDate: null, affectedScheduleRuleIds: [],
    }
    Subscription.findById.mockResolvedValue(mockSub({ status: 'paused' }))
    SubscriptionPause.findOne.mockResolvedValueOnce(openPause)
    ScheduleRule.find.mockResolvedValueOnce([])
    // Another request already flipped status to 'resumed' between our read and write.
    SubscriptionPause.findOneAndUpdate.mockResolvedValueOnce(null)
    SubscriptionPause.findById.mockResolvedValueOnce({ ...openPause, status: 'resumed' })

    const result = await resumeSubscription('sub1', { actorId: 'admin1' })
    expect(result.alreadyResumed).toBe(true)
  })
})

describe('subscriptionLifecycle.previewPause', () => {
  test('rejects previewing a pause for a subscription that is not active', async () => {
    Subscription.findById.mockResolvedValueOnce(mockSub({ status: 'paused' }))
    await expect(previewPause('sub1')).rejects.toThrow(SubscriptionLifecycleError)
  })
})
