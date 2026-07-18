/**
 * Production content seed: the default system accounts needed to start using
 * a freshly deployed platform (super admin, one male teacher, one female
 * teacher, one student). Uses the real User model so passwords go through
 * the same bcrypt pre-save hook as normal registration/auth. Idempotent —
 * matched by `email`; existing accounts are never overwritten (so rotated
 * production passwords/profiles are never clobbered by a re-run).
 *
 * The platform's highest role is `admin` (see server/src/models/User.js —
 * there is no separate `super_admin` role in the schema), so the "Super
 * Admin" account below is created with role: 'admin'.
 */
const User = require('../../models/User')

const DEFAULT_ACCOUNTS = [
  {
    key: 'superAdmin',
    label: 'Super Admin',
    fields: {
      email: 'admin@tartelah.com',
      password: 'Tartelah@Admin2026',
      role: 'admin',
      firstNameAr: 'مدير', lastNameAr: 'المنصة',
      firstName: 'Super', lastName: 'Admin',
      phone: '+201000000001',
      isEmailVerified: true,
      isActive: true,
    },
  },
  {
    key: 'teacherMale',
    label: 'Male Teacher',
    fields: {
      email: 'teacher.male@tartelah.com',
      password: 'Tartelah@Teacher2026',
      role: 'teacher',
      gender: 'male',
      firstNameAr: 'معلم', lastNameAr: 'ترتيلة',
      firstName: 'Male', lastName: 'Teacher',
      phone: '+201000000002',
      specialization: 'تجويد وحفظ',
      bioAr: 'معلم قرآن معتمد، حافظ ومجاز بالسند المتصل، متخصص في تصحيح التلاوة وتثبيت الحفظ لجميع الأعمار.',
      salaryPerSession: 45,
      meetingLinks: [{ provider: 'zoom', label: 'الرابط الرئيسي', link: 'https://zoom.us/j/0000000001' }],
      isEmailVerified: true,
      isActive: true,
    },
  },
  {
    key: 'teacherFemale',
    label: 'Female Teacher',
    fields: {
      email: 'teacher.female@tartelah.com',
      password: 'Tartelah@Teacher2026',
      role: 'teacher',
      gender: 'female',
      firstNameAr: 'معلمة', lastNameAr: 'ترتيلة',
      firstName: 'Female', lastName: 'Teacher',
      phone: '+201000000003',
      specialization: 'تحفيظ الأطفال والنساء',
      bioAr: 'معلمة قرآن متخصصة في تحفيظ الأطفال والنساء، حاصلة على إجازة برواية حفص عن عاصم، خبرة واسعة في التعليم عن بعد.',
      salaryPerSession: 40,
      meetingLinks: [{ provider: 'meet', label: 'حصص الأطفال والنساء', link: 'https://meet.google.com/default-teacher-f' }],
      isEmailVerified: true,
      isActive: true,
    },
  },
  {
    key: 'student',
    label: 'Student',
    fields: {
      email: 'student@tartelah.com',
      password: 'Tartelah@Student2026',
      role: 'student',
      firstNameAr: 'طالب', lastNameAr: 'ترتيلة',
      firstName: 'Default', lastName: 'Student',
      phone: '+201000000004',
      isEmailVerified: true,
      isActive: true,
    },
  },
]

async function seedUsers() {
  const results = {}
  for (const account of DEFAULT_ACCOUNTS) {
    const existing = await User.findOne({ email: account.fields.email })
    if (existing) {
      results[account.key] = { label: account.label, email: account.fields.email, status: 'existed' }
      continue
    }
    await User.create(account.fields)
    results[account.key] = { label: account.label, email: account.fields.email, status: 'created' }
  }
  return results
}

module.exports = { seedUsers, DEFAULT_ACCOUNTS }
