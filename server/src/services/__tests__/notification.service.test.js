// Mocked-model tests — see wallet.service.test.js for the established pattern.
jest.mock('../../models/Notification')
jest.mock('../socket.service')

const Notification = require('../../models/Notification')
const socketService = require('../socket.service')
const { createNotification, createNotifications } = require('../notification.service')

beforeEach(() => {
  jest.clearAllMocks()
  Notification.find.mockReturnValue({ select: () => ({ lean: () => Promise.resolve([]) }) })
})

describe('notification.service — actionUrl safety', () => {
  test('keeps a known, safe internal actionUrl', async () => {
    Notification.create.mockResolvedValue({ _id: 'n1', userId: 'u1', actionUrl: '/student/subscription' })
    await createNotification({ userId: 'u1', titleAr: 't', type: 'subscription', actionUrl: '/student/subscription' })
    expect(Notification.create).toHaveBeenCalledWith(expect.objectContaining({ actionUrl: '/student/subscription' }))
  })

  test('drops an unknown/dead actionUrl instead of persisting a broken link', async () => {
    Notification.create.mockResolvedValue({ _id: 'n1', userId: 'u1' })
    await createNotification({ userId: 'u1', titleAr: 't', type: 'schedule', actionUrl: '/admin/transfers/batches/xyz' })
    expect(Notification.create).toHaveBeenCalledWith(expect.objectContaining({ actionUrl: undefined }))
  })

  test('drops an external/protocol URL', async () => {
    Notification.create.mockResolvedValue({ _id: 'n1', userId: 'u1' })
    await createNotification({ userId: 'u1', titleAr: 't', type: 'system', actionUrl: 'https://evil.example.com' })
    expect(Notification.create).toHaveBeenCalledWith(expect.objectContaining({ actionUrl: undefined }))
  })

  test('accepts a real dynamic-id destination', async () => {
    Notification.create.mockResolvedValue({ _id: 'n1', userId: 'u1' })
    await createNotification({ userId: 'u1', titleAr: 't', type: 'payroll', actionUrl: '/teacher/payroll/abc123' })
    expect(Notification.create).toHaveBeenCalledWith(expect.objectContaining({ actionUrl: '/teacher/payroll/abc123' }))
  })

  test('fills a default entityType from the notification type when not provided', async () => {
    Notification.create.mockResolvedValue({ _id: 'n1', userId: 'u1' })
    await createNotification({ userId: 'u1', titleAr: 't', type: 'homework' })
    expect(Notification.create).toHaveBeenCalledWith(expect.objectContaining({ entityType: 'Homework' }))
  })
})

describe('notification.service — dedup', () => {
  test('createNotification is a no-op when the dedupeKey already exists for this user+type', async () => {
    Notification.find.mockReturnValue({
      select: () => ({ lean: () => Promise.resolve([{ userId: 'u1', type: 'attendance', metadata: { dedupeKey: 'attendance:s1:no_show' } }]) }),
    })
    const result = await createNotification({
      userId: 'u1', titleAr: 't', type: 'attendance', metadata: { dedupeKey: 'attendance:s1:no_show' },
    })
    expect(result).toBeNull()
    expect(Notification.create).not.toHaveBeenCalled()
    expect(socketService.emitToUser).not.toHaveBeenCalled()
  })

  test('createNotification proceeds when no matching dedupeKey exists yet', async () => {
    Notification.create.mockResolvedValue({ _id: 'n1', userId: 'u1' })
    const result = await createNotification({
      userId: 'u1', titleAr: 't', type: 'attendance', metadata: { dedupeKey: 'attendance:s2:no_show' },
    })
    expect(result).toEqual({ _id: 'n1', userId: 'u1' })
    expect(Notification.create).toHaveBeenCalled()
  })

  test('createNotifications filters out only the duplicate rows from a batch', async () => {
    Notification.find.mockReturnValue({
      select: () => ({ lean: () => Promise.resolve([{ userId: 'admin1', type: 'attendance', metadata: { dedupeKey: 'attendance:s1:alert' } }]) }),
    })
    Notification.insertMany.mockResolvedValue([{ _id: 'n2', userId: 'admin2' }])

    const result = await createNotifications([
      { userId: 'admin1', titleAr: 't', type: 'attendance', metadata: { dedupeKey: 'attendance:s1:alert' } },
      { userId: 'admin2', titleAr: 't', type: 'attendance', metadata: { dedupeKey: 'attendance:s1:alert' } },
    ])

    expect(Notification.insertMany).toHaveBeenCalledWith([
      expect.objectContaining({ userId: 'admin2' }),
    ])
    expect(result).toEqual([{ _id: 'n2', userId: 'admin2' }])
  })

  test('createNotifications with no dedupeKeys inserts everything (unaffected, backward compatible)', async () => {
    Notification.insertMany.mockResolvedValue([{ _id: 'n1' }, { _id: 'n2' }])
    const result = await createNotifications([
      { userId: 'u1', titleAr: 't1', type: 'system' },
      { userId: 'u2', titleAr: 't2', type: 'system' },
    ])
    expect(Notification.insertMany).toHaveBeenCalledWith([
      expect.objectContaining({ userId: 'u1' }),
      expect.objectContaining({ userId: 'u2' }),
    ])
    expect(result).toHaveLength(2)
  })
})
