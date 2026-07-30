// This repo has no DB test infrastructure — see
// controllers/__tests__/course.controller.test.js for the established
// rationale. Verifies the migration's two core guarantees: it skips
// students who already have a wallet (idempotent across repeated boots),
// and it correctly reconstructs the wallet from historical Subscription sums
// for students who don't.

jest.mock('../../models/Subscription')
jest.mock('../../models/LessonWallet')
jest.mock('../../models/LessonTransaction')

const Subscription = require('../../models/Subscription')
const LessonWallet = require('../../models/LessonWallet')
const LessonTransaction = require('../../models/LessonTransaction')
const { backfillLessonWallets } = require('../backfillLessonWallets')

beforeEach(() => jest.clearAllMocks())

describe('backfillLessonWallets', () => {
  test('does nothing when no student has any Subscription', async () => {
    Subscription.distinct.mockResolvedValue([])
    await backfillLessonWallets()
    expect(LessonWallet.create).not.toHaveBeenCalled()
  })

  test('skips students who already have a wallet (idempotent re-run)', async () => {
    Subscription.distinct.mockResolvedValue(['s1', 's2'])
    LessonWallet.find.mockReturnValue({
      select: jest.fn().mockResolvedValue([{ studentId: 's1' }, { studentId: 's2' }]),
    })

    await backfillLessonWallets()

    expect(LessonWallet.create).not.toHaveBeenCalled()
    expect(Subscription.aggregate).not.toHaveBeenCalled()
  })

  test('reconstructs a wallet for a student missing one, from their historical subscription sums', async () => {
    Subscription.distinct.mockResolvedValue(['s1', 's2'])
    LessonWallet.find.mockReturnValue({ select: jest.fn().mockResolvedValue([{ studentId: 's1' }]) }) // s1 already migrated
    Subscription.aggregate.mockResolvedValue([{ _id: null, totalPurchased: 12, remaining: 4 }])
    LessonWallet.create.mockResolvedValue({ _id: 'w2' })
    LessonTransaction.create.mockResolvedValue({ _id: 'tx2' })

    await backfillLessonWallets()

    expect(LessonWallet.create).toHaveBeenCalledTimes(1)
    expect(LessonWallet.create).toHaveBeenCalledWith(expect.objectContaining({
      studentId: 's2', totalPurchased: 12, totalUsed: 8, remaining: 4,
    }))
    expect(LessonTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
      walletId: 'w2', studentId: 's2', type: 'migration_import', amount: 4, balanceAfter: 4,
      idempotencyKey: 'migration:wallet-import:s2',
    }))
  })

  test('never produces a negative totalUsed even if remaining exceeds totalPurchased (defensive)', async () => {
    Subscription.distinct.mockResolvedValue(['s3'])
    LessonWallet.find.mockReturnValue({ select: jest.fn().mockResolvedValue([]) })
    Subscription.aggregate.mockResolvedValue([{ _id: null, totalPurchased: 2, remaining: 5 }])
    LessonWallet.create.mockResolvedValue({ _id: 'w3' })
    LessonTransaction.create.mockResolvedValue({ _id: 'tx3' })

    await backfillLessonWallets()

    expect(LessonWallet.create).toHaveBeenCalledWith(expect.objectContaining({ totalUsed: 0 }))
  })
})
