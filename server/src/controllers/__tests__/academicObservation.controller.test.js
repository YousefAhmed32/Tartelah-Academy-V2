jest.mock('../../models/AcademicObservationReport')
jest.mock('../../models/Session')
jest.mock('../../models/SupervisionAssignment')
jest.mock('../../models/SupervisionShift')
jest.mock('../../models/SupervisionSettings')
jest.mock('../../models/User')
jest.mock('../../models/QuranSessionReport')
jest.mock('../../services/notification.service')
jest.mock('../../services/audit.service')

const Report = require('../../models/AcademicObservationReport')
const Session = require('../../models/Session')
const Assignment = require('../../models/SupervisionAssignment')
const Shift = require('../../models/SupervisionShift')
const Settings = require('../../models/SupervisionSettings')
const controller = require('../academicObservation.controller')

const sessionId = '507f1f77bcf86cd799439011'
const reportId = '507f1f77bcf86cd799439012'
const supervisorId = '507f1f77bcf86cd799439013'
const teacherId = '507f1f77bcf86cd799439014'
const studentId = '507f1f77bcf86cd799439015'
const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() })
const supervisor = () => ({ _id: supervisorId, role: 'staff', supervisionTeam: 'academic', supervisionPosition: 'supervisor' })
const session = () => ({ _id: sessionId, teacherId, studentId, scheduledAt: new Date(Date.now() - 3600000), status: 'completed' })

beforeEach(() => {
  jest.clearAllMocks()
  Session.findById.mockReturnValue({ select: () => ({ lean: async () => session() }) })
  Assignment.exists.mockResolvedValue(true)
  Shift.findOne.mockReturnValue({ sort: () => ({ select: () => ({ lean: async () => ({ _id: '507f1f77bcf86cd799439016', endsAt: new Date(Date.now() - 1800000) }) }) }) })
  Settings.findOne.mockReturnValue({ select: () => ({ lean: async () => ({ reportGraceMinutes: 120 }) }) })
})

test('assigned supervisor creates an observation draft with frozen due date', async () => {
  Report.findOne.mockResolvedValue(null)
  Report.create.mockImplementation(async (data) => ({ _id: reportId, ...data }))
  const res = response(), next = jest.fn()
  await controller.save({ user: supervisor(), params: { sessionId }, body: { observation: 'observed', observationSource: 'manual_meeting', observationCategory: 'lesson_quality', lessonFlow: 'متابعة جيدة' }, ip: '127.0.0.1' }, res, next)
  expect(next).not.toHaveBeenCalled()
  expect(Report.create.mock.calls[0][0]).toEqual(expect.objectContaining({ sessionId, supervisorId, observation: 'observed', observationSource: 'manual_meeting', observationCategory: 'lesson_quality' }))
  expect(Report.create.mock.calls[0][0].dueAt).toBeInstanceOf(Date)
})

test('another academic supervisor cannot write an unassigned lesson', async () => {
  Assignment.exists.mockResolvedValue(false)
  const res = response()
  await controller.save({ user: supervisor(), params: { sessionId }, body: { observation: 'observed', observationSource: 'manual_meeting' } }, res, jest.fn())
  expect(res.status).toHaveBeenCalledWith(403)
  expect(Report.create).not.toHaveBeenCalled()
})

test('teacher inbox selects only addressed guidance and no internal narrative', async () => {
  const select = jest.fn(() => ({ populate: () => ({ lean: async () => [] }) }))
  Report.find.mockReturnValue({ sort: () => ({ skip: () => ({ limit: () => ({ select }) }) }) })
  Report.countDocuments.mockResolvedValue(0)
  const res = response()
  await controller.teacherInbox({ user: { _id: teacherId, role: 'teacher' }, query: {} }, res, jest.fn())
  expect(Report.find.mock.calls[0][0]).toEqual(expect.objectContaining({ teacherId, publishedTeacherGuidance: { $nin: ['', null] } }))
  expect(select.mock.calls[0][0]).toContain('publishedTeacherGuidance')
  expect(select.mock.calls[0][0]).not.toContain('rating')
  expect(res.json.mock.calls[0][0].success).toBe(true)
})

test('unobserved session cannot receive a fabricated rating', () => {
  expect(controller.complete({ observation: 'not_observed', evidenceNote: 'لم أتمكن من دخول الاجتماع', rating: 'excellent' })).toBe(false)
  expect(controller.complete({ observation: 'not_observed', evidenceNote: 'لم أتمكن من دخول الاجتماع' })).toBe(true)
})

test('student cannot open the internal academic report', async () => {
  Report.findById.mockReturnValue({ populate: () => ({ populate: () => ({ populate: () => ({ populate: () => ({ lean: async () => ({ _id: reportId, supervisorId }) }) }) }) }) })
  const res = response()
  await controller.detail({ user: { _id: studentId, role: 'student' }, params: { id: reportId } }, res, jest.fn())
  expect(res.status).toHaveBeenCalledWith(403)
})

test('concurrent duplicate submission is rejected before sending notifications', async () => {
  Report.findById.mockResolvedValue({ _id: reportId, sessionId, supervisorId, observation: 'observed', observedAt: new Date(),
    lessonFlow: 'جرى الدرس', studentLevel: 'جيد', teacherPerformance: 'جيد', rating: 'good', status: 'draft', __v: 0 })
  Report.findOneAndUpdate.mockResolvedValue(null)
  const res = response(), next = jest.fn()
  await controller.submit({ user: supervisor(), params: { id: reportId }, ip: '127.0.0.1' }, res, next)
  expect(next).not.toHaveBeenCalled()
  expect(res.status).toHaveBeenCalledWith(409)
  expect(require('../../services/notification.service').createNotification).not.toHaveBeenCalled()
})
