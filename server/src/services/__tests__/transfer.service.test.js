// Mocked-model tests (no DB test infra in this repo — see
// wallet.service.test.js for the established rationale) exercising the real
// single-student transfer primitive: validation, the server-side
// availability re-check, historical-data preservation, wallet-untouched
// guarantee, idempotency, and compensating rollback.
jest.mock('../../models/User')
jest.mock('../../models/Subscription')
jest.mock('../../models/ScheduleRule')
jest.mock('../../models/Session')
jest.mock('../../models/StudentTransfer')
jest.mock('../availability.service')
jest.mock('../schedule.service')
jest.mock('../notification.service')
jest.mock('../audit.service')
jest.mock('../wallet.service', () => ({
  getWallet: jest.fn(),
  applyTransaction: jest.fn(),
}))

const User = require('../../models/User')
const Subscription = require('../../models/Subscription')
const ScheduleRule = require('../../models/ScheduleRule')
const Session = require('../../models/Session')
const StudentTransfer = require('../../models/StudentTransfer')
const availabilityService = require('../availability.service')
const scheduleService = require('../schedule.service')
const walletService = require('../wallet.service')
const { createNotifications } = require('../notification.service')
const {
  previewStudentTransfer, executeStudentTransfer, TransferError,
} = require('../transfer.service')

beforeEach(() => {
  jest.clearAllMocks()
  createNotifications.mockResolvedValue([])
  walletService.getWallet.mockResolvedValue({ remaining: 8 })
})

function mockStudent(overrides = {}) {
  return { _id: 'student1', role: 'student', toPublic: () => ({ _id: 'student1' }), ...overrides }
}
function mockTeacher(id, overrides = {}) {
  return { _id: id, role: 'teacher', isActive: true, firstNameAr: 'م', lastNameAr: 'ع', toPublic: () => ({ _id: id }), ...overrides }
}
function mockSub(overrides = {}) {
  return { _id: 'sub1', studentId: 'student1', teacherId: 'oldTeacher1', status: 'active', ...overrides }
}

describe('transfer.service.executeStudentTransfer — validation', () => {
  test('rejects a missing reason before any DB read', async () => {
    await expect(executeStudentTransfer('student1', { targetTeacherId: 't2', actorId: 'admin1' })).rejects.toThrow(TransferError)
    expect(User.findOne).not.toHaveBeenCalled()
  })

  test('rejects transferring a student with no active subscription', async () => {
    User.findOne.mockResolvedValueOnce(mockStudent())
    Subscription.findOne.mockReturnValueOnce({ sort: () => Promise.resolve(null) })
    await expect(executeStudentTransfer('student1', { targetTeacherId: 't2', reason: 'x', actorId: 'admin1' }))
      .rejects.toThrow(TransferError)
  })

  test('rejects transferring to the same teacher', async () => {
    User.findOne.mockResolvedValueOnce(mockStudent())
    Subscription.findOne.mockReturnValueOnce({ sort: () => Promise.resolve(mockSub()) })
    await expect(executeStudentTransfer('student1', { targetTeacherId: 'oldTeacher1', reason: 'x', actorId: 'admin1' }))
      .rejects.toThrow(TransferError)
  })

  test('rejects an inactive target teacher', async () => {
    User.findOne.mockResolvedValueOnce(mockStudent())
    Subscription.findOne.mockReturnValueOnce({ sort: () => Promise.resolve(mockSub()) })
    User.findOne.mockResolvedValueOnce(mockTeacher('t2', { isActive: false }))
    await expect(executeStudentTransfer('student1', { targetTeacherId: 't2', reason: 'x', actorId: 'admin1' }))
      .rejects.toThrow(TransferError)
  })
})

describe('transfer.service.executeStudentTransfer — idempotency', () => {
  test('a retried call with the same idempotencyKey is a safe no-op', async () => {
    StudentTransfer.findOne.mockResolvedValueOnce({ _id: 'existing1' })
    const result = await executeStudentTransfer('student1', {
      targetTeacherId: 't2', reason: 'x', actorId: 'admin1', idempotencyKey: 'student1:batch1',
    })
    expect(result.alreadyExecuted).toBe(true)
    expect(User.findOne).not.toHaveBeenCalled()
  })
})

describe('transfer.service.executeStudentTransfer — execution', () => {
  function setupHappyPath({ availabilityValid = true } = {}) {
    User.findOne.mockImplementation(({ _id, role }) => {
      if (_id === 'student1') return Promise.resolve(mockStudent())
      if (_id === 't2') return Promise.resolve(mockTeacher('t2'))
      return Promise.resolve(null)
    })
    Subscription.findOne.mockReturnValue({ sort: () => Promise.resolve(mockSub()) })
    const oldRule = { _id: 'rule1', daysOfWeek: [1], timeOfDay: '18:00', durationMinutes: 60, timezone: 'Asia/Riyadh', frequency: 'weekly', startDate: new Date(), meetingProvider: 'zoom', titleTemplate: 'حصة' }
    ScheduleRule.find.mockResolvedValue([oldRule])
    Session.find.mockResolvedValue([{ _id: 'futureSess1' }])
    availabilityService.checkAvailability.mockResolvedValue({ valid: availabilityValid, conflicts: availabilityValid ? [] : [{ reason: 'teacher_conflict' }] })
    ScheduleRule.updateMany.mockResolvedValue({})
    Session.updateMany.mockResolvedValue({})
    ScheduleRule.create.mockResolvedValue({ _id: 'newRule1' })
    scheduleService.generateSessionsFromRule.mockResolvedValue([{ _id: 'newSess1' }])
    Subscription.updateOne.mockResolvedValue({})
    StudentTransfer.create.mockResolvedValue({ _id: 'transfer1' })
    return { oldRule }
  }

  test('cancels only FUTURE sessions and never touches historical ones (query is scheduledAt >= effectiveDate, status scheduled)', async () => {
    setupHappyPath()
    await executeStudentTransfer('student1', { targetTeacherId: 't2', reason: 'انتقال', actorId: 'admin1' })
    const sessionFindArgs = Session.find.mock.calls[0][0]
    expect(sessionFindArgs.status).toBe('scheduled')
    expect(sessionFindArgs.scheduledAt.$gte).toBeInstanceOf(Date)
    expect(Session.updateMany).toHaveBeenCalledWith(
      { _id: { $in: ['futureSess1'] } },
      expect.objectContaining({ $set: expect.objectContaining({ status: 'cancelled', payrollStatus: 'excluded' }) })
    )
  })

  test('never touches the wallet balance (no applyTransaction call)', async () => {
    setupHappyPath()
    await executeStudentTransfer('student1', { targetTeacherId: 't2', reason: 'انتقال', actorId: 'admin1' })
    expect(walletService.applyTransaction).not.toHaveBeenCalled()
  })

  test('moves the subscription teacherId forward to the new teacher', async () => {
    setupHappyPath()
    await executeStudentTransfer('student1', { targetTeacherId: 't2', reason: 'انتقال', actorId: 'admin1' })
    expect(Subscription.updateOne).toHaveBeenCalledWith({ _id: 'sub1' }, { $set: { teacherId: 't2' } })
  })

  test('ends the old ScheduleRule rather than deleting it (history preserved)', async () => {
    setupHappyPath()
    await executeStudentTransfer('student1', { targetTeacherId: 't2', reason: 'انتقال', actorId: 'admin1' })
    expect(ScheduleRule.updateMany).toHaveBeenCalledWith({ _id: { $in: ['rule1'] } }, { $set: { status: 'ended', endDate: expect.any(Date) } })
    expect(ScheduleRule.deleteMany).not.toHaveBeenCalled()
  })

  test('rejects execution when the final server-side availability re-check fails, even if an earlier preview said it was free', async () => {
    setupHappyPath({ availabilityValid: false })
    await expect(executeStudentTransfer('student1', { targetTeacherId: 't2', reason: 'انتقال', actorId: 'admin1' }))
      .rejects.toThrow(TransferError)
    expect(ScheduleRule.create).not.toHaveBeenCalled()
    expect(Subscription.updateOne).not.toHaveBeenCalled()
  })

  test('rolls back created rule/session/subscription changes if the final StudentTransfer.create write fails', async () => {
    setupHappyPath()
    StudentTransfer.create.mockReset()
    StudentTransfer.create.mockRejectedValueOnce(new Error('write failed'))
    ScheduleRule.deleteMany.mockResolvedValue({})
    Session.deleteMany.mockResolvedValue({})

    await expect(executeStudentTransfer('student1', { targetTeacherId: 't2', reason: 'انتقال', actorId: 'admin1' }))
      .rejects.toThrow('write failed')

    expect(Subscription.updateOne).toHaveBeenCalledWith({ _id: 'sub1', teacherId: 't2' }, { $set: { teacherId: 'oldTeacher1' } })
    expect(ScheduleRule.deleteMany).toHaveBeenCalledWith({ _id: { $in: ['newRule1'] } })
    expect(Session.deleteMany).toHaveBeenCalledWith({ _id: { $in: ['newSess1'] } })
  })
})

describe('transfer.service.previewStudentTransfer', () => {
  test('rejects previewing when there is no active subscription', async () => {
    User.findOne.mockResolvedValueOnce(mockStudent())
    Subscription.findOne.mockReturnValueOnce({ sort: () => Promise.resolve(null) })
    await expect(previewStudentTransfer('student1', { targetTeacherId: 't2' })).rejects.toThrow(TransferError)
  })
})
