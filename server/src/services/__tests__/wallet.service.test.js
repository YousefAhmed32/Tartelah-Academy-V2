// This repo has no DB test infrastructure (no mongodb-memory-server) — see
// controllers/__tests__/course.controller.test.js for the established
// rationale. These tests mock the Mongoose models and exercise the real
// wallet.service.js logic: the increment math per transaction type, and the
// idempotency guarantee the whole Lesson Wallet redesign depends on
// (duplicate applyTransaction calls must never double-apply).

jest.mock('../../models/LessonWallet')
jest.mock('../../models/LessonTransaction')
jest.mock('../../models/Subscription')

const LessonWallet = require('../../models/LessonWallet')
const LessonTransaction = require('../../models/LessonTransaction')
const Subscription = require('../../models/Subscription')
const walletService = require('../wallet.service')

beforeEach(() => {
  jest.clearAllMocks()
  Subscription.findByIdAndUpdate.mockReturnValue({ catch: jest.fn() })
})

describe('wallet.service.applyTransaction', () => {
  test('a purchase increments both remaining and totalPurchased by the same amount', async () => {
    LessonWallet.findOneAndUpdate
      .mockResolvedValueOnce({ _id: 'w1', remaining: 0 }) // getOrCreateWallet
      .mockResolvedValueOnce({ _id: 'w1', remaining: 8, totalPurchased: 8 }) // post-increment read

    LessonTransaction.create.mockResolvedValueOnce({ _id: 'tx1' })

    const result = await walletService.applyTransaction({
      studentId: 's1', type: 'purchase', amount: 8, idempotencyKey: 'k1',
    })

    expect(LessonTransaction.create).toHaveBeenCalledWith(expect.objectContaining({ amount: 8, balanceAfter: 8, type: 'purchase' }))
    const incCall = LessonWallet.findOneAndUpdate.mock.calls[1][1]
    expect(incCall.$inc).toEqual({ remaining: 8, totalPurchased: 8 })
    expect(result.alreadyApplied).toBe(false)
  })

  test('a consumption decrements remaining and increments totalUsed', async () => {
    LessonWallet.findOneAndUpdate
      .mockResolvedValueOnce({ _id: 'w1', remaining: 5 })
      .mockResolvedValueOnce({ _id: 'w1', remaining: 4, totalUsed: 1 })
    LessonTransaction.create.mockResolvedValueOnce({ _id: 'tx2' })

    await walletService.applyTransaction({ studentId: 's1', type: 'consumption', amount: -1, idempotencyKey: 'k2' })

    const incCall = LessonWallet.findOneAndUpdate.mock.calls[1][1]
    expect(incCall.$inc).toEqual({ remaining: -1, totalUsed: 1 })
  })

  test('a reversal gives the lesson back and reduces totalUsed', async () => {
    LessonWallet.findOneAndUpdate
      .mockResolvedValueOnce({ _id: 'w1', remaining: 4 })
      .mockResolvedValueOnce({ _id: 'w1', remaining: 5, totalUsed: 0 })
    LessonTransaction.create.mockResolvedValueOnce({ _id: 'tx3' })

    await walletService.applyTransaction({ studentId: 's1', type: 'reversal', amount: 1, idempotencyKey: 'k3' })

    const incCall = LessonWallet.findOneAndUpdate.mock.calls[1][1]
    expect(incCall.$inc).toEqual({ remaining: 1, totalUsed: -1 })
  })

  test('a negative manual_adjustment decrements remaining, increments totalUsed and deductedLessons', async () => {
    LessonWallet.findOneAndUpdate
      .mockResolvedValueOnce({ _id: 'w1', remaining: 12 })
      .mockResolvedValueOnce({ _id: 'w1', remaining: 11, totalUsed: 1, deductedLessons: 1 })
    LessonTransaction.create.mockResolvedValueOnce({ _id: 'tx_adj' })

    await walletService.applyTransaction({ studentId: 's1', type: 'manual_adjustment', amount: -1, idempotencyKey: 'k_adj' })

    const incCall = LessonWallet.findOneAndUpdate.mock.calls[1][1]
    expect(incCall.$inc).toEqual({ remaining: -1, totalUsed: 1, deductedLessons: 1 })
  })

  test('a duplicate idempotencyKey is a guaranteed no-op — never double-applies', async () => {
    LessonWallet.findOneAndUpdate.mockResolvedValueOnce({ _id: 'w1', remaining: 5 })
    const dupError = new Error('duplicate key')
    dupError.code = 11000
    LessonTransaction.create.mockRejectedValueOnce(dupError)
    LessonTransaction.findOne.mockResolvedValueOnce({ _id: 'existingTx' })

    const result = await walletService.applyTransaction({ studentId: 's1', type: 'consumption', amount: -1, idempotencyKey: 'dup-key' })

    expect(result.alreadyApplied).toBe(true)
    expect(result.transaction._id).toBe('existingTx')
    // The increment step must never run for an already-applied transaction.
    expect(LessonWallet.findOneAndUpdate).toHaveBeenCalledTimes(1)
  })

  test('dual-writes the deprecated Subscription mirror when relatedSubscriptionId is given', async () => {
    LessonWallet.findOneAndUpdate
      .mockResolvedValueOnce({ _id: 'w1', remaining: 0 })
      .mockResolvedValueOnce({ _id: 'w1', remaining: 8, totalPurchased: 8 })
    LessonTransaction.create.mockResolvedValueOnce({ _id: 'tx4' })

    await walletService.applyTransaction({
      studentId: 's1', type: 'purchase', amount: 8, idempotencyKey: 'k4', relatedSubscriptionId: 'sub1',
    })

    expect(Subscription.findByIdAndUpdate).toHaveBeenCalledWith('sub1', {
      $set: { sessionsRemaining: 8, totalSessions: 8 },
    })
  })

  test('never clamps remaining at zero — over-consumption is a visible signal, not silently absorbed', async () => {
    LessonWallet.findOneAndUpdate
      .mockResolvedValueOnce({ _id: 'w1', remaining: 0 })
      .mockResolvedValueOnce({ _id: 'w1', remaining: -1, totalUsed: 1 })
    LessonTransaction.create.mockResolvedValueOnce({ _id: 'tx5', balanceAfter: -1 })

    const result = await walletService.applyTransaction({ studentId: 's1', type: 'consumption', amount: -1, idempotencyKey: 'k5' })
    expect(LessonTransaction.create.mock.calls[0][0].balanceAfter).toBe(-1)
    expect(result.wallet.remaining).toBe(-1)
  })
})
