const User = require('../models/User')

const DEV_ACCOUNTS = [
  {
    email: 'admin@tartelah.com',
    password: 'Admin123!',
    role: 'admin',
    firstNameAr: 'مدير',
    lastNameAr: 'النظام',
    firstName: 'Dev',
    lastName: 'Admin',
    isEmailVerified: true,
    isActive: true,
  },
  {
    email: 'teacher@tartelah.com',
    password: 'Teacher123!',
    role: 'teacher',
    gender: 'male',
    firstNameAr: 'معلم',
    lastNameAr: 'تجريبي',
    firstName: 'Dev',
    lastName: 'Teacher',
    specialization: 'تجويد وحفظ',
    isEmailVerified: true,
    isActive: true,
  },
  {
    email: 'teacher.female@tartelah.com',
    password: 'Teacher123!',
    role: 'teacher',
    gender: 'female',
    firstNameAr: 'معلمة',
    lastNameAr: 'تجريبية',
    firstName: 'Dev',
    lastName: 'Teacher Female',
    specialization: 'تجويد وحفظ',
    isEmailVerified: true,
    isActive: true,
  },
  {
    email: 'student@tartelah.com',
    password: 'Student123!',
    role: 'student',
    firstNameAr: 'طالب',
    lastNameAr: 'تجريبي',
    firstName: 'Dev',
    lastName: 'Student',
    isEmailVerified: true,
    isActive: true,
  },
]

async function ensureDevAccounts() {
  if (process.env.NODE_ENV === 'production') return

  for (const account of DEV_ACCOUNTS) {
    const exists = await User.findOne({ email: account.email })
    if (!exists) {
      await User.create(account)
      console.log(`[DEV] ✅ Created dev account: ${account.role} → ${account.email}`)
    }
  }
  console.log('[DEV] ✅ Dev accounts ready (admin / teacher / student)')
}

module.exports = { ensureDevAccounts }
