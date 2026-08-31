// Mocked-model tests (no DB test infra in this repo — see
// wallet.service.test.js for the established rationale) for the dynamic
// teaching-subject/curriculum catalog: seeding, duplicate-normalized
// creation, active-vs-archived validation, and label resolution.
jest.mock('../../models/TeachingSubject')

function makeDoc(overrides = {}) {
  return {
    _id: overrides._id || 'sub1',
    key: overrides.key ?? overrides._id ?? 'sub1',
    nameAr: overrides.nameAr || 'مادة',
    nameEn: overrides.nameEn ?? null,
    normalizedNameAr: overrides.normalizedNameAr ?? null,
    normalizedNameEn: overrides.normalizedNameEn ?? null,
    isActive: overrides.isActive !== undefined ? overrides.isActive : true,
    isSystem: overrides.isSystem || false,
    order: overrides.order || 0,
    save: jest.fn().mockImplementation(function save() { return Promise.resolve(this) }),
    toObject() { return { ...this } },
    ...overrides,
  }
}

describe('teachingSubject.service', () => {
  let service
  let TeachingSubject

  beforeEach(() => {
    // Both the service AND its model dependency must be re-required together
    // after resetModules() — the service's module-level cache would
    // otherwise leak stale data across tests, but re-requiring only the
    // service (while `TeachingSubject` still pointed at the pre-reset
    // instance) would silently configure a DIFFERENT mock object than the
    // one the freshly-required service actually calls.
    jest.resetModules()
    jest.resetAllMocks()
    TeachingSubject = require('../../models/TeachingSubject')
    service = require('../teachingSubject.service')
  })

  describe('ensureSeeded / listAll / listActive', () => {
    test('seeds the six canonical subjects idempotently (upsert, never overwrites)', async () => {
      TeachingSubject.findOneAndUpdate.mockResolvedValue({})
      TeachingSubject.find.mockReturnValue({ sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) })

      await service.listAll()

      expect(TeachingSubject.findOneAndUpdate).toHaveBeenCalledTimes(6)
      const seededKeys = TeachingSubject.findOneAndUpdate.mock.calls.map((call) => call[0].key)
      expect(seededKeys).toEqual(['tajweed', 'hifz', 'nazra', 'arabic', 'quran', 'other'])
      // Upsert semantics — every call must use $setOnInsert (never overwrite
      // an already-customized nameAr/order on a legacy row).
      for (const call of TeachingSubject.findOneAndUpdate.mock.calls) {
        expect(call[2]).toMatchObject({ upsert: true })
        expect(call[1]).toHaveProperty('$setOnInsert')
      }
    })

    test('listActive returns only active subjects', async () => {
      TeachingSubject.findOneAndUpdate.mockResolvedValue({})
      const all = [
        makeDoc({ _id: 'a', key: 'tajweed', isActive: true }),
        makeDoc({ _id: 'b', key: 'archived_one', isActive: false }),
      ]
      TeachingSubject.find.mockReturnValue({ sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(all) }) })

      const active = await service.listActive()
      expect(active).toHaveLength(1)
      expect(active[0].key).toBe('tajweed')
    })
  })

  describe('isValidActiveKey / isKnownKey', () => {
    beforeEach(() => {
      TeachingSubject.findOneAndUpdate.mockResolvedValue({})
    })

    test('an active subject is a valid active key', async () => {
      TeachingSubject.find.mockReturnValue({ sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([makeDoc({ key: 'tajweed', isActive: true })]) }) })
      expect(await service.isValidActiveKey('tajweed')).toBe(true)
    })

    test('an archived subject is known but NOT a valid active key — cannot be assigned to new records', async () => {
      TeachingSubject.find.mockReturnValue({ sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([makeDoc({ key: 'retired', isActive: false })]) }) })
      expect(await service.isValidActiveKey('retired')).toBe(false)
      // ...but still recognized for filters/history rendering.
      expect(await service.isKnownKey('retired')).toBe(true)
    })

    test('a completely unknown key is neither valid nor known', async () => {
      TeachingSubject.find.mockReturnValue({ sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) })
      expect(await service.isValidActiveKey('not_a_real_subject')).toBe(false)
      expect(await service.isKnownKey('not_a_real_subject')).toBe(false)
    })
  })

  describe('resolveLabel', () => {
    test('resolves the catalog nameAr for a known key', async () => {
      TeachingSubject.findOneAndUpdate.mockResolvedValue({})
      TeachingSubject.find.mockReturnValue({ sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([makeDoc({ key: 'sub_math', nameAr: 'الرياضيات' })]) }) })
      expect(await service.resolveLabel('sub_math')).toBe('الرياضيات')
    })

    test('falls back to the static legacy label if the catalog has no match (uninitialized-DB safety net)', async () => {
      TeachingSubject.findOneAndUpdate.mockResolvedValue({})
      TeachingSubject.find.mockReturnValue({ sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) })
      expect(await service.resolveLabel('tajweed')).toBe('التجويد')
    })
  })

  describe('createSubject', () => {
    beforeEach(() => {
      TeachingSubject.findOneAndUpdate.mockResolvedValue({})
    })

    test('creates a brand-new subject and marks created:true', async () => {
      TeachingSubject.find.mockReturnValue({ sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) })
      const created = makeDoc({ _id: 'newid', nameAr: 'الرياضيات' })
      TeachingSubject.create.mockResolvedValue(created)

      const result = await service.createSubject({ nameAr: 'الرياضيات', actorId: 'admin1' })
      expect(result.created).toBe(true)
      expect(TeachingSubject.create).toHaveBeenCalledWith(expect.objectContaining({ nameAr: 'الرياضيات', isSystem: false, createdBy: 'admin1' }))
    })

    test('rejects an empty Arabic name', async () => {
      TeachingSubject.find.mockReturnValue({ sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) })
      await expect(service.createSubject({ nameAr: '   ', actorId: 'admin1' })).rejects.toMatchObject({ status: 400 })
      expect(TeachingSubject.create).not.toHaveBeenCalled()
    })

    // Regression coverage for the brief's exact duplicate-prevention
    // requirement: extra/leading/trailing spaces must resolve to the
    // existing entry instead of creating a duplicate.
    test('a repeated creation attempt (extra whitespace) returns the existing entry instead of duplicating', async () => {
      const existing = makeDoc({ _id: 'existing1', nameAr: 'الرياضيات', normalizedNameAr: 'الرياضيات' })
      TeachingSubject.find.mockReturnValue({ sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([existing]) }) })

      const result = await service.createSubject({ nameAr: '  الرياضيات   ', actorId: 'admin2' })
      expect(result.created).toBe(false)
      expect(result.subject._id).toBe('existing1')
      expect(TeachingSubject.create).not.toHaveBeenCalled()
    })

    // Arabic-diacritic/alef-variant-insensitive duplicate detection (via
    // utils/arabicNormalize.js) — e.g. "الرياضيات" vs "الرياضيّات" (with
    // tashkeel) must be recognized as the same subject.
    test('recognizes a visually-identical Arabic duplicate with diacritics as the same subject', async () => {
      const existing = makeDoc({ _id: 'existing2', nameAr: 'الرياضيات', normalizedNameAr: 'الرياضيات' })
      TeachingSubject.find.mockReturnValue({ sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([existing]) }) })

      const result = await service.createSubject({ nameAr: 'الرِّياضِيّات', actorId: 'admin2' })
      expect(result.created).toBe(false)
      expect(result.subject._id).toBe('existing2')
    })

    test('English name duplicates are case/space-insensitive too', async () => {
      const existing = makeDoc({ _id: 'existing3', nameAr: 'أخرى', nameEn: 'Math', normalizedNameEn: 'math' })
      TeachingSubject.find.mockReturnValue({ sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([existing]) }) })

      const result = await service.createSubject({ nameAr: 'شيء آخر', nameEn: '  MATH  ', actorId: 'admin2' })
      expect(result.created).toBe(false)
      expect(result.subject._id).toBe('existing3')
    })
  })

  describe('setActive (archive/unarchive)', () => {
    test('archiving sets isActive false and invalidates the cache', async () => {
      const doc = makeDoc({ _id: 'sub1', isActive: true })
      TeachingSubject.findById.mockResolvedValue(doc)
      const result = await service.setActive({ id: 'sub1', isActive: false, actorId: 'admin1' })
      expect(result.isActive).toBe(false)
      expect(doc.save).toHaveBeenCalled()
    })

    test('archiving a missing subject throws 404', async () => {
      TeachingSubject.findById.mockResolvedValue(null)
      await expect(service.setActive({ id: 'missing', isActive: false, actorId: 'admin1' })).rejects.toMatchObject({ status: 404 })
    })
  })

  describe('updateSubject', () => {
    test('renaming to a name that collides with another subject is rejected', async () => {
      TeachingSubject.findOneAndUpdate.mockResolvedValue({})
      const doc = makeDoc({ _id: 'sub1', nameAr: 'قديم' })
      TeachingSubject.findById.mockResolvedValue(doc)
      const conflict = makeDoc({ _id: 'sub2', nameAr: 'الرياضيات', normalizedNameAr: 'الرياضيات' })
      TeachingSubject.find.mockReturnValue({ sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([doc, conflict]) }) })

      await expect(service.updateSubject({ id: 'sub1', nameAr: 'الرياضيات', actorId: 'admin1' })).rejects.toMatchObject({ status: 409 })
      expect(doc.save).not.toHaveBeenCalled()
    })
  })
})
