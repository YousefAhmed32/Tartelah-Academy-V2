// Mocked-model tests — see wallet.service.test.js for the established pattern.
jest.mock('../../models/Session')
jest.mock('../../models/QuranSessionReport')
jest.mock('../../models/User')
jest.mock('../academySettings.service')
// Short readable test ids ('t1', ...) aren't real hex ObjectId strings — see
// payrollLedger.service.test.js's identical comment.
jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose')
  return { ...actual, Types: { ...actual.Types, ObjectId: jest.fn((id) => id) } }
})

const Session = require('../../models/Session')
const QuranSessionReport = require('../../models/QuranSessionReport')
const User = require('../../models/User')
const { getAcademyTimezone } = require('../academySettings.service')
const { getTeacherDailyProgress, getTeacherOverdueReports, getAdminReportOverview, getMonthlyCompletionRatio } = require('../reportTracking.service')

beforeEach(() => {
  jest.clearAllMocks()
  getAcademyTimezone.mockResolvedValue('Africa/Cairo')
})

function sessionsQuery(rows) {
  return { select: () => ({ populate: () => ({ sort: () => Promise.resolve(rows) }) }) }
}

describe('reportTracking.getTeacherDailyProgress', () => {
  test('a session with a submitted report is NOT counted as missing', async () => {
    const sessions = [
      { _id: 's1', studentId: { _id: 'st1', firstNameAr: 'أحمد', lastNameAr: 'علي' }, scheduledAt: new Date() },
      { _id: 's2', studentId: { _id: 'st2', firstNameAr: 'سارة', lastNameAr: 'محمد' }, scheduledAt: new Date() },
    ]
    Session.find.mockReturnValueOnce(sessionsQuery(sessions))
    QuranSessionReport.find.mockReturnValue({ select: () => Promise.resolve([{ sessionId: 's1' }]) })

    const result = await getTeacherDailyProgress('t1')
    expect(Session.find).toHaveBeenCalledWith(expect.objectContaining({ quranReportRequired: { $ne: false } }))
    expect(result.total).toBe(2)
    expect(result.reportedCount).toBe(1)
    expect(result.missing).toHaveLength(1)
    expect(result.missing[0].sessionId).toBe('s2')
    expect(result.allDone).toBe(false)
  })

  test('allDone is true only when there is at least one session and none are missing', async () => {
    Session.find.mockReturnValueOnce(sessionsQuery([]))
    QuranSessionReport.find.mockReturnValue({ select: () => Promise.resolve([]) })
    const result = await getTeacherDailyProgress('t1')
    expect(result.allDone).toBe(false) // zero sessions today is not "all done"
  })
})

describe('reportTracking.getTeacherOverdueReports', () => {
  test('only counts sessions past the minAgeHours cutoff', async () => {
    const now = Date.now()
    const oldSession = { _id: 's1', studentId: { _id: 'st1', firstNameAr: 'أحمد', lastNameAr: 'علي' }, scheduledAt: new Date(now - 48 * 3600000) }
    Session.find.mockReturnValueOnce(sessionsQuery([oldSession]))
    QuranSessionReport.find.mockReturnValue({ select: () => Promise.resolve([]) })

    const result = await getTeacherOverdueReports('t1', { minAgeHours: 24 })
    expect(Session.find).toHaveBeenCalledWith(expect.objectContaining({ quranReportRequired: { $ne: false } }))
    expect(result).toHaveLength(1)
    expect(result[0].ageHours).toBeGreaterThanOrEqual(24)
  })
})

describe('reportTracking.getAdminReportOverview', () => {
  test('derives conducted/missingReport correctly from session-status counts + report set', async () => {
    Session.aggregate.mockResolvedValueOnce([
      { _id: 'completed', count: 10 }, { _id: 'no_show', count: 2 },
      { _id: 'cancelled', count: 3 }, { _id: 'rescheduled', count: 1 },
    ])
    Session.find.mockReturnValueOnce({ select: () => Promise.resolve(Array.from({ length: 10 }, (_, i) => ({ _id: `s${i}` }))) })
    QuranSessionReport.find.mockReturnValueOnce({ select: () => Promise.resolve(Array.from({ length: 7 }, (_, i) => ({ sessionId: `s${i}` }))) })

    const result = await getAdminReportOverview({})
    expect(Session.find).toHaveBeenCalledWith(expect.objectContaining({ quranReportRequired: { $ne: false } }))
    expect(result.scheduled).toBe(16)
    expect(result.conducted).toBe(12)
    expect(result.reportCompleted).toBe(7)
    expect(result.missingReport).toBe(3)
    expect(result.cancelled).toBe(3)
    expect(result.postponed).toBe(1)
  })
})

describe('reportTracking.getMonthlyCompletionRatio', () => {
  test('formats a human "X من Y" label', async () => {
    Session.find.mockReturnValueOnce({ select: () => Promise.resolve(Array.from({ length: 60 }, (_, i) => ({ _id: `s${i}` }))) })
    QuranSessionReport.find.mockReturnValueOnce({ select: () => Promise.resolve(Array.from({ length: 30 }, (_, i) => ({ sessionId: `s${i}` }))) })
    const result = await getMonthlyCompletionRatio({ teacherId: 't1', year: 2026, month: 9 })
    expect(Session.find).toHaveBeenCalledWith(expect.objectContaining({ quranReportRequired: { $ne: false } }))
    expect(result.label).toBe('30 من 60')
  })
})
