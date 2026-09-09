// Mocked-model tests (no DB test infra in this repo — see
// wallet.service.test.js). Exercises the bulk batch driver: it must reuse
// transfer.service's executeStudentTransfer as the only mutation primitive,
// isolate per-student failures, stay resumable, and never auto-deactivate
// the source teacher without the explicit stored choice + full success.
jest.mock('../../models/User')
jest.mock('../../models/Subscription')
jest.mock('../../models/ScheduleRule')
jest.mock('../../models/TeacherReplacementBatch')
jest.mock('../transfer.service')
jest.mock('../audit.service')
jest.mock('../notification.service')

const User = require('../../models/User')
const Subscription = require('../../models/Subscription')
const ScheduleRule = require('../../models/ScheduleRule')
const TeacherReplacementBatch = require('../../models/TeacherReplacementBatch')
const transferService = require('../transfer.service')
const { createNotifications } = require('../notification.service')
const {
  createBatch, runBatch, retryBatch, cancelBatch, setEntryResolution, TeacherReplacementError,
} = require('../teacherReplacement.service')

beforeEach(() => {
  jest.clearAllMocks()
  createNotifications.mockResolvedValue([])
  User.find.mockReturnValue({ select: () => ({ limit: () => Promise.resolve([]) }) })
  User.findById.mockReturnValue({ select: () => Promise.resolve(null) })
})

function mockTeacher(id) {
  return { _id: id, role: 'teacher', isActive: true, toPublic: () => ({ _id: id }) }
}

describe('teacherReplacement.createBatch', () => {
  test('rejects a missing reason', async () => {
    await expect(createBatch('src1', 'tgt1', { actorId: 'admin1' })).rejects.toThrow(TeacherReplacementError)
  })

  test('classifies a student with no active schedule rule as missing_data and auto-deselects it', async () => {
    User.findOne.mockResolvedValueOnce(mockTeacher('src1'))
    transferService.assertTargetTeacherValid.mockResolvedValueOnce(mockTeacher('tgt1'))
    Subscription.find.mockResolvedValueOnce([{ studentId: 's1', _id: 'sub1' }])
    ScheduleRule.find.mockResolvedValueOnce([]) // no active rules for s1
    TeacherReplacementBatch.create.mockImplementationOnce((doc) => Promise.resolve({ _id: 'batch1', ...doc }))

    const batch = await createBatch('src1', 'tgt1', { reason: 'ترك العمل', actorId: 'admin1' })
    expect(batch.entries[0].classification).toBe('missing_data')
    expect(batch.entries[0].selected).toBe(false)
  })

  test('classifies a student with an available slot as ready, and a conflicting one as conflict', async () => {
    User.findOne.mockResolvedValueOnce(mockTeacher('src1'))
    transferService.assertTargetTeacherValid.mockResolvedValueOnce(mockTeacher('tgt1'))
    Subscription.find.mockResolvedValueOnce([{ studentId: 's1', _id: 'sub1' }, { studentId: 's2', _id: 'sub2' }])
    ScheduleRule.find
      .mockResolvedValueOnce([{ _id: 'r1' }]) // s1's rules
      .mockResolvedValueOnce([{ _id: 'r2' }]) // s2's rules
    transferService.computeScheduleResolution
      .mockResolvedValueOnce([{ rule: { _id: 'r1' }, valid: true, days: [], conflicts: [], alternatives: [] }])
      .mockResolvedValueOnce([{ rule: { _id: 'r2' }, valid: false, days: [], conflicts: [{ reason: 'teacher_conflict' }], alternatives: [] }])
    TeacherReplacementBatch.create.mockImplementationOnce((doc) => Promise.resolve({ _id: 'batch1', ...doc }))

    const batch = await createBatch('src1', 'tgt1', { reason: 'ترك العمل', actorId: 'admin1' })
    expect(batch.entries[0].classification).toBe('ready')
    expect(batch.entries[1].classification).toBe('conflict')
  })

  test('only the explicitly selected studentIds are marked selected', async () => {
    User.findOne.mockResolvedValueOnce(mockTeacher('src1'))
    transferService.assertTargetTeacherValid.mockResolvedValueOnce(mockTeacher('tgt1'))
    Subscription.find.mockResolvedValueOnce([{ studentId: 's1', _id: 'sub1' }, { studentId: 's2', _id: 'sub2' }])
    ScheduleRule.find.mockResolvedValueOnce([{ _id: 'r1' }]).mockResolvedValueOnce([{ _id: 'r2' }])
    transferService.computeScheduleResolution
      .mockResolvedValueOnce([{ rule: { _id: 'r1' }, valid: true, days: [], conflicts: [], alternatives: [] }])
      .mockResolvedValueOnce([{ rule: { _id: 'r2' }, valid: true, days: [], conflicts: [], alternatives: [] }])
    TeacherReplacementBatch.create.mockImplementationOnce((doc) => Promise.resolve({ _id: 'batch1', ...doc }))

    const batch = await createBatch('src1', 'tgt1', { reason: 'x', studentIds: ['s1'], actorId: 'admin1' })
    expect(batch.entries.find((e) => e.studentId === 's1').selected).toBe(true)
    expect(batch.entries.find((e) => e.studentId === 's2').selected).toBe(false)
  })
})

function makeBatchDoc(entries, overrides = {}) {
  const doc = {
    _id: 'batch1', sourceTeacherId: 'src1', targetTeacherId: 'tgt1', reason: 'x',
    effectiveDate: new Date(), status: 'draft', entries, deactivateSourceTeacherOnSuccess: false,
    sourceTeacherDeactivated: false, save: jest.fn().mockResolvedValue(true), ...overrides,
  }
  return doc
}

describe('teacherReplacement.runBatch', () => {
  test('processes each selected pending entry through transfer.service.executeStudentTransfer and isolates a single failure', async () => {
    const entries = [
      { studentId: 's1', classification: 'ready', selected: true, result: 'pending' },
      { studentId: 's2', classification: 'ready', selected: true, result: 'pending' },
    ]
    const batch = makeBatchDoc(entries)
    TeacherReplacementBatch.findById.mockResolvedValueOnce(batch)
    transferService.executeStudentTransfer
      .mockResolvedValueOnce({ transfer: { _id: 't1' }, alreadyExecuted: false })
      .mockRejectedValueOnce(new Error('تعارض غير متوقع'))

    const result = await runBatch('batch1', { actorId: 'admin1' })

    expect(transferService.executeStudentTransfer).toHaveBeenCalledTimes(2)
    expect(result.entries[0].result).toBe('success')
    expect(result.entries[1].result).toBe('failed')
    expect(result.entries[1].errorMessage).toBe('تعارض غير متوقع')
    expect(result.status).toBe('partial')
  })

  test('a conflict entry with no resolvedSchedule fails cleanly without calling executeStudentTransfer', async () => {
    const entries = [{ studentId: 's1', classification: 'conflict', selected: true, result: 'pending', resolvedSchedule: [] }]
    const batch = makeBatchDoc(entries)
    TeacherReplacementBatch.findById.mockResolvedValueOnce(batch)

    const result = await runBatch('batch1', { actorId: 'admin1' })
    expect(transferService.executeStudentTransfer).not.toHaveBeenCalled()
    expect(result.entries[0].result).toBe('failed')
    expect(result.status).toBe('failed')
  })

  test('a student with multiple simultaneously-conflicting rules gets each resolved to its own alternative slot', async () => {
    const entries = [{
      studentId: 's1', classification: 'conflict', selected: true, result: 'pending',
      conflictingRuleIds: ['r1', 'r2'],
      resolvedSchedule: [
        { ruleId: 'r1', dayOfWeek: 1, time: '10:00' },
        { ruleId: 'r2', dayOfWeek: 3, time: '12:00' },
      ],
    }]
    const batch = makeBatchDoc(entries)
    TeacherReplacementBatch.findById.mockResolvedValueOnce(batch)
    ScheduleRule.find.mockResolvedValueOnce([{ _id: 'r1' }, { _id: 'r2' }])
    transferService.executeStudentTransfer.mockResolvedValueOnce({ transfer: { _id: 't1' }, alreadyExecuted: false })

    const result = await runBatch('batch1', { actorId: 'admin1' })
    expect(transferService.executeStudentTransfer).toHaveBeenCalledWith('s1', expect.objectContaining({
      scheduleDecisions: {
        r1: { dayOfWeek: 1, time: '10:00' },
        r2: { dayOfWeek: 3, time: '12:00' },
      },
    }))
    expect(result.entries[0].result).toBe('success')
  })

  test('a conflict entry with only SOME of its conflicting rules resolved is blocked from running', async () => {
    const entries = [{
      studentId: 's1', classification: 'conflict', selected: true, result: 'pending',
      conflictingRuleIds: ['r1', 'r2'],
      resolvedSchedule: [{ ruleId: 'r1', dayOfWeek: 1, time: '10:00' }],
    }]
    const batch = makeBatchDoc(entries)
    TeacherReplacementBatch.findById.mockResolvedValueOnce(batch)

    const result = await runBatch('batch1', { actorId: 'admin1' })
    expect(transferService.executeStudentTransfer).not.toHaveBeenCalled()
    expect(result.entries[0].result).toBe('failed')
  })

  test('deactivates the source teacher ONLY when the flag was set AND the batch fully succeeded', async () => {
    const entries = [{ studentId: 's1', classification: 'ready', selected: true, result: 'pending' }]
    const batch = makeBatchDoc(entries, { deactivateSourceTeacherOnSuccess: true })
    TeacherReplacementBatch.findById.mockResolvedValueOnce(batch)
    transferService.executeStudentTransfer.mockResolvedValueOnce({ transfer: { _id: 't1' }, alreadyExecuted: false })
    User.updateOne.mockResolvedValueOnce({})

    const result = await runBatch('batch1', { actorId: 'admin1' })
    expect(result.status).toBe('completed')
    expect(User.updateOne).toHaveBeenCalledWith({ _id: 'src1' }, { $set: { isActive: false } })
    expect(result.sourceTeacherDeactivated).toBe(true)
  })

  test('does NOT deactivate the source teacher when the flag was set but the batch only partially succeeded', async () => {
    const entries = [
      { studentId: 's1', classification: 'ready', selected: true, result: 'pending' },
      { studentId: 's2', classification: 'ready', selected: true, result: 'pending' },
    ]
    const batch = makeBatchDoc(entries, { deactivateSourceTeacherOnSuccess: true })
    TeacherReplacementBatch.findById.mockResolvedValueOnce(batch)
    transferService.executeStudentTransfer
      .mockResolvedValueOnce({ transfer: { _id: 't1' }, alreadyExecuted: false })
      .mockRejectedValueOnce(new Error('failed'))

    const result = await runBatch('batch1', { actorId: 'admin1' })
    expect(result.status).toBe('partial')
    expect(User.updateOne).not.toHaveBeenCalled()
  })

  test('running an already-completed batch again is a safe idempotent no-op, not an error (duplicate-submission safety)', async () => {
    const batch = makeBatchDoc([], { status: 'completed' })
    TeacherReplacementBatch.findById.mockResolvedValueOnce(batch)
    const result = await runBatch('batch1', { actorId: 'admin1' })
    expect(result.status).toBe('completed')
    expect(batch.save).not.toHaveBeenCalled()
    expect(transferService.executeStudentTransfer).not.toHaveBeenCalled()
  })

  test('running an already-cancelled batch again is also a safe no-op', async () => {
    const batch = makeBatchDoc([], { status: 'cancelled' })
    TeacherReplacementBatch.findById.mockResolvedValueOnce(batch)
    const result = await runBatch('batch1', { actorId: 'admin1' })
    expect(result.status).toBe('cancelled')
  })

  test('a batch larger than the per-run bound leaves the remainder pending for a resumed call', async () => {
    const { MAX_ENTRIES_PER_RUN } = require('../teacherReplacement.service')
    const entries = Array.from({ length: MAX_ENTRIES_PER_RUN + 5 }, (_, i) => ({
      studentId: `s${i}`, classification: 'ready', selected: true, result: 'pending',
    }))
    const batch = makeBatchDoc(entries)
    TeacherReplacementBatch.findById.mockResolvedValueOnce(batch)
    transferService.executeStudentTransfer.mockResolvedValue({ transfer: { _id: 't1' }, alreadyExecuted: false })

    const result = await runBatch('batch1', { actorId: 'admin1' })
    expect(transferService.executeStudentTransfer).toHaveBeenCalledTimes(MAX_ENTRIES_PER_RUN)
    const stillPending = result.entries.filter((e) => e.result === 'pending')
    expect(stillPending.length).toBe(5)
    // Not yet terminal ('completed'/'partial'/'failed') — 'running' signals
    // resuming with another runBatch call is required to finish the rest.
    expect(result.status).toBe('running')
  })
})

describe('teacherReplacement.setEntryResolution', () => {
  test('upserts a per-rule decision without disturbing another rule\'s existing decision', async () => {
    const entries = [{
      studentId: 's1', classification: 'conflict', selected: true, result: 'pending',
      conflictingRuleIds: ['r1', 'r2'],
      resolvedSchedule: [{ ruleId: 'r1', dayOfWeek: 1, time: '10:00' }],
    }]
    const batch = makeBatchDoc(entries)
    TeacherReplacementBatch.findById.mockResolvedValueOnce(batch)

    const result = await setEntryResolution('batch1', 's1', [{ ruleId: 'r2', dayOfWeek: 3, time: '12:00' }])
    expect(result.entries[0].resolvedSchedule).toEqual([
      { ruleId: 'r1', dayOfWeek: 1, time: '10:00' },
      { ruleId: 'r2', dayOfWeek: 3, time: '12:00' },
    ])
  })

  test('re-resolving the same rule replaces its previous decision rather than duplicating it', async () => {
    const entries = [{
      studentId: 's1', classification: 'conflict', selected: true, result: 'pending',
      conflictingRuleIds: ['r1'],
      resolvedSchedule: [{ ruleId: 'r1', dayOfWeek: 1, time: '10:00' }],
    }]
    const batch = makeBatchDoc(entries)
    TeacherReplacementBatch.findById.mockResolvedValueOnce(batch)

    const result = await setEntryResolution('batch1', 's1', [{ ruleId: 'r1', dayOfWeek: 5, time: '14:00' }])
    expect(result.entries[0].resolvedSchedule).toEqual([{ ruleId: 'r1', dayOfWeek: 5, time: '14:00' }])
  })
})

describe('teacherReplacement.retryBatch / cancelBatch', () => {
  test('retryBatch resets only failed selected entries back to pending, then reruns', async () => {
    const entries = [
      { studentId: 's1', classification: 'ready', selected: true, result: 'success' },
      { studentId: 's2', classification: 'ready', selected: true, result: 'failed', errorMessage: 'x' },
    ]
    const batch = makeBatchDoc(entries, { status: 'partial' })
    TeacherReplacementBatch.findById.mockResolvedValueOnce(batch).mockResolvedValueOnce(batch)
    transferService.executeStudentTransfer.mockResolvedValueOnce({ transfer: { _id: 't2' }, alreadyExecuted: false })

    const result = await retryBatch('batch1', { actorId: 'admin1' })
    expect(transferService.executeStudentTransfer).toHaveBeenCalledTimes(1) // only the previously-failed one
    expect(result.entries[1].result).toBe('success')
  })

  test('retryBatch rejects when there is nothing failed to retry', async () => {
    const batch = makeBatchDoc([{ studentId: 's1', classification: 'ready', selected: true, result: 'success' }])
    TeacherReplacementBatch.findById.mockResolvedValueOnce(batch)
    await expect(retryBatch('batch1', { actorId: 'admin1' })).rejects.toThrow(TeacherReplacementError)
  })

  test('cancelBatch marks remaining pending entries skipped and never touches already-succeeded ones', async () => {
    const entries = [
      { studentId: 's1', classification: 'ready', selected: true, result: 'success' },
      { studentId: 's2', classification: 'ready', selected: true, result: 'pending' },
    ]
    const batch = makeBatchDoc(entries, { status: 'running' })
    TeacherReplacementBatch.findById.mockResolvedValueOnce(batch)

    const result = await cancelBatch('batch1', { actorId: 'admin1' })
    expect(result.entries[0].result).toBe('success')
    expect(result.entries[1].result).toBe('skipped')
    expect(result.status).toBe('cancelled')
  })
})
