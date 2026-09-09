// Mocked-model tests — see wallet.service.test.js for the established pattern.
jest.mock('../../models/Session')
jest.mock('../../models/QuranSessionReport')
jest.mock('../../models/Memorization')
jest.mock('../../models/Revision')

const Session = require('../../models/Session')
const QuranSessionReport = require('../../models/QuranSessionReport')
const Memorization = require('../../models/Memorization')
const Revision = require('../../models/Revision')
const { saveDraft, submitReport, requestCorrection, approveReport, QuranReportError } = require('../quranReport.service')

beforeEach(() => { jest.clearAllMocks() })

describe('quranReport.saveDraft', () => {
  test('rejects when the teacher does not own the session', async () => {
    Session.findOne.mockResolvedValueOnce(null)
    await expect(saveDraft('s1', { teacherId: 't1', fields: {} })).rejects.toThrow(QuranReportError)
  })

  test('creates a fresh draft on first save, with a "created" history entry', async () => {
    Session.findOne.mockResolvedValueOnce({ _id: 's1', studentId: 'st1', teacherId: 't1' })
    QuranSessionReport.findOne.mockResolvedValueOnce(null)
    const created = { status: 'draft', save: jest.fn().mockResolvedValue(true) }
    QuranSessionReport.create.mockResolvedValueOnce(created)

    const report = await saveDraft('s1', { teacherId: 't1', fields: { teacherNotes: 'ملاحظة' } })
    expect(QuranSessionReport.create).toHaveBeenCalledWith(expect.objectContaining({
      sessionId: 's1', studentId: 'st1', teacherId: 't1', history: [{ action: 'created', actorId: 't1' }],
    }))
    expect(report.teacherNotes).toBe('ملاحظة')
    expect(report.save).toHaveBeenCalled()
  })

  test('refuses to edit an already-submitted/approved report as a draft', async () => {
    Session.findOne.mockResolvedValueOnce({ _id: 's1', studentId: 'st1', teacherId: 't1' })
    QuranSessionReport.findOne.mockResolvedValueOnce({ status: 'approved' })
    await expect(saveDraft('s1', { teacherId: 't1', fields: {} })).rejects.toThrow(QuranReportError)
  })
})

describe('quranReport.submitReport', () => {
  test('submits a draft, and creates memorization/revision entries through the canonical models', async () => {
    Session.findOne.mockResolvedValueOnce({ _id: 's1', studentId: 'st1', teacherId: 't1' })
    QuranSessionReport.findOne.mockResolvedValueOnce({ status: 'draft', history: [], save: jest.fn().mockResolvedValue(true) })
    Memorization.create.mockResolvedValue({})
    Revision.create.mockResolvedValue({})

    const report = await submitReport('s1', {
      teacherId: 't1', fields: { teacherNotes: 'ملاحظة' },
      memorization: [{ surahNumber: 2, fromAyah: 1, toAyah: 10, quality: 'good' }],
      revision: [{ surahNumber: 1, fromAyah: 1, toAyah: 7, quality: 'excellent' }],
    })

    expect(report.status).toBe('submitted')
    expect(report.history[0].action).toBe('submitted')
    expect(Memorization.create).toHaveBeenCalledWith(expect.objectContaining({ studentId: 'st1', teacherId: 't1', sessionId: 's1', surahNumber: 2 }))
    expect(Revision.create).toHaveBeenCalledWith(expect.objectContaining({ studentId: 'st1', teacherId: 't1', sessionId: 's1', surahNumber: 1 }))
  })

  test('a resubmission after correction_requested is logged as "resubmitted", not "submitted"', async () => {
    Session.findOne.mockResolvedValueOnce({ _id: 's1', studentId: 'st1', teacherId: 't1' })
    QuranSessionReport.findOne.mockResolvedValueOnce({ status: 'correction_requested', history: [], save: jest.fn().mockResolvedValue(true) })
    const report = await submitReport('s1', { teacherId: 't1', fields: {} })
    expect(report.history[0].action).toBe('resubmitted')
  })

  test('refuses to submit an already-approved report', async () => {
    Session.findOne.mockResolvedValueOnce({ _id: 's1', studentId: 'st1', teacherId: 't1' })
    QuranSessionReport.findOne.mockResolvedValueOnce({ status: 'approved' })
    await expect(submitReport('s1', { teacherId: 't1', fields: {} })).rejects.toThrow(QuranReportError)
  })
})

describe('quranReport.requestCorrection / approveReport', () => {
  test('requestCorrection requires a reason and only applies to a submitted report', async () => {
    await expect(requestCorrection('r1', { adminId: 'a1' })).rejects.toThrow(QuranReportError)
    QuranSessionReport.findById.mockResolvedValueOnce({ status: 'draft' })
    await expect(requestCorrection('r1', { adminId: 'a1', reason: 'ناقص' })).rejects.toThrow(QuranReportError)
  })

  test('requestCorrection moves submitted -> correction_requested', async () => {
    const report = { status: 'submitted', history: [], save: jest.fn().mockResolvedValue(true) }
    QuranSessionReport.findById.mockResolvedValueOnce(report)
    await requestCorrection('r1', { adminId: 'a1', reason: 'ناقص المدة' })
    expect(report.status).toBe('correction_requested')
    expect(report.correctionReason).toBe('ناقص المدة')
  })

  test('approveReport only applies to a submitted report', async () => {
    QuranSessionReport.findById.mockResolvedValueOnce({ status: 'draft' })
    await expect(approveReport('r1', { adminId: 'a1' })).rejects.toThrow(QuranReportError)
  })

  test('approveReport moves submitted -> approved and stamps the reviewer', async () => {
    const report = { status: 'submitted', history: [], save: jest.fn().mockResolvedValue(true) }
    QuranSessionReport.findById.mockResolvedValueOnce(report)
    await approveReport('r1', { adminId: 'a1' })
    expect(report.status).toBe('approved')
    expect(report.reviewedBy).toBe('a1')
  })
})
