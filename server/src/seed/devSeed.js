/**
 * Executable production seeder.
 *
 * Run directly:
 *   node src/seed/devSeed.js
 *
 * Connects to MongoDB, seeds the platform's real default content (packages,
 * courses, articles) and default system accounts (Super Admin, male/female
 * teacher, student), then disconnects and exits. Safe to run repeatedly and
 * safe to run in production — every seed step is additive-only (matches
 * existing documents by their natural key: email/slug/nameAr) and never
 * deletes or overwrites anything.
 *
 * The actual seed data/logic lives in server/src/seeders/production/*.seed.js
 * — this file is a thin, standalone CLI entry point around those same
 * functions so there is exactly one source of truth for what "production
 * content" means.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const mongoose = require('mongoose')

const User = require('../models/User')
const { seedUsers } = require('../seeders/production/users.seed')
const { seedPackages } = require('../seeders/production/packages.seed')
const { seedCourses } = require('../seeders/production/courses.seed')
const { seedArticles } = require('../seeders/production/articles.seed')

async function run() {
  console.log('🚀 Connecting to MongoDB...')
  await mongoose.connect(process.env.MONGO_URI, { dbName: 'tartelah' })
  console.log('✅ Connected')

  console.log('👤 Seeding Users...')
  const userResults = await seedUsers()
  for (const key of Object.keys(userResults)) {
    const r = userResults[key]
    console.log(`   ✓ ${r.label} ${r.status} → ${r.email}`)
  }
  console.log('✅ Users Ready')

  const admin = await User.findOne({ email: 'admin@tartelah.com' })

  console.log('📦 Seeding Packages...')
  const pkgResult = await seedPackages()
  console.log(`   ✓ ${pkgResult.created} created, ${pkgResult.skipped} already existed (of ${pkgResult.total})`)
  console.log('✅ Packages Ready')

  console.log('📚 Seeding Courses...')
  const courseResult = await seedCourses()
  console.log(`   ✓ ${courseResult.created} created, ${courseResult.skipped} already existed (of ${courseResult.total})`)
  console.log('✅ Courses Ready')

  console.log('📰 Seeding Articles...')
  const articleResult = await seedArticles({ authorId: admin._id })
  console.log(`   ✓ categories: ${articleResult.categories.created} created, ${articleResult.categories.skipped} already existed (of ${articleResult.categories.total})`)
  console.log(`   ✓ articles: ${articleResult.articles.created} created, ${articleResult.articles.skipped} already existed (of ${articleResult.articles.total})`)
  console.log('✅ Articles Ready')

  console.log('')
  console.log('  Login credentials (change these after first login):')
  for (const key of Object.keys(userResults)) {
    console.log(`    ${userResults[key].label.padEnd(14)} ${userResults[key].email}`)
  }
  console.log('')
  console.log('🎉 Production Seeder Completed Successfully')
}

run()
  .then(async () => {
    await mongoose.disconnect()
    process.exit(0)
  })
  .catch(async (err) => {
    console.error('❌ Production seed failed:', err)
    await mongoose.disconnect().catch(() => {})
    process.exit(1)
  })
