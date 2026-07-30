// Exercises the full deduction matrix from ARCHITECTURE_PLAN.md's Lesson
// Wallet section — this is the single most business-critical piece of the
// redesign, so every row of the matrix gets its own assertion. wallet.service
// and compensation.service are mocked (this repo has no DB test infra — see
// controllers/__tests__/course.controller.test.js) so these tests verify
// exactly what lessonDeduction.service.js decides to call, not the DB writes
// themselves (those are covered by wallet.service.test.js).

jest.mock('../wallet.service')
jest.mock('../compensation.service')

const walletService = require('../wallet.service')
const compensationService = require('../compensation.service')
const lessonDeduction = require('../lessonDeduction.service')

function makeSession(overrides = {}) {
  return {
    _id: 'sess1', studentId: 'stu1', subscriptionId: 'sub1',
    subscriptionConsumed: false, subscriptionConsumedAt: null,
    lessonConsumedTransactionId: undefined, lessonConsumptionSeq: 0,
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h from now by default
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  walletService.applyTransaction.mockResolvedValue({ transaction: { _id: 'tx1' }, alreadyApplied: false })
  compensationService.grantCompensation.mockResolvedValue({ alreadyGranted: false, transaction: { _id: 'ctx1' } })
})

describe('syncLessonConsumption — attendance-driven deduction', () => {
  test.each(['present', 'late', 'left_early', 'absent'])('consumes a lesson for attendance status "%s"', async (status) => {
    const session = makeSession()
    await lessonDeduction.syncLessonConsumption(session, status)

    expect(walletService.applyTransaction).toHaveBeenCalledWith(expect.objectContaining({
      studentId: 'stu1', type: 'consumption', amount: -1, idempotencyKey: 'session:sess1:consume:1',
    }))
    expect(session.subscriptionConsumed).toBe(true)
    expect(session.lessonConsumedTransactionId).toBe('tx1')
  })

  test.each(['excused', 'technical_issue'])('does NOT consume for non-qualifying status "%s"', async (status) => {
    const session = makeSession()
    await lessonDeduction.syncLessonConsumption(session, status)
    expect(walletService.applyTransaction).not.toHaveBeenCalled()
    expect(session.subscriptionConsumed).toBe(false)
  })

  test('re-running with the same consuming status is a no-op (idempotent)', async () => {
    const session = makeSession({ subscriptionConsumed: true, lessonConsumedTransactionId: 'tx1', lessonConsumptionSeq: 1 })
    await lessonDeduction.syncLessonConsumption(session, 'present')
    expect(walletService.applyTransaction).not.toHaveBeenCalled()
  })

  test('a correction away from a consuming status releases the lesson', async () => {
    const session = makeSession({ subscriptionConsumed: true, lessonConsumedTransactionId: 'tx1', lessonConsumptionSeq: 1 })
    await lessonDeduction.syncLessonConsumption(session, 'excused')

    expect(walletService.applyTransaction).toHaveBeenCalledWith(expect.objectContaining({
      type: 'reversal', amount: 1, idempotencyKey: 'session:sess1:release:tx1',
    }))
    expect(session.subscriptionConsumed).toBe(false)
  })
})

describe('handleCancellation — the full cancellation matrix', () => {
  test('teacher cancellation: no deduction, compensation auto-granted', async () => {
    const session = makeSession()
    const result = await lessonDeduction.handleCancellation(session, { cancelledByRole: 'teacher' })

    expect(walletService.applyTransaction).not.toHaveBeenCalled() // nothing to release — was never consumed
    expect(compensationService.grantCompensation).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ deducted: false, compensationGranted: true })
  })

  test('admin cancellation (academy-caused): no deduction, compensation auto-granted', async () => {
    const session = makeSession()
    const result = await lessonDeduction.handleCancellation(session, { cancelledByRole: 'admin' })
    expect(compensationService.grantCompensation).toHaveBeenCalledTimes(1)
    expect(result.compensationGranted).toBe(true)
  })

  test('student cancels well before the window closes: no deduction, no compensation', async () => {
    const session = makeSession({ scheduledAt: new Date(Date.now() + 48 * 60 * 60 * 1000) }) // 48h out
    const result = await lessonDeduction.handleCancellation(session, { cancelledByRole: 'student' })

    expect(walletService.applyTransaction).not.toHaveBeenCalled() // never consumed, nothing to release
    expect(compensationService.grantCompensation).not.toHaveBeenCalled()
    expect(result).toEqual({ deducted: false, compensationGranted: false })
  })

  test('student cancels inside the 12h window: deducted, no compensation', async () => {
    const session = makeSession({ scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000) }) // 2h out
    const result = await lessonDeduction.handleCancellation(session, { cancelledByRole: 'student' })

    expect(walletService.applyTransaction).toHaveBeenCalledWith(expect.objectContaining({ type: 'consumption', amount: -1 }))
    expect(compensationService.grantCompensation).not.toHaveBeenCalled()
    expect(result).toEqual({ deducted: true, compensationGranted: false })
  })

  test('an already-consumed session cancelled by the academy is released, not left deducted', async () => {
    const session = makeSession({ subscriptionConsumed: true, lessonConsumedTransactionId: 'tx1', lessonConsumptionSeq: 1 })
    await lessonDeduction.handleCancellation(session, { cancelledByRole: 'teacher' })

    expect(walletService.applyTransaction).toHaveBeenCalledWith(expect.objectContaining({ type: 'reversal', amount: 1 }))
    expect(session.subscriptionConsumed).toBe(false)
  })
})

describe('handleTeacherNoShow', () => {
  test('never costs the student a lesson and auto-grants compensation', async () => {
    const session = makeSession()
    const result = await lessonDeduction.handleTeacherNoShow(session)

    expect(compensationService.grantCompensation).toHaveBeenCalledTimes(1)
    expect(result.deducted).toBe(false)
    expect(result.compensationGranted).toBe(true)
  })
})
