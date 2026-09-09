// Mocked-model tests — see wallet.service.test.js for the established pattern.
jest.mock('../../models/Session')
jest.mock('../../models/Subscription')
jest.mock('../../models/MonthlyTeacherReport')
jest.mock('../../models/User')
jest.mock('../teacherPerformance.service')
jest.mock('../payrollPeriod.service')
jest.mock('../reportTracking.service')
jest.mock('../notification.service', () => ({ createNotification: jest.fn().mockResolvedValue(undefined) }))
jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose')
  return { ...actual, Types: { ...actual.Types, ObjectId: jest.fn((id) => id) } }
})

const Session = require('../../models/Session')
const Subscription = require('../../models/Subscription')
const MonthlyTeacherReport = require('../../models/MonthlyTeacherReport')
const User = require('../../models/User')
const teacherPerformance = require('../teacherPerformance.service')
const payrollPeriod = require('../payrollPeriod.service')
const reportTracking = require('../reportTracking.service')
const {
  generateReport, submitReport, requestCompletion, markReviewed, approveReport, MonthlyReportError,
} = require('../monthlyReport.service')

beforeEach(() => {
  jest.clearAllMocks()
  Session.aggregate.mockResolvedValue([{ _id: 'completed', count: 8 }, { _id: 'cancelled', count: 1 }])
  teacherPerformance.getAttendanceSummary.mockResolvedValue({ on_time: 6, late: 2, absent: 0, excused: 0, completionRate: 100, punctualityRate: 75 })
  Subscription.countDocuments.mockResolvedValue(5)
  reportTracking.getMonthlyCompletionRatio.mockResolvedValue({ total: 8, reported: 6, label: '6 من 8' })
  payrollPeriod.getOrCreatePeriod.mockResolvedValue({ _id: 'period1' })
  payrollPeriod.getPeriodWithTotals.mockResolvedValue({ grossEntitlement: 800, bonusesTotal: 50, deductionsTotal: 0, settlementsTotal: 0, netPayable: 850 })
})

describe('monthlyReport.generateReport', () => {
  test('creates a fresh draft with a full snapshot on first generation', async () => {
    MonthlyTeacherReport.findOne.mockResolvedValueOnce(null)
    const saved = { save: jest.fn().mockResolvedValue(true) }
    MonthlyTeacherReport.mockImplementationOnce((doc) => Object.assign(saved, doc))

    const report = await generateReport('t1', 2026, 9, { isSystem: true })
    expect(report.completedSessions).toBe(8)
    expect(report.cancelledSessions).toBe(1)
    expect(report.missingReports).toBe(2) // 8 total - 6 reported
    expect(report.netPayable).toBe(850)
    expect(report.generatedBy).toBe('system')
    expect(report.history[0].action).toBe('generated')
  })

  test('refuses to regenerate a report that has already been submitted or further along', async () => {
    MonthlyTeacherReport.findOne.mockResolvedValueOnce({ status: 'submitted' })
    await expect(generateReport('t1', 2026, 9, {})).rejects.toThrow(MonthlyReportError)
  })

  test('regenerating an existing DRAFT updates it in place and logs "regenerated"', async () => {
    const existing = { status: 'draft', history: [], save: jest.fn().mockResolvedValue(true) }
    MonthlyTeacherReport.findOne.mockResolvedValueOnce(existing)
    const report = await generateReport('t1', 2026, 9, { actorId: 'admin1' })
    expect(report).toBe(existing)
    expect(report.history[0].action).toBe('regenerated')
    expect(report.completedSessions).toBe(8)
  })
})

describe('monthlyReport.submitReport', () => {
  test('only a draft or needs_completion report can be submitted', async () => {
    MonthlyTeacherReport.findOne.mockResolvedValueOnce({ status: 'approved' })
    await expect(submitReport('r1', { teacherId: 't1', fields: {} })).rejects.toThrow(MonthlyReportError)
  })

  test('submitting saves the teacher-authored narrative fields', async () => {
    const report = { status: 'draft', history: [], save: jest.fn().mockResolvedValue(true) }
    MonthlyTeacherReport.findOne.mockResolvedValueOnce(report)
    await submitReport('r1', { teacherId: 't1', fields: { teacherNotes: 'ملاحظة', challenges: 'تحدٍّ', recommendations: 'توصية' } })
    expect(report.teacherNotes).toBe('ملاحظة')
    expect(report.status).toBe('submitted')
    expect(report.history[0].action).toBe('submitted')
  })
})

describe('monthlyReport.requestCompletion / markReviewed / approveReport', () => {
  test('requestCompletion requires a note and only applies to a submitted report', async () => {
    await expect(requestCompletion('r1', { adminId: 'a1' })).rejects.toThrow(MonthlyReportError)
    MonthlyTeacherReport.findById.mockResolvedValueOnce({ status: 'draft' })
    await expect(requestCompletion('r1', { adminId: 'a1', note: 'ناقص' })).rejects.toThrow(MonthlyReportError)
  })

  test('requestCompletion moves submitted -> needs_completion', async () => {
    const report = { status: 'submitted', history: [], save: jest.fn().mockResolvedValue(true) }
    MonthlyTeacherReport.findById.mockResolvedValueOnce(report)
    await requestCompletion('r1', { adminId: 'a1', note: 'أضف تفاصيل الحضور' })
    expect(report.status).toBe('needs_completion')
  })

  test('approveReport accepts either submitted or reviewed, never draft', async () => {
    MonthlyTeacherReport.findById.mockResolvedValueOnce({ status: 'draft' })
    await expect(approveReport('r1', { adminId: 'a1' })).rejects.toThrow(MonthlyReportError)

    const report = { status: 'reviewed', history: [], save: jest.fn().mockResolvedValue(true) }
    MonthlyTeacherReport.findById.mockResolvedValueOnce(report)
    await approveReport('r1', { adminId: 'a1' })
    expect(report.status).toBe('approved')
    expect(report.approvedAt).toBeInstanceOf(Date)
  })
})
