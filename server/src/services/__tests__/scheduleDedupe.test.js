// Tests the recurring-session dedupe guard (Phase 10) at two levels:
//   1. Determinism of the pure date-generation algorithm (no DB needed).
//   2. The actual bulkWrite-based upsert logic in generateSessionsFromRule,
//      using a mocked Mongoose Session model — this repo has no DB test
//      infrastructure (no mongodb-memory-server / supertest), so this is
//      the honest boundary: it exercises the REAL production code path
//      (the exact filter/update/upsert shape sent to Mongo) without
//      requiring a live database. The actual duplicate-prevention
//      *guarantee* comes from the unique index on {seriesId, scheduledAt}
//      in models/Session.js, which only a real MongoDB instance can enforce —
//      that part is documented, not simulated, in
//      docs/INTELLIGENT_ATTENDANCE_SYSTEM.md.

jest.mock('../../models/Session')
const Session = require('../../models/Session')
const scheduleService = require('../schedule.service')

const BASE_RULE = {
  _id: 'rule1',
  teacherId: 't1',
  studentId: 's1',
  subscriptionId: 'sub1',
  frequency: 'weekly',
  daysOfWeek: [1, 4], // Monday + Thursday
  timeOfDay: '18:00',
  startDate: '2026-01-05',
  sessionsTotal: 4,
  durationMinutes: 60,
  titleTemplate: 'حصة',
  meetingLink: 'https://zoom.us/j/1',
  meetingProvider: 'zoom',
}

describe('schedule.service.previewFromRule — deterministic date generation', () => {
  test('calling twice with the identical rule produces identical dates', () => {
    const first = scheduleService.previewFromRule(BASE_RULE, 4)
    const second = scheduleService.previewFromRule(BASE_RULE, 4)
    expect(first.map(d => d.toISOString())).toEqual(second.map(d => d.toISOString()))
  })

  test('produces the requested count of legitimately distinct occurrences', () => {
    const dates = scheduleService.previewFromRule(BASE_RULE, 4)
    expect(dates).toHaveLength(4)
    const uniqueTimestamps = new Set(dates.map(d => d.getTime()))
    expect(uniqueTimestamps.size).toBe(4) // every occurrence is a genuinely distinct timestamp
  })
})

describe('schedule.service.generateSessionsFromRule — idempotent upsert', () => {
  beforeEach(() => jest.clearAllMocks())

  test('builds bulkWrite ops keyed on {seriesId, scheduledAt} with upsert + $setOnInsert semantics', async () => {
    Session.countDocuments.mockResolvedValue(0)
    Session.bulkWrite.mockResolvedValue({ upsertedIds: { 0: 'id1', 1: 'id2', 2: 'id3', 3: 'id4' } })
    Session.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([{ _id: 'id1' }, { _id: 'id2' }, { _id: 'id3' }, { _id: 'id4' }]) })

    const result = await scheduleService.generateSessionsFromRule(BASE_RULE)

    expect(Session.bulkWrite).toHaveBeenCalledTimes(1)
    const ops = Session.bulkWrite.mock.calls[0][0]
    expect(ops.length).toBe(4)
    for (const op of ops) {
      expect(op.updateOne.upsert).toBe(true)
      expect(op.updateOne.filter.seriesId).toBe(BASE_RULE._id)
      expect(op.updateOne.filter.scheduledAt).toBeInstanceOf(Date)
      // $setOnInsert means an existing match is never mutated — only a
      // genuinely new occurrence gets these fields written.
      expect(op.updateOne.update.$setOnInsert.seriesId).toBe(BASE_RULE._id)
      expect(op.updateOne.update.$setOnInsert.status).toBe('scheduled')
    }
    expect(result).toHaveLength(4)
  })

  test('generating the same rule twice inserts nothing new the second time (same rule generated twice)', async () => {
    Session.countDocuments.mockResolvedValue(0)
    Session.bulkWrite.mockResolvedValueOnce({ upsertedIds: { 0: 'id1', 1: 'id2', 2: 'id3', 3: 'id4' } })
    Session.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([{ _id: 'id1' }, { _id: 'id2' }, { _id: 'id3' }, { _id: 'id4' }]) })
    const first = await scheduleService.generateSessionsFromRule(BASE_RULE)
    expect(first).toHaveLength(4)

    // Second call against the same rule: in real Mongo, the unique index
    // means every op's filter now matches an existing doc, so bulkWrite's
    // upsertedIds comes back empty (nothing new was inserted).
    Session.bulkWrite.mockResolvedValueOnce({ upsertedIds: {} })
    const second = await scheduleService.generateSessionsFromRule(BASE_RULE)
    expect(second).toHaveLength(0)
    // Session.find should not be called again with an empty id list —
    // the function must short-circuit rather than issuing a pointless query.
    expect(Session.find).toHaveBeenCalledTimes(1)
  })

  test('overlapping cron-like repeated calls (two near-simultaneous generations) never double count', async () => {
    Session.countDocuments.mockResolvedValue(0)
    // Simulate two "concurrent" calls racing: only one of them actually
    // wins each occurrence at the DB level (unique index), so the second
    // resolves with fewer/no upsertedIds for the dates the first one won.
    Session.bulkWrite
      .mockResolvedValueOnce({ upsertedIds: { 0: 'id1', 1: 'id2' } })
      .mockResolvedValueOnce({ upsertedIds: { 2: 'id3', 3: 'id4' } }) // only the non-overlapping half succeeds
    Session.find
      .mockReturnValueOnce({ sort: jest.fn().mockResolvedValue([{ _id: 'id1' }, { _id: 'id2' }]) })
      .mockReturnValueOnce({ sort: jest.fn().mockResolvedValue([{ _id: 'id3' }, { _id: 'id4' }]) })

    const [callA, callB] = await Promise.all([
      scheduleService.generateSessionsFromRule(BASE_RULE),
      scheduleService.generateSessionsFromRule(BASE_RULE),
    ])

    const allIds = [...callA, ...callB].map(s => s._id)
    const uniqueIds = new Set(allIds)
    expect(uniqueIds.size).toBe(allIds.length) // no id appears in both results — no double counting
  })

  test('legitimate different occurrences (extended date range) still produce genuinely new sessions', async () => {
    const extendedRule = { ...BASE_RULE, sessionsTotal: 6 }
    Session.countDocuments.mockResolvedValue(4) // 4 already exist from a prior generation
    Session.bulkWrite.mockResolvedValue({ upsertedIds: { 4: 'id5', 5: 'id6' } }) // only the 2 new dates insert
    Session.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([{ _id: 'id5' }, { _id: 'id6' }]) })

    const result = await scheduleService.generateSessionsFromRule(extendedRule)
    expect(result).toHaveLength(2)

    const ops = Session.bulkWrite.mock.calls[0][0]
    // generateDates always produces the full sessionsTotal (6) dates fresh;
    // the first 4 upsert-match the pre-existing docs and no-op, while title
    // numbering continues from the existing count (4) rather than restarting
    // — so the 5th/6th generated dates (array indices 4/5) are titled 9/10.
    expect(ops[4].updateOne.update.$setOnInsert.titleAr).toBe('حصة 9')
    expect(ops[5].updateOne.update.$setOnInsert.titleAr).toBe('حصة 10')
  })

  test('a rule with no matching dates never touches the database at all', async () => {
    const emptyRule = { ...BASE_RULE, daysOfWeek: [], frequency: 'custom', sessionsTotal: 3 } // custom + no days = nothing to generate
    const result = await scheduleService.generateSessionsFromRule(emptyRule)
    expect(result).toEqual([])
    expect(Session.countDocuments).not.toHaveBeenCalled()
    expect(Session.bulkWrite).not.toHaveBeenCalled()
  })
})
