// Regression tests for the introductory-video field's full write path
// (Course.create / course.save) and for the public getBySlug visibility
// filter. Uses a mocked Course model — this repo has no DB test
// infrastructure (see services/__tests__/scheduleDedupe.test.js for the
// same rationale) — so these exercise the real controller logic, i.e.
// exactly what gets passed to Mongoose, without a live database.

jest.mock('../../models/Course')
const mongoose = require('mongoose')
const Course = require('../../models/Course')
const ctrl = require('../course.controller')

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn() }
}

const ADMIN_USER = { _id: 'admin1' }

beforeEach(() => {
  jest.clearAllMocks()
  // uniqueSlug()'s collision check — no existing course shares the slug.
  Course.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) })
})

describe('course.controller.create — introVideoUrl', () => {
  test('a valid YouTube URL is persisted to Course.create', async () => {
    Course.create.mockResolvedValue({ _id: 'c1' })
    const req = { body: { nameAr: 'دورة', introVideoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }, user: ADMIN_USER }
    const res = mockRes()

    await ctrl.create(req, res, jest.fn())

    expect(Course.create).toHaveBeenCalledTimes(1)
    expect(Course.create.mock.calls[0][0].introVideoUrl).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(res.status).toHaveBeenCalledWith(201)
  })

  test('an absent intro video persists as an empty string, not undefined', async () => {
    Course.create.mockResolvedValue({ _id: 'c1' })
    const req = { body: { nameAr: 'دورة' }, user: ADMIN_USER }

    await ctrl.create(req, mockRes(), jest.fn())

    expect(Course.create.mock.calls[0][0].introVideoUrl).toBe('')
  })

  test('an invalid intro video URL is rejected with 400 and never reaches Course.create', async () => {
    const req = { body: { nameAr: 'دورة', introVideoUrl: 'not-a-real-url' }, user: ADMIN_USER }
    const res = mockRes()

    await ctrl.create(req, res, jest.fn())

    expect(Course.create).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
  })

  test('trims surrounding whitespace before persisting', async () => {
    Course.create.mockResolvedValue({ _id: 'c1' })
    const req = { body: { nameAr: 'دورة', introVideoUrl: '  https://youtu.be/dQw4w9WgXcQ  ' }, user: ADMIN_USER }

    await ctrl.create(req, mockRes(), jest.fn())

    expect(Course.create.mock.calls[0][0].introVideoUrl).toBe('https://youtu.be/dQw4w9WgXcQ')
  })
})

describe('course.controller.update — introVideoUrl', () => {
  function mockCourseDoc(overrides = {}) {
    return { _id: 'c1', introVideoUrl: 'https://youtu.be/oldOldOldId', save: jest.fn().mockResolvedValue(undefined), ...overrides }
  }

  test('replacing an existing video persists the new value', async () => {
    const doc = mockCourseDoc()
    Course.findById.mockResolvedValue(doc)
    const req = { params: { id: 'c1' }, body: { introVideoUrl: 'https://www.youtube.com/watch?v=newnewnewid' }, user: ADMIN_USER }

    await ctrl.update(req, mockRes(), jest.fn())

    expect(doc.introVideoUrl).toBe('https://www.youtube.com/watch?v=newnewnewid')
    expect(doc.save).toHaveBeenCalledTimes(1)
  })

  test('sending an empty string clears a previously-set video (removal persists)', async () => {
    const doc = mockCourseDoc()
    Course.findById.mockResolvedValue(doc)
    const req = { params: { id: 'c1' }, body: { introVideoUrl: '' }, user: ADMIN_USER }

    await ctrl.update(req, mockRes(), jest.fn())

    expect(doc.introVideoUrl).toBe('')
    expect(doc.save).toHaveBeenCalledTimes(1)
  })

  test('omitting the field entirely leaves the existing video untouched', async () => {
    const doc = mockCourseDoc()
    Course.findById.mockResolvedValue(doc)
    const req = { params: { id: 'c1' }, body: { nameAr: 'اسم جديد' }, user: ADMIN_USER }

    await ctrl.update(req, mockRes(), jest.fn())

    expect(doc.introVideoUrl).toBe('https://youtu.be/oldOldOldId')
    expect(doc.save).toHaveBeenCalledTimes(1)
  })

  test('an invalid replacement URL is rejected with 400 and never saved', async () => {
    const doc = mockCourseDoc()
    Course.findById.mockResolvedValue(doc)
    const req = { params: { id: 'c1' }, body: { introVideoUrl: 'ftp://not-youtube.example/x' }, user: ADMIN_USER }
    const res = mockRes()

    await ctrl.update(req, res, jest.fn())

    expect(doc.save).not.toHaveBeenCalled()
    expect(doc.introVideoUrl).toBe('https://youtu.be/oldOldOldId')
    expect(res.status).toHaveBeenCalledWith(400)
  })
})

describe('course.controller.getBySlug — publish-status visibility', () => {
  test('looking up by slug always filters to published + active courses', async () => {
    Course.findOne.mockReturnValue({ populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) })
    const req = { params: { slug: 'some-course' } }

    await ctrl.getBySlug(req, mockRes(), jest.fn())

    expect(Course.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'some-course', status: 'published', isActive: true })
    )
  })

  test('looking up a draft course by its raw ObjectId does not bypass the published filter', async () => {
    const id = new mongoose.Types.ObjectId().toString()
    Course.findOne.mockReturnValue({ populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) })
    const req = { params: { slug: id } }

    await ctrl.getBySlug(req, mockRes(), jest.fn())

    expect(Course.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ _id: id, status: 'published', isActive: true })
    )
  })
})
