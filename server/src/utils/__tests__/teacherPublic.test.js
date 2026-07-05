const { toPublicTeacher } = require('../teacherPublic')

describe('toPublicTeacher', () => {
  const fullTeacher = {
    _id: 'abc123',
    firstNameAr: 'محمد',
    lastNameAr: 'العمري',
    gender: 'male',
    avatar: '/uploads/avatars/x.jpg',
    specialization: 'تجويد',
    bioAr: 'نبذة',
    createdAt: new Date('2026-01-01'),
    // Sensitive fields that must never leak through the public projection
    email: 'teacher1@tartelah.com',
    phone: '+966500000000',
    password: 'hashed',
    salaryPerSession: 80,
    isActive: true,
    refreshToken: 'secret-token',
    passwordResetToken: 'reset-token',
    meetingLinks: [{ provider: 'zoom', link: 'https://zoom.us/x' }],
  }

  test('exposes only the safe public fields', () => {
    const pub = toPublicTeacher(fullTeacher)
    expect(pub).toEqual({
      _id: 'abc123',
      firstNameAr: 'محمد',
      lastNameAr: 'العمري',
      gender: 'male',
      avatar: '/uploads/avatars/x.jpg',
      specialization: 'تجويد',
      bioAr: 'نبذة',
      createdAt: fullTeacher.createdAt,
    })
  })

  test('never includes salary, email, phone, password, or internal account fields', () => {
    const pub = toPublicTeacher(fullTeacher)
    for (const sensitiveKey of ['email', 'phone', 'password', 'salaryPerSession', 'refreshToken', 'passwordResetToken', 'meetingLinks', 'isActive']) {
      expect(pub).not.toHaveProperty(sensitiveKey)
    }
  })

  test('exposes gender explicitly, including unresolved (null) rather than omitting it', () => {
    const unresolved = toPublicTeacher({ ...fullTeacher, gender: undefined })
    expect(unresolved.gender).toBeNull()
  })

  test('returns null for a missing teacher instead of throwing', () => {
    expect(toPublicTeacher(null)).toBeNull()
    expect(toPublicTeacher(undefined)).toBeNull()
  })
})
