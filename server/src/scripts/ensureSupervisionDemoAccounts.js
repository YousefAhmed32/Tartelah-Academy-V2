/* eslint-disable no-console */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const mongoose = require('mongoose')
const User = require('../models/User')
const { SUPERVISION_PERMISSIONS } = require('../config/permissions')

const accounts = [
  { email: 'academic.supervisor@tartelah.com', firstNameAr: 'مشرف', lastNameAr: 'أكاديمي', role: 'staff', supervisionTeam: 'academic', supervisionPosition: 'supervisor' },
  { email: 'administrative.supervisor@tartelah.com', firstNameAr: 'مشرف', lastNameAr: 'إداري', role: 'staff', supervisionTeam: 'administrative', supervisionPosition: 'supervisor' },
  { email: 'academic.manager@tartelah.com', firstNameAr: 'مدير', lastNameAr: 'الإشراف الأكاديمي', role: 'manager', supervisionTeam: 'academic', supervisionPosition: 'manager' },
  { email: 'administrative.manager@tartelah.com', firstNameAr: 'مدير', lastNameAr: 'الإشراف الإداري', role: 'manager', supervisionTeam: 'administrative', supervisionPosition: 'manager' },
]

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('Demo accounts are disabled in production')
  const uri = process.env.MONGO_URI
  const parsed = new URL(uri)
  if (parsed.protocol !== 'mongodb:' || !['localhost', '127.0.0.1'].includes(parsed.hostname)) {
    throw new Error('Demo accounts may only be created in a local MongoDB')
  }
  await mongoose.connect(uri, { dbName: process.env.MONGO_DB_NAME || 'tartelah' })
  try {
    for (const account of accounts) {
      const existing = await User.findOne({ email: account.email })
      if (existing) {
        if (existing.role !== account.role || existing.supervisionTeam !== account.supervisionTeam || existing.supervisionPosition !== account.supervisionPosition) {
          throw new Error(`Demo email already belongs to another identity: ${account.email}`)
        }
        console.log(`Existing: ${account.email}`)
        continue
      }
      await User.create({ ...account, password: 'Supervisor123!',
        permissions: SUPERVISION_PERMISSIONS[account.supervisionPosition], isEmailVerified: true, isActive: true })
      console.log(`Created: ${account.email}`)
    }
  } finally {
    await mongoose.disconnect()
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1 })
