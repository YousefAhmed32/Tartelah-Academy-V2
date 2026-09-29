jest.mock('../../models/QuranSessionReport')
jest.mock('../../models/Session')
jest.mock('../../models/User')
jest.mock('../../services/quranReport.service')
jest.mock('../../services/reportTracking.service')
jest.mock('../../services/notification.service')
jest.mock('../../services/audit.service')

const Report = require('../../models/QuranSessionReport')
const reportService = require('../../services/quranReport.service')
const ctrl = require('../quranReport.controller')

const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() })
beforeEach(() => jest.clearAllMocks())

test('student list projects only the fields intended for students', async () => {
  let projection
  Report.find.mockReturnValue({ select: (fields) => { projection = fields; return { sort: () => ({ skip: () => ({ limit: () => ({ populate: () => ({ populate: async () => [] }) }) }) }) } } })
  Report.countDocuments.mockResolvedValue(0)
  const res = response()
  await ctrl.getMyStudentReports({ user: { _id: 'student' }, query: {} }, res, jest.fn())
  expect(projection).toContain('todayRecitation')
  expect(projection).not.toContain('correctionReason')
  expect(projection).not.toContain('history')
})

test('student detail excludes internal correction and review history', async () => {
  reportService.getSessionReportDetail.mockResolvedValue({ report: {
    _id: 'report', studentId: 'student', teacherId: 'teacher', status: 'submitted', todayRecitation: 'جزء عم',
    correctionReason: 'داخلي', history: [{ action: 'submitted' }],
  }, session: { scheduledAt: new Date() }, memorization: [], revision: [], attendance: { privateNote: 'x' } })
  const res = response()
  await ctrl.getSessionReport({ user: { _id: 'student', role: 'student' }, params: { sessionId: 'session' } }, res, jest.fn())
  const data = res.json.mock.calls[0][0].data
  expect(data.report.todayRecitation).toBe('جزء عم')
  expect(data.report.correctionReason).toBeUndefined()
  expect(data.report.history).toBeUndefined()
  expect(data.attendance).toBeUndefined()
})
