jest.mock('../../models/Session')
jest.mock('../../models/User')
jest.mock('../../models/Memorization')
jest.mock('../../models/Revision')
jest.mock('../../models/Evaluation')
const Session = require('../../models/Session')
const User = require('../../models/User')
const Memorization = require('../../models/Memorization')
const Revision = require('../../models/Revision')
const Evaluation = require('../../models/Evaluation')
const { periodBounds, metrics, denominator, percent } = require('../academicPeriodic.service')

beforeEach(() => {
  jest.clearAllMocks()
  for (const model of [Memorization, Revision, Evaluation]) model.aggregate.mockReturnValue({ allowDiskUse: async () => [{ totals: [], students: [] }] })
})

test('week and month bounds use academy midnight across Cairo daylight saving', () => {
  const week = periodBounds('2026-04-27', 'week')
  expect(week.from.toISOString()).toBe('2026-04-26T21:00:00.000Z')
  expect(week.to - week.from).toBe(7 * 86400000)
  const month = periodBounds('2026-04-01', 'month')
  expect(month.from.toISOString()).toBe('2026-03-31T22:00:00.000Z')
  expect(month.to.toISOString()).toBe('2026-04-30T21:00:00.000Z')
})

test('period requires the actual Monday or first day', () => {
  expect(() => periodBounds('2026-04-28', 'week')).toThrow()
  expect(() => periodBounds('2026-04-02', 'month')).toThrow()
  expect(() => periodBounds('2026-02-30', 'day')).toThrow()
})

test('metrics use one row per session and explicit denominator excluding cancelled', async () => {
  Session.aggregate.mockReturnValue({ allowDiskUse: async () => [{
    buckets: [{ _id: 'attended', count: 3 }, { _id: 'absent', count: 1 }, { _id: 'cancelled', count: 2 }, { _id: 'unresolved', count: 1 }],
    summary: [{ total: 7, observed: 2, rated: 1, submitted: 2, makeup: 1, lastChangedAt: new Date('2026-04-02') }],
    days: [], teachers: [], samples: [],
  }] })
  const range = periodBounds('2026-04-01', 'month')
  const result = await metrics({ team: 'academic', ...range })
  expect(result.denominator).toBe(5)
  expect(result.percentages).toEqual({ attended: 60, absent: 20, apology: 0 })
  const pipeline = Session.aggregate.mock.calls[0][0]
  expect(pipeline.some((stage) => stage.$lookup?.from === 'supervisionassignments')).toBe(true)
  expect(pipeline.find((stage) => stage.$lookup?.from === 'attendances').$lookup.pipeline[0].$match.isFinalized).toBe(true)
  expect(pipeline.some((stage) => stage.$facet?.buckets)).toBe(true)
  expect(pipeline.find((stage) => stage.$project?.sourceUpdatedAt).$project.reports).toBe(1)
  expect(pipeline.find((stage) => stage.$facet?.categories).$facet.categories[0]).toEqual({ $unwind: '$reports' })
  expect(result.achievements.memorization.records).toBe(0)
})

test('administrative metrics contain no academic observation lookup', async () => {
  Session.aggregate.mockReturnValue({ allowDiskUse: async () => [{ buckets: [], summary: [], days: [], teachers: [], samples: [] }] })
  const result = await metrics({ team: 'administrative', ...periodBounds('2026-04-01', 'month') })
  expect(result.percentages).toBeNull()
  const pipeline = Session.aggregate.mock.calls[0][0]
  expect(pipeline.some((stage) => stage.$lookup?.from === 'academicobservationreports')).toBe(false)
  expect(User.find).not.toHaveBeenCalled()
  expect(denominator(result.counts)).toBe(0)
  expect(percent(0, 0)).toBeNull()
})
