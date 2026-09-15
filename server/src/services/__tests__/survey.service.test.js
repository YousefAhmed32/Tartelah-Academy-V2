// Mocked-model tests — see wallet.service.test.js for the established pattern.
jest.mock('../../models/Survey')
jest.mock('../../models/Subscription')
jest.mock('../../models/AcademySettings')
jest.mock('../notification.service', () => ({ createNotification: jest.fn().mockResolvedValue(undefined) }))
jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose')
  return { ...actual, Types: { ...actual.Types, ObjectId: jest.fn((id) => id) } }
})

const Survey = require('../../models/Survey')
const Subscription = require('../../models/Subscription')
const AcademySettings = require('../../models/AcademySettings')
const { triggerDueSurveys, submitResponse, skipSurvey, SurveyError } = require('../survey.service')

beforeEach(() => { jest.clearAllMocks() })

describe('survey.triggerDueSurveys', () => {
  test('uses the configured surveyLeadDays, defaulting to 7 when unset', async () => {
    AcademySettings.findOne.mockReturnValueOnce({ select: () => Promise.resolve(null) })
    Subscription.find.mockReturnValueOnce({ select: () => Promise.resolve([]) })
    const result = await triggerDueSurveys()
    expect(result).toEqual({ checked: 0, created: 0 })
  })

  test('a duplicate-key error (already surveyed this cycle) is a silent no-op, not a thrown error', async () => {
    AcademySettings.findOne.mockReturnValueOnce({ select: () => Promise.resolve({ surveyLeadDays: 7 }) })
    Subscription.find.mockReturnValueOnce({ select: () => Promise.resolve([{ _id: 'sub1', studentId: 's1', teacherId: 't1' }]) })
    const dupErr = new Error('duplicate'); dupErr.code = 11000
    Survey.create.mockRejectedValueOnce(dupErr)

    const result = await triggerDueSurveys()
    expect(result).toEqual({ checked: 1, created: 0 })
  })

  test('creates a survey for each newly-due subscription', async () => {
    AcademySettings.findOne.mockReturnValueOnce({ select: () => Promise.resolve({ surveyLeadDays: 10 }) })
    Subscription.find.mockReturnValueOnce({ select: () => Promise.resolve([{ _id: 'sub1', studentId: 's1', teacherId: 't1' }, { _id: 'sub2', studentId: 's2', teacherId: 't2' }]) })
    Survey.create.mockResolvedValue({})

    const result = await triggerDueSurveys()
    expect(result).toEqual({ checked: 2, created: 2 })
    expect(Survey.create).toHaveBeenCalledWith({ studentId: 's1', subscriptionId: 'sub1', teacherId: 't1' })
  })

  test('a genuine (non-duplicate) write error still propagates', async () => {
    AcademySettings.findOne.mockReturnValueOnce({ select: () => Promise.resolve({ surveyLeadDays: 7 }) })
    Subscription.find.mockReturnValueOnce({ select: () => Promise.resolve([{ _id: 'sub1', studentId: 's1', teacherId: 't1' }]) })
    Survey.create.mockRejectedValueOnce(new Error('db down'))
    await expect(triggerDueSurveys()).rejects.toThrow('db down')
  })
})

describe('survey.submitResponse', () => {
  test('rejects a survey that was already answered', async () => {
    Survey.findOne.mockResolvedValueOnce({ status: 'completed' })
    await expect(submitResponse('sv1', { studentId: 's1', responses: {} })).rejects.toThrow(SurveyError)
  })

  test('applies only the known response fields and marks completed', async () => {
    const survey = { status: 'pending', save: jest.fn().mockResolvedValue(true) }
    Survey.findOne.mockResolvedValueOnce(survey)
    await submitResponse('sv1', { studentId: 's1', responses: { teacherCommitmentRating: 5, renewalIntention: 'yes', notAField: 'ignored' } })
    expect(survey.teacherCommitmentRating).toBe(5)
    expect(survey.renewalIntention).toBe('yes')
    expect(survey.notAField).toBeUndefined()
    expect(survey.status).toBe('completed')
    expect(survey.completedAt).toBeInstanceOf(Date)
  })

  test('safely ignores empty string renewalIntention without setting invalid enum', async () => {
    const survey = { status: 'pending', save: jest.fn().mockResolvedValue(true) }
    Survey.findOne.mockResolvedValueOnce(survey)
    await submitResponse('sv1', { studentId: 's1', responses: { teacherCommitmentRating: 4, renewalIntention: '' } })
    expect(survey.teacherCommitmentRating).toBe(4)
    expect(survey.renewalIntention).toBeUndefined()
    expect(survey.status).toBe('completed')
  })

  test('rejects invalid renewalIntention value with user-friendly SurveyError', async () => {
    const survey = { status: 'pending', save: jest.fn() }
    Survey.findOne.mockResolvedValueOnce(survey)
    await expect(submitResponse('sv1', { studentId: 's1', responses: { renewalIntention: 'maybe' } }))
      .rejects.toThrow('يرجى تحديد نيتك بشأن تجديد الاشتراك')
  })
})

describe('survey.skipSurvey', () => {
  test('skipping an already-decided survey is a safe no-op', async () => {
    const survey = { status: 'completed', save: jest.fn() }
    Survey.findOne.mockResolvedValueOnce(survey)
    const result = await skipSurvey('sv1', { studentId: 's1' })
    expect(result).toBe(survey)
    expect(survey.save).not.toHaveBeenCalled()
  })

  test('a pending survey moves to skipped', async () => {
    const survey = { status: 'pending', save: jest.fn().mockResolvedValue(true) }
    Survey.findOne.mockResolvedValueOnce(survey)
    await skipSurvey('sv1', { studentId: 's1' })
    expect(survey.status).toBe('skipped')
  })
})
