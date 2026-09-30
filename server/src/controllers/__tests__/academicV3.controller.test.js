jest.mock('../../models/User')
jest.mock('../../models/SupervisionAssignment')
jest.mock('../../models/ScheduleRule')
jest.mock('../../models/Subscription')
jest.mock('../../models/Course')
jest.mock('../../models/TeachingSubject')
jest.mock('../../models/Session')
jest.mock('../../models/Memorization')
jest.mock('../../models/Revision')
jest.mock('../../models/Evaluation')
jest.mock('../../models/AcademicObservationReport')
jest.mock('../../models/StudentAcademicPlan')
jest.mock('../../models/AcademicDirective')
jest.mock('../../models/AcademicDirectiveReceipt')
jest.mock('../../models/AcademicDevelopmentCase')
jest.mock('../../services/audit.service')
jest.mock('../../services/notification.service')
jest.mock('../../services/supervisionCoverage.service')

const Plan = require('../../models/StudentAcademicPlan')
const Assignment = require('../../models/SupervisionAssignment')
const ScheduleRule = require('../../models/ScheduleRule')
const Subscription = require('../../models/Subscription')
const Memorization = require('../../models/Memorization')
const Revision = require('../../models/Revision')
const Evaluation = require('../../models/Evaluation')
const User = require('../../models/User')
const Subject = require('../../models/TeachingSubject')
const Receipt = require('../../models/AcademicDirectiveReceipt')
const Development = require('../../models/AcademicDevelopmentCase')
const controller = require('../academicV3.controller')
const coverage = require('../../services/supervisionCoverage.service')

const studentId = '507f1f77bcf86cd799439011'
const otherId = '507f1f77bcf86cd799439012'
const teacherId = '507f1f77bcf86cd799439013'
const managerId = '507f1f77bcf86cd799439014'
const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() })
const student = { _id: studentId, role: 'student' }
const teacher = { _id: teacherId, role: 'teacher' }
const manager = { _id: managerId, role: 'staff', supervisionTeam: 'academic', supervisionPosition: 'manager', hasPermission: () => true }
const listChain = (rows) => ({ sort: () => ({ skip: () => ({ limit: () => ({ populate: () => ({ populate: () => ({ lean: async () => rows }) }) }) }) }) })
const historyChain = (rows) => ({ sort: () => ({ limit: () => ({ select: () => ({ lean: async () => rows }) }) }) })

beforeEach(() => jest.clearAllMocks())

test('student sees only own published plan and no private test result', async () => {
  Plan.find.mockReturnValue(listChain([{ _id: otherId, studentId, status: 'published', subjectKey: 'hifz',
    materialLinks: [{ title: 'داخلي', url: 'https://example.com/internal', visibility: 'teacher_only' },
      { title: 'للجميع', url: 'https://example.com/shared', visibility: 'shared' }],
    milestones: [{ _id: otherId, title: 'جزء', status: 'completed', externalTest: { testedAt: new Date(), result: 'جيد', visibleToStudent: false } }] }]))
  Plan.countDocuments.mockResolvedValue(1)
  const res = response()
  await controller.listPlans({ user: student, query: {} }, res, jest.fn())
  expect(Plan.find).toHaveBeenCalledWith(expect.objectContaining({ studentId, status: 'published' }))
  const plan = res.json.mock.calls[0][0].data[0]
  expect(plan.milestones[0].externalTest).toBeUndefined()
  expect(plan.materialLinks.map((link) => link.title)).toEqual(['للجميع'])
})

test('teacher cannot read a plan for a student outside assigned schedules and subscriptions', async () => {
  ScheduleRule.exists.mockResolvedValue(false)
  Subscription.exists.mockResolvedValue(false)
  const res = response()
  await controller.listPlans({ user: teacher, query: { studentId } }, res, jest.fn())
  expect(res.status).toHaveBeenCalledWith(403)
  expect(Plan.find).not.toHaveBeenCalled()
})

test('student overview limits a teacher to their own memorization, revision and evaluations', async () => {
  ScheduleRule.exists.mockResolvedValue(true)
  Memorization.find.mockReturnValue(historyChain([]))
  Revision.find.mockReturnValue(historyChain([]))
  Evaluation.find.mockReturnValue(historyChain([]))
  const res = response()
  await controller.studentOverview({ user: teacher, params: { studentId } }, res, jest.fn())
  for (const model of [Memorization, Revision, Evaluation]) {
    expect(model.find).toHaveBeenCalledWith(expect.objectContaining({ studentId, teacherId }))
  }
  expect(res.json.mock.calls[0][0].data.observations).toEqual([])
})

test('student overview limits an academic supervisor to teacher pairs they currently own', async () => {
  const supervisor = { _id: managerId, role: 'staff', supervisionTeam: 'academic', supervisionPosition: 'supervisor', hasPermission: () => true }
  ScheduleRule.find.mockReturnValue({ select: () => ({ lean: async () => [{ teacherId }, { teacherId: otherId }] }) })
  coverage.loadCoverage.mockResolvedValue({ assignments: [], memberships: [] })
  coverage.resolveOwner.mockImplementation((session) => ({ supervisorId: String(session.teacherId) === teacherId ? managerId : otherId }))
  Memorization.find.mockReturnValue(historyChain([]))
  Revision.find.mockReturnValue(historyChain([]))
  Evaluation.find.mockReturnValue(historyChain([]))
  const Observation = require('../../models/AcademicObservationReport')
  Observation.find.mockReturnValue(historyChain([]))
  const res = response()
  await controller.studentOverview({ user: supervisor, params: { studentId } }, res, jest.fn())
  for (const model of [Memorization, Revision, Evaluation]) {
    expect(model.find).toHaveBeenCalledWith(expect.objectContaining({ studentId, teacherId: { $in: [teacherId] } }))
  }
  expect(res.json.mock.calls[0][0].success).toBe(true)
})

test('plan rejects an insecure material link before writing', async () => {
  const res = response()
  await controller.savePlan({ user: manager, body: { studentId, subjectKey: 'hifz', level: 'أول', goal: 'جزء',
    materialLinks: [{ title: 'مادة', url: 'http://insecure.example' }] } }, res, jest.fn())
  expect(res.status).toHaveBeenCalledWith(400)
  expect(Plan.create).not.toHaveBeenCalled()
})

test('individual directive excludes teachers outside active academic assignments', async () => {
  Assignment.distinct.mockImplementation((field) => Promise.resolve(field === 'teacherId' ? [teacherId] : []))
  User.find.mockReturnValue({ select: () => ({ lean: async () => [] }) })
  const res = response()
  await controller.createDirective({ user: manager, body: { title: 'متابعة', body: 'يرجى مراجعة الحصة', targetType: 'person', targetId: otherId } }, res, jest.fn())
  expect(User.find.mock.calls[0][0].$or[0]._id.$in).toEqual([teacherId])
  expect(res.status).toHaveBeenCalledWith(400)
})

test('directive reply updates only the authenticated recipient receipt', async () => {
  Receipt.findOneAndUpdate.mockResolvedValue({ _id: otherId, recipientId: teacherId, status: 'applied' })
  const res = response()
  await controller.replyDirective({ user: teacher, params: { id: otherId }, body: { status: 'applied', reply: 'تم' } }, res, jest.fn())
  expect(Receipt.findOneAndUpdate.mock.calls[0][0]).toEqual({ _id: otherId, recipientId: teacherId })
  expect(res.json.mock.calls[0][0].success).toBe(true)
})

test('staff account without supervision permission cannot read academic directives', async () => {
  const res = response()
  await controller.listDirectives({ user: { ...manager, hasPermission: () => false }, query: {} }, res, jest.fn())
  expect(res.status).toHaveBeenCalledWith(403)
})

test('manager cannot open a development case for an unassigned teacher', async () => {
  Assignment.distinct.mockResolvedValue([])
  User.findById.mockReturnValue({ select: () => ({ lean: async () => ({ role: 'teacher', isActive: true }) }) })
  Assignment.exists.mockResolvedValue(false)
  const res = response()
  await controller.createDevelopment({ user: manager, body: { personId: teacherId, title: 'متابعة', improvement: 'التفاعل', nextAction: 'مراجعة الحصة' } }, res, jest.fn())
  expect(res.status).toHaveBeenCalledWith(403)
  expect(Development.create).not.toHaveBeenCalled()
})

test('improvement cannot be marked complete without a recorded outcome', async () => {
  const res = response()
  await controller.updateDevelopment({ user: manager, params: { id: otherId }, body: { status: 'improved', outcome: '' } }, res, jest.fn())
  expect(res.status).toHaveBeenCalledWith(400)
  expect(Development.findById).not.toHaveBeenCalled()
})

test('supervisor proposal keeps the published student plan unchanged', async () => {
  const supervisor = { _id: managerId, role: 'staff', supervisionTeam: 'academic', supervisionPosition: 'supervisor', hasPermission: () => true }
  Assignment.distinct.mockImplementation((field) => Promise.resolve(field === 'teacherId' ? [teacherId] : []))
  ScheduleRule.find.mockReturnValue({ select: () => ({ lean: async () => [{ teacherId }] }) })
  coverage.loadCoverage.mockResolvedValue({ assignments: [], memberships: [] })
  coverage.resolveOwner.mockReturnValue({ supervisorId: managerId })
  User.findOne.mockReturnValue({ select: () => ({ lean: async () => ({ _id: studentId }) }) })
  Subject.findOne.mockReturnValue({ select: () => ({ lean: async () => ({ key: 'hifz' }) }) })
  const row = { _id: otherId, status: 'published', goal: 'الهدف المنشور', milestones: [], save: jest.fn() }
  Plan.findOne.mockResolvedValue(row)
  const res = response()
  await controller.savePlan({ user: supervisor, body: { studentId, subjectKey: 'hifz', level: 'الثاني', goal: 'هدف جديد' } }, res, jest.fn())
  expect(row.status).toBe('published')
  expect(row.goal).toBe('الهدف المنشور')
  expect(row.pendingRevision.goal).toBe('هدف جديد')
  expect(row.save).toHaveBeenCalled()
})

test('manager approval applies pending revision and clears it', async () => {
  const row = { _id: otherId, status: 'published', goal: 'الهدف المنشور', pendingRevision: { goal: 'هدف جديد' }, save: jest.fn() }
  Plan.findById.mockResolvedValue(row)
  const res = response()
  await controller.publishPlan({ user: manager, params: { id: otherId }, body: { status: 'published' } }, res, jest.fn())
  expect(row.goal).toBe('هدف جديد')
  expect(row.pendingRevision).toBeUndefined()
  expect(row.save).toHaveBeenCalled()
})

test('proposed plan revision retains a previously recorded external test', async () => {
  const supervisor = { _id: managerId, role: 'staff', supervisionTeam: 'academic', supervisionPosition: 'supervisor', hasPermission: () => true }
  Assignment.distinct.mockImplementation((field) => Promise.resolve(field === 'teacherId' ? [teacherId] : []))
  ScheduleRule.find.mockReturnValue({ select: () => ({ lean: async () => [{ teacherId }] }) })
  coverage.loadCoverage.mockResolvedValue({ assignments: [], memberships: [] })
  coverage.resolveOwner.mockReturnValue({ supervisorId: managerId })
  User.findOne.mockReturnValue({ select: () => ({ lean: async () => ({ _id: studentId }) }) })
  Subject.findOne.mockReturnValue({ select: () => ({ lean: async () => ({ key: 'hifz' }) }) })
  const oldStep = { _id: otherId, title: 'الجزء الأول', externalTest: { result: 'ناجح' }, toObject() { return { _id: this._id, title: this.title, externalTest: this.externalTest } } }
  const milestones = [oldStep]
  milestones.id = (value) => value === otherId ? oldStep : null
  const row = { _id: otherId, status: 'published', milestones, save: jest.fn() }
  Plan.findOne.mockResolvedValue(row)
  const res = response()
  await controller.savePlan({ user: supervisor, body: { studentId, subjectKey: 'hifz', level: 'الثاني', goal: 'هدف جديد',
    milestones: [{ _id: otherId, title: 'الجزء الأول' }, { title: 'الجزء الثاني' }] } }, res, jest.fn())
  expect(row.pendingRevision.milestones).toHaveLength(2)
  expect(row.pendingRevision.milestones[0].externalTest.result).toBe('ناجح')
  expect(res.json.mock.calls[0][0].success).toBe(true)
})
