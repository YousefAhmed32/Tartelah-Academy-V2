jest.mock('../../models/User')
jest.mock('../../models/SupervisionSettings')
jest.mock('../notification.service')

const User = require('../../models/User')
const Settings = require('../../models/SupervisionSettings')
const { createNotifications } = require('../notification.service')
const { notifySupervisionChange, notifyAcademicNewTeacher } = require('../supervisionNotification.service')

beforeEach(() => jest.clearAllMocks())

test('uses the configured recipient roles and excludes the actor', async () => {
  Settings.findOne.mockReturnValue({ lean: async () => ({ notificationRecipients: ['manager', 'supervisor'] }) })
  User.find.mockReturnValue({ select: () => ({ lean: async () => [{ _id: 'manager', role: 'manager', supervisionPosition: 'manager' }, { _id: 'supervisor', role: 'staff', supervisionPosition: 'supervisor' }] }) })
  createNotifications.mockResolvedValue([])
  await notifySupervisionChange({ team: 'academic', actorId: 'manager', supervisorIds: ['supervisor'], eventId: 'event1', titleAr: 'تغيير', bodyAr: 'وصف' })
  expect(User.find.mock.calls[0][0].$or).toEqual(expect.arrayContaining([
    expect.objectContaining({ supervisionTeam: 'academic', supervisionPosition: 'manager' }),
    expect.objectContaining({ supervisionTeam: 'academic', supervisionPosition: 'supervisor' }),
  ]))
  expect(createNotifications.mock.calls[0][0]).toEqual([expect.objectContaining({ userId: 'supervisor', actionUrl: '/admin/supervision/academic' })])
})

test('completed teacher onboarding informs academic managers once per teacher', async () => {
  User.find.mockReturnValue({ select: () => ({ lean: async () => [{ _id: 'academic-manager' }] }) })
  createNotifications.mockResolvedValue([])
  await notifyAcademicNewTeacher({ teacherId: 'teacher-1', teacherName: 'أحمد علي', actorId: 'admin' })
  expect(User.find.mock.calls[0][0]).toEqual(expect.objectContaining({ supervisionTeam: 'academic', supervisionPosition: 'manager' }))
  expect(createNotifications.mock.calls[0][0]).toEqual([expect.objectContaining({ userId: 'academic-manager', metadata: { dedupeKey: 'academic-new-teacher:teacher-1' } })])
})
