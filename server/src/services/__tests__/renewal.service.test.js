// Mocked-model tests — see wallet.service.test.js for the established pattern.
jest.mock('../../models/Subscription')
jest.mock('../../models/Package')
jest.mock('../../models/ScheduleRule')
jest.mock('../../models/SubscriptionRenewalRequest')
jest.mock('../wallet.service')
jest.mock('../transfer.service')

const Subscription = require('../../models/Subscription')
const Package = require('../../models/Package')
const ScheduleRule = require('../../models/ScheduleRule')
const SubscriptionRenewalRequest = require('../../models/SubscriptionRenewalRequest')
const walletService = require('../wallet.service')
const transferService = require('../transfer.service')
const { executeRenewal, RenewalError } = require('../renewal.service')

function makeRequest(overrides = {}) {
  return {
    _id: 'req1', studentId: 's1', currentSubscriptionId: 'sub1',
    requestedPackageId: { _id: 'pkg1', nameAr: 'الباقة الذهبية', price: 300, sessionsPerMonth: 16, durationDays: 30, isActive: true },
    requestedTeacherId: null, status: 'pending', adminNotes: undefined,
    populate: jest.fn().mockReturnThis(),
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  ScheduleRule.updateMany.mockResolvedValue({})
})

describe('renewal.executeRenewal', () => {
  test('rejects a request that has already been decided', async () => {
    SubscriptionRenewalRequest.findById.mockReturnValue({ populate: () => Promise.resolve(makeRequest({ status: 'approved' })) })
    await expect(executeRenewal('req1', { actorId: 'admin1' })).rejects.toThrow(RenewalError)
  })

  test('same-teacher renewal never calls transfer.service — the common, no-op-teacher-change case', async () => {
    const request = makeRequest()
    SubscriptionRenewalRequest.findById.mockReturnValue({ populate: () => Promise.resolve(request) })
    Subscription.findById.mockResolvedValueOnce({ _id: 'sub1', teacherId: 't1', packageId: 'pkg1', save: jest.fn().mockResolvedValue(true) })
    Subscription.create.mockResolvedValueOnce({ _id: 'sub2', teacherId: 't1', save: jest.fn().mockResolvedValue(true) })
    walletService.applyTransaction.mockResolvedValueOnce({ transaction: { _id: 'tx1' } })

    const result = await executeRenewal('req1', { actorId: 'admin1' })

    expect(transferService.executeStudentTransfer).not.toHaveBeenCalled()
    expect(walletService.applyTransaction).toHaveBeenCalledWith(expect.objectContaining({
      type: 'renewal', amount: 16, studentId: 's1',
      idempotencyKey: 'renewal-request:req1:renew',
    }))
    expect(request.status).toBe('approved')
    expect(request.resultingSubscriptionId).toBe('sub2')
    expect(result.transfer).toBeNull()
  })

  test('a teacher-change request runs the transfer FIRST, before creating any new subscription', async () => {
    const request = makeRequest({ requestedTeacherId: 't2' })
    SubscriptionRenewalRequest.findById.mockReturnValue({ populate: () => Promise.resolve(request) })
    Subscription.findById.mockResolvedValueOnce({ _id: 'sub1', teacherId: 't1', packageId: 'pkg1', save: jest.fn().mockResolvedValue(true) })
    const callOrder = []
    transferService.executeStudentTransfer.mockImplementationOnce(async () => { callOrder.push('transfer'); return { transfer: { _id: 'transfer1' } } })
    Subscription.create.mockImplementationOnce(async () => { callOrder.push('create-subscription'); return { _id: 'sub2', teacherId: 't2', save: jest.fn().mockResolvedValue(true) } })
    walletService.applyTransaction.mockResolvedValueOnce({ transaction: { _id: 'tx1' } })

    const result = await executeRenewal('req1', { actorId: 'admin1' })

    expect(callOrder).toEqual(['transfer', 'create-subscription'])
    expect(transferService.executeStudentTransfer).toHaveBeenCalledWith('s1', expect.objectContaining({ targetTeacherId: 't2' }))
    expect(result.transfer._id).toBe('transfer1')
    expect(request.resultingTransferId).toBe('transfer1')
  })

  test('if the transfer fails, NO subscription or wallet credit is ever created', async () => {
    const request = makeRequest({ requestedTeacherId: 't2' })
    SubscriptionRenewalRequest.findById.mockReturnValue({ populate: () => Promise.resolve(request) })
    Subscription.findById.mockResolvedValueOnce({ _id: 'sub1', teacherId: 't1', packageId: 'pkg1', save: jest.fn() })
    transferService.executeStudentTransfer.mockRejectedValueOnce(new Error('الموعد لم يعد متاحًا'))

    await expect(executeRenewal('req1', { actorId: 'admin1' })).rejects.toThrow('الموعد لم يعد متاحًا')
    expect(Subscription.create).not.toHaveBeenCalled()
    expect(walletService.applyTransaction).not.toHaveBeenCalled()
  })

  test('if the wallet credit fails, the just-created subscription is rolled back (compensating delete)', async () => {
    const request = makeRequest()
    SubscriptionRenewalRequest.findById.mockReturnValue({ populate: () => Promise.resolve(request) })
    Subscription.findById.mockResolvedValueOnce({ _id: 'sub1', teacherId: 't1', packageId: 'pkg1', save: jest.fn() })
    Subscription.create.mockResolvedValueOnce({ _id: 'sub2', teacherId: 't1', save: jest.fn() })
    Subscription.deleteOne.mockResolvedValueOnce({})
    walletService.applyTransaction.mockRejectedValueOnce(new Error('wallet failure'))

    await expect(executeRenewal('req1', { actorId: 'admin1' })).rejects.toThrow('wallet failure')
    expect(Subscription.deleteOne).toHaveBeenCalledWith({ _id: 'sub2' })
  })

  test('active schedule rules are re-pointed at the new subscription for audit-trail continuity', async () => {
    const request = makeRequest()
    SubscriptionRenewalRequest.findById.mockReturnValue({ populate: () => Promise.resolve(request) })
    Subscription.findById.mockResolvedValueOnce({ _id: 'sub1', teacherId: 't1', packageId: 'pkg1', save: jest.fn() })
    Subscription.create.mockResolvedValueOnce({ _id: 'sub2', teacherId: 't1', save: jest.fn() })
    walletService.applyTransaction.mockResolvedValueOnce({ transaction: { _id: 'tx1' } })

    await executeRenewal('req1', { actorId: 'admin1' })
    expect(ScheduleRule.updateMany).toHaveBeenCalledWith(
      { studentId: 's1', teacherId: 't1', status: 'active' },
      { $set: { subscriptionId: 'sub2' } }
    )
  })
})
