jest.mock('../../models/Session')
const Session = require('../../models/Session')
const mongoose = require('mongoose')
const scheduleService = require('../schedule.service')

describe('schedule.service — Session title and sequence numbering based on student balance', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('buildSessionTitle (pure formatter)', () => {
    test('formats default title with student name and sequence ratio', () => {
      const title = scheduleService.buildSessionTitle('حصة', 'أحمد محمود', 11, 16)
      expect(title).toBe('أحمد محمود 11 من 16')
    })

    test('formats first session for new student as 1 من 16', () => {
      const title = scheduleService.buildSessionTitle('حصة', 'طالب تجريبي', 1, 16)
      expect(title).toBe('طالب تجريبي 1 من 16')
    })

    test('formats custom template correctly with sequence', () => {
      const title = scheduleService.buildSessionTitle('تحفيظ وتجويد', 'سارة علي', 3, 24)
      expect(title).toBe('سارة علي 3 من 24')
    })

    test('falls back gracefully when student name is empty', () => {
      const title = scheduleService.buildSessionTitle('حصة', '', 5, 16)
      expect(title).toBe('حصة 5')
    })

    test('resets session index to 1 of 16 when count exceeds package (17 of 16 -> 1 of 16)', () => {
      const title17 = scheduleService.buildSessionTitle('حصة', 'أحمد محمود', 17, 16)
      expect(title17).toBe('أحمد محمود 1 من 16')

      const title18 = scheduleService.buildSessionTitle('حصة', 'أحمد محمود', 18, 16)
      expect(title18).toBe('أحمد محمود 2 من 16')

      const title24 = scheduleService.buildSessionTitle('حصة', 'أحمد محمود', 24, 16)
      expect(title24).toBe('أحمد محمود 8 من 16')

      const title32 = scheduleService.buildSessionTitle('حصة', 'أحمد محمود', 32, 16)
      expect(title32).toBe('أحمد محمود 16 من 16')

      const title33 = scheduleService.buildSessionTitle('حصة', 'أحمد محمود', 33, 16)
      expect(title33).toBe('أحمد محمود 1 من 16')
    })
  })

  describe('generateSessionsFromRule — sequence offset calculation', () => {
    const RULE_NEW_STUDENT = {
      _id: 'rule_new_1',
      studentName: 'طالب جديد',
      frequency: 'weekly',
      daysOfWeek: [1, 3],
      timeOfDay: '17:00',
      startDate: '2026-02-01',
      sessionsTotal: 4,
      durationMinutes: 45,
      titleTemplate: 'حصة',
    }

    test('new student without prior consumed sessions starts at 1 of total', async () => {
      Session.countDocuments.mockResolvedValue(0)
      Session.bulkWrite.mockResolvedValue({
        upsertedIds: { 0: 's1', 1: 's2', 2: 's3', 3: 's4' },
      })
      Session.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([{ _id: 's1' }, { _id: 's2' }, { _id: 's3' }, { _id: 's4' }]),
      })

      await scheduleService.generateSessionsFromRule(RULE_NEW_STUDENT)

      expect(Session.bulkWrite).toHaveBeenCalledTimes(1)
      const ops = Session.bulkWrite.mock.calls[0][0]
      expect(ops).toHaveLength(4)

      expect(ops[0].updateOne.update.$setOnInsert.title).toBe('طالب جديد 1 من 4')
      expect(ops[1].updateOne.update.$setOnInsert.title).toBe('طالب جديد 2 من 4')
      expect(ops[2].updateOne.update.$setOnInsert.title).toBe('طالب جديد 3 من 4')
      expect(ops[3].updateOne.update.$setOnInsert.title).toBe('طالب جديد 4 من 4')
    })

    test('existing student with startingSessionNumber = 11 and remaining = 6 resolves package total (16) and starts at 11 of 16', async () => {
      const RULE_EXISTING_STUDENT = {
        _id: 'rule_exist_1',
        studentName: 'طالب قديم',
        frequency: 'weekly',
        daysOfWeek: [1, 3],
        timeOfDay: '18:00',
        startDate: '2026-02-01',
        sessionsTotal: 6,
        startingSessionNumber: 11, // Already consumed 10 lessons outside platform
        durationMinutes: 60,
        titleTemplate: 'حصة',
      }

      Session.countDocuments.mockResolvedValue(0)
      Session.bulkWrite.mockResolvedValue({
        upsertedIds: { 0: 's11', 1: 's12', 2: 's13', 3: 's14', 4: 's15', 5: 's16' },
      })
      Session.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([{ _id: 's11' }, { _id: 's12' }, { _id: 's13' }]),
      })

      await scheduleService.generateSessionsFromRule(RULE_EXISTING_STUDENT)

      expect(Session.bulkWrite).toHaveBeenCalledTimes(1)
      const ops = Session.bulkWrite.mock.calls[0][0]
      expect(ops).toHaveLength(6)

      // First session on platform MUST be 11 of 16, ending at 16 of 16
      expect(ops[0].updateOne.update.$setOnInsert.title).toBe('طالب قديم 11 من 16')
      expect(ops[1].updateOne.update.$setOnInsert.title).toBe('طالب قديم 12 من 16')
      expect(ops[5].updateOne.update.$setOnInsert.title).toBe('طالب قديم 16 من 16')
    })

    test('auto-resolves subscription package sessionsPerMonth as totalCount denominator and opening balance offset', async () => {
      const mockSub = {
        _id: 'sub_active_123',
        status: 'active',
        packageId: { sessionsPerMonth: 16, nameAr: 'باقة 16 حصة' },
        walletTransactionId: 'tx_open_1',
      }

      const mockTx = {
        _id: 'tx_open_1',
        metadata: { lessonsUsedAtOpening: 10 },
      }

      const originalReadyState = mongoose.connection.readyState
      mongoose.connection.readyState = 1

      const originalModel = mongoose.model.bind(mongoose)
      jest.spyOn(mongoose, 'model').mockImplementation((name) => {
        if (name === 'Subscription') {
          return {
            findById: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnThis(),
              populate: jest.fn().mockReturnThis(),
              lean: jest.fn().mockResolvedValue(mockSub),
            }),
            findOne: jest.fn().mockReturnValue({
              sort: jest.fn().mockReturnThis(),
              select: jest.fn().mockReturnThis(),
              populate: jest.fn().mockReturnThis(),
              lean: jest.fn().mockResolvedValue(mockSub),
            }),
          }
        }
        if (name === 'LessonTransaction') {
          return {
            findById: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnThis(),
              lean: jest.fn().mockResolvedValue(mockTx),
            }),
          }
        }
        return originalModel(name)
      })

      Session.countDocuments
        .mockResolvedValueOnce(10) // consumed count query
        .mockResolvedValueOnce(0)  // existing in series query

      Session.bulkWrite.mockResolvedValue({
        upsertedIds: { 0: 's1', 1: 's2' },
      })
      Session.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([{ _id: 's1' }, { _id: 's2' }]),
      })

      const ruleWithSub = {
        _id: 'rule_with_sub',
        studentName: 'طالب محول',
        subscriptionId: 'sub_active_123',
        frequency: 'weekly',
        daysOfWeek: [2],
        timeOfDay: '19:00',
        startDate: '2026-02-01',
        sessionsTotal: 6,
        durationMinutes: 50,
      }

      await scheduleService.generateSessionsFromRule(ruleWithSub)

      const ops = Session.bulkWrite.mock.calls[0][0]
      // Denominator should be 16 (from sub.packageId.sessionsPerMonth)
      // First session index should be 10 (consumed) + 0 (existing) + 1 = 11
      expect(ops[0].updateOne.update.$setOnInsert.title).toBe('طالب محول 11 من 16')
      expect(ops[1].updateOne.update.$setOnInsert.title).toBe('طالب محول 12 من 16')

      mongoose.connection.readyState = originalReadyState
      mongoose.model.mockRestore()
    })
  })
})
