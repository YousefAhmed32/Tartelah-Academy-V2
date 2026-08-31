const { buildAssignmentMessage, formatScheduleDays, formatScheduleTimes, studentIntroPhrase, studentDataLabel, studentDataPossessive } = require('../assignmentMessage')

describe('assignmentMessage.buildAssignmentMessage', () => {
  const baseArgs = {
    teacherName: 'أحمد علي',
    studentName: 'سارة محمد',
    studentAge: 10,
    curriculum: 'tajweed',
    scheduleDays: [{ dayOfWeek: 0, time: '16:00' }, { dayOfWeek: 2, time: '18:00' }],
    scheduleTimes: [{ dayOfWeek: 0, time: '16:00' }, { dayOfWeek: 2, time: '18:00' }],
    lessonDurationMinutes: 60,
    teachingType: 'individual',
    startDate: '2026-09-01',
  }

  // Regression test: buildAssignmentMessage was passing the raw array
  // straight into the template instead of formatting it, rendering literal
  // "[object Object]" in production — caught during live manual QA.
  test('never renders a raw object/array into the days line', () => {
    const message = buildAssignmentMessage(baseArgs)
    expect(message).not.toMatch(/\[object Object\]/)
    expect(message).toContain('الأحد')
    expect(message).toContain('الثلاثاء')
  })

  test('formats a single shared time once, not repeated per day', () => {
    const sameTime = { dayOfWeek: 0, time: '16:00' }
    const message = buildAssignmentMessage({ ...baseArgs, scheduleDays: [sameTime, { dayOfWeek: 2, time: '16:00' }], scheduleTimes: [sameTime, { dayOfWeek: 2, time: '16:00' }] })
    expect(message).toMatch(/⏰ الموعد: 16:00\n/)
  })

  test('spells out each day with its own time when times differ', () => {
    const message = buildAssignmentMessage(baseArgs)
    expect(message).toContain('الثلاثاء 18:00')
  })

  test('uses gender-correct wording when the student gender is known', () => {
    const male = buildAssignmentMessage({ ...baseArgs, studentGender: 'male' })
    const female = buildAssignmentMessage({ ...baseArgs, studentGender: 'female' })
    expect(male).toContain('طالب جديد')
    expect(female).toContain('طالبة جديدة')
  })

  test('falls back to neutral wording when gender is unknown — never guessed', () => {
    const message = buildAssignmentMessage(baseArgs)
    expect(message).toContain('طالب/طالبة جديد/جديدة')
  })

  // Dynamic curriculum catalog integration: a subject not in the static
  // legacy map (e.g. an admin-created "الرياضيات") must still render
  // correctly — the caller (assignment.service.js) resolves its real label
  // via services/teachingSubject.service.js and passes it here.
  test('curriculumLabelOverride is used verbatim for a dynamic (non-legacy) subject', () => {
    const message = buildAssignmentMessage({ ...baseArgs, curriculum: 'sub_123abc', curriculumLabelOverride: 'الرياضيات' })
    expect(message).toContain('📖 المنهج: الرياضيات')
  })

  test('curriculumLabelOverride always wins over the static legacy map when both are provided', () => {
    const message = buildAssignmentMessage({ ...baseArgs, curriculum: 'tajweed', curriculumLabelOverride: 'التجويد المتقدم' })
    expect(message).toContain('📖 المنهج: التجويد المتقدم')
  })

  test('formatScheduleDays/formatScheduleTimes are pure and stable', () => {
    expect(formatScheduleDays([{ dayOfWeek: 1, time: '10:00' }])).toBe('الاثنين')
    expect(formatScheduleTimes([{ dayOfWeek: 1, time: '10:00' }, { dayOfWeek: 3, time: '10:00' }])).toBe('10:00')
  })

  test('studentIntroPhrase/studentDataLabel never guess an unset gender', () => {
    expect(studentIntroPhrase(undefined)).not.toMatch(/^طالب جديد$|^طالبة جديدة$/)
    expect(studentDataLabel(undefined)).toBe('الطالب/الطالبة')
  })

  // Regression test: the "وبياناته/بياناتها كالتالي" intro line was hardcoded
  // to the feminine "وبياناتها" regardless of the student's actual gender —
  // grammatically wrong for every male student. studentDataPossessive() must
  // agree with gender the same way studentIntroPhrase() already does.
  test('the "بياناته/بياناتها" possessive agrees with gender, never hardcoded feminine', () => {
    expect(studentDataPossessive('male')).toBe('بياناته')
    expect(studentDataPossessive('female')).toBe('بياناتها')
    expect(studentDataPossessive(undefined)).toBe('بياناته/بياناتها')

    const male = buildAssignmentMessage({ ...baseArgs, studentGender: 'male' })
    const female = buildAssignmentMessage({ ...baseArgs, studentGender: 'female' })
    const unknown = buildAssignmentMessage(baseArgs)
    expect(male).toContain('وبياناته كالتالي')
    expect(female).toContain('وبياناتها كالتالي')
    expect(unknown).toContain('وبياناته/بياناتها كالتالي')
    expect(male).not.toContain('وبياناتها كالتالي')
  })
})
