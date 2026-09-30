jest.mock('../../models/User')
jest.mock('../../models/Session')
jest.mock('../../models/ScheduleRule')
jest.mock('../../models/SupervisionAssignment')
jest.mock('../../models/StudentStartFollowup')
jest.mock('../../services/notification.service')
jest.mock('../../services/audit.service')
jest.mock('../../services/supervisionCoverage.service')

const Session = require('../../models/Session')
const Rule = require('../../models/ScheduleRule')
const Assignment = require('../../models/SupervisionAssignment')
const Followup = require('../../models/StudentStartFollowup')
const controller = require('../studentStartFollowup.controller')
const coverage = require('../../services/supervisionCoverage.service')

const studentId = '507f1f77bcf86cd799439011'
const teacherId = '507f1f77bcf86cd799439012'
const sessionId = '507f1f77bcf86cd799439013'
const staffId = '507f1f77bcf86cd799439014'
const session = () => ({ _id: sessionId, studentId, teacherId, status: 'completed', scheduledAt: new Date(Date.now() - 86400000), completedAt: new Date(Date.now() - 86400000) })
const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() })

beforeEach(() => { jest.clearAllMocks(); coverage.ownerForSession.mockResolvedValue(null) })

test('student feedback is offered only after an actual completed lesson', async () => {
  Session.findOne.mockReturnValue({ sort: () => ({ select: () => ({ lean: async () => null }) }) })
  const res = response()
  await controller.myFeedback({ user: { _id: studentId } }, res, jest.fn())
  expect(res.json.mock.calls[0][0].data.eligible).toBe(false)
  expect(Followup.findOne).not.toHaveBeenCalled()
})

test('student submits first lesson feedback once with student identity from the token', async () => {
  Session.findOne.mockReturnValue({ sort: () => ({ select: () => ({ lean: async () => session() }) }) })
  Followup.findOneAndUpdate.mockResolvedValue({ _id: 'followup', rating: 5, comment: 'جيدة', feedbackAt: new Date() })
  const res = response(), next = jest.fn()
  await controller.submitFeedback({ user: { _id: studentId }, body: { rating: 5, comment: 'جيدة', studentId: staffId } }, res, next)
  expect(next).not.toHaveBeenCalled()
  expect(Followup.findOneAndUpdate.mock.calls[0][0].studentId).toBe(studentId)
  expect(Followup.findOneAndUpdate.mock.calls[0][0].feedbackAt).toEqual({ $exists: false })
  expect(res.json.mock.calls[0][0].success).toBe(true)
})

test('administrative supervisor cannot stabilize a student outside current teacher assignment', async () => {
  Session.findOne.mockReturnValue({ sort: () => ({ select: () => ({ lean: async () => session() }) }) })
  Rule.exists.mockResolvedValue(true)
  Assignment.exists.mockResolvedValue(false)
  const res = response()
  await controller.stabilize({ user: { _id: staffId, role: 'staff', supervisionTeam: 'administrative', supervisionPosition: 'supervisor' },
    params: { studentId }, body: { note: 'ثبت الجدول' } }, res, jest.fn())
  expect(res.status).toHaveBeenCalledWith(403)
  expect(Followup.findOneAndUpdate).not.toHaveBeenCalled()
})

test('stabilization requires a real completed lesson and active recurring schedule', async () => {
  Session.findOne.mockReturnValue({ sort: () => ({ select: () => ({ lean: async () => session() }) }) })
  Rule.exists.mockResolvedValue(false)
  const res = response()
  await controller.stabilize({ user: { _id: staffId, role: 'admin', isPrimaryAdmin: true }, params: { studentId }, body: { note: 'ثبت الجدول' } }, res, jest.fn())
  expect(res.status).toHaveBeenCalledWith(409)
  expect(Followup.findOneAndUpdate).not.toHaveBeenCalled()
})
