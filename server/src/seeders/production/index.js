/**
 * Production seeder — populates a freshly deployed database with the real
 * default content used by the platform (packages, courses, articles) plus
 * the default system accounts needed to log in for the first time.
 *
 * Safe to run against any environment, including live production:
 *  - Never deletes or overwrites existing documents (additive only).
 *  - Never runs automatically — only via `npm run seed:production` /
 *    `npm run seed:host` (see server/package.json). Nothing in server.js or
 *    any request path requires this module.
 *  - Re-running it is a no-op for anything already seeded.
 *
 * Usage:
 *   cd server && npm run seed:production
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') })
const mongoose = require('mongoose')

const User = require('../../models/User')
const { seedUsers } = require('./users.seed')
const { seedPackages } = require('./packages.seed')
const { seedCourses } = require('./courses.seed')
const { seedArticles } = require('./articles.seed')

async function run() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: 'tartelah' })
  console.log('✅ Connected to MongoDB')
  console.log('')

  console.log('── Default system accounts ─────────────────────────────')
  const userResults = await seedUsers()
  for (const key of Object.keys(userResults)) {
    const r = userResults[key]
    console.log(`✓ ${r.label} ${r.status} → ${r.email}`)
  }
  console.log('')

  const admin = await User.findOne({ email: 'admin@tartelah.com' })

  console.log('── Packages ─────────────────────────────────────────────')
  const pkgResult = await seedPackages()
  console.log(`✓ Packages: ${pkgResult.created} created, ${pkgResult.skipped} already existed (of ${pkgResult.total})`)
  console.log('')

  console.log('── Courses ──────────────────────────────────────────────')
  const courseResult = await seedCourses()
  console.log(`✓ Courses: ${courseResult.created} created, ${courseResult.skipped} already existed (of ${courseResult.total})`)
  console.log('')

  console.log('── Articles ─────────────────────────────────────────────')
  const articleResult = await seedArticles({ authorId: admin._id })
  console.log(`✓ Article categories: ${articleResult.categories.created} created, ${articleResult.categories.skipped} already existed (of ${articleResult.categories.total})`)
  console.log(`✓ Articles: ${articleResult.articles.created} created, ${articleResult.articles.skipped} already existed (of ${articleResult.articles.total})`)
  console.log('')

  console.log('══════════════════════════════════════════════════════════')
  console.log('  Production seed complete')
  console.log('══════════════════════════════════════════════════════════')
  console.log('  Login credentials (change these after first login):')
  for (const key of Object.keys(userResults)) {
    console.log(`    ${userResults[key].label.padEnd(14)} ${userResults[key].email}`)
  }
  console.log('══════════════════════════════════════════════════════════')

  await mongoose.disconnect()
}

run().catch((err) => {
  console.error('❌ Production seed failed:', err)
  process.exit(1)
})
