/**
 * One-time (but safe to re-run) migration: for every document still holding
 * a legacy "/uploads/..." disk path in an image field, reads the file off
 * local disk (if it still exists) and re-uploads it into MongoDB GridFS,
 * replacing the path with the new file's ObjectId. Idempotent — a document
 * whose field is already an ObjectId (or empty) is left untouched, so this
 * can be run again after a fresh deploy with no side effects.
 *
 * Does NOT delete server/uploads/ itself — verify the migration, then remove
 * that directory manually once you're confident nothing needs it anymore.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const fs = require('fs')
const path = require('path')
const mongoose = require('mongoose')
const { uploadBuffer } = require('../services/media.service')

const User = require('../models/User')
const Course = require('../models/Course')
const Article = require('../models/Article')
const SuccessStory = require('../models/SuccessStory')
const EnrollmentRequest = require('../models/EnrollmentRequest')
const Homework = require('../models/Homework')
const AcademySettings = require('../models/AcademySettings')

const UPLOAD_ROOT = path.resolve(__dirname, '../../', process.env.UPLOAD_PATH || 'uploads/')

function isLegacyPath(value) {
  return typeof value === 'string' && value.startsWith('/uploads/')
}

function mimetypeFromExt(ext) {
  return {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
    '.pdf': 'application/pdf', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4', '.mp4': 'video/mp4',
  }[ext.toLowerCase()] || 'application/octet-stream'
}

let migrated = 0
let missing = 0

async function migrateLegacyPath(legacyPath, { category, uploadedBy, private: isPrivate = false, allowedUserIds = [] }) {
  const diskPath = path.join(UPLOAD_ROOT, legacyPath.replace(/^\/uploads\//, ''))
  if (!fs.existsSync(diskPath)) {
    missing++
    console.warn(`  ⚠ missing on disk, skipped: ${legacyPath}`)
    return null
  }
  const buffer = fs.readFileSync(diskPath)
  const id = await uploadBuffer({
    buffer,
    filename: path.basename(diskPath),
    mimetype: mimetypeFromExt(path.extname(diskPath)),
    metadata: { category, uploadedBy: uploadedBy || undefined, private: isPrivate, allowedUserIds, migratedFrom: legacyPath },
  })
  migrated++
  return id
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: 'tartelah' })
  console.log('✅ Connected to MongoDB — starting GridFS migration\n')

  // Users (avatars)
  const users = await User.find({ avatar: { $type: 'string' } })
  for (const u of users) {
    if (!isLegacyPath(u.avatar)) continue
    const id = await migrateLegacyPath(u.avatar, { category: 'avatar', uploadedBy: u._id })
    if (id) { u.avatar = id; await u.save() }
  }
  console.log(`Users: checked ${users.length}`)

  // Courses (thumbnail/cover)
  const courses = await Course.find({ $or: [{ thumbnailImage: { $type: 'string' } }, { coverImage: { $type: 'string' } }] })
  for (const c of courses) {
    if (isLegacyPath(c.thumbnailImage)) c.thumbnailImage = await migrateLegacyPath(c.thumbnailImage, { category: 'course-thumbnail', uploadedBy: c.createdBy })
    if (isLegacyPath(c.coverImage)) c.coverImage = await migrateLegacyPath(c.coverImage, { category: 'course-cover', uploadedBy: c.createdBy })
    await c.save()
  }
  console.log(`Courses: checked ${courses.length}`)

  // Articles (cover)
  const articles = await Article.find({ coverImage: { $type: 'string' } })
  for (const a of articles) {
    if (isLegacyPath(a.coverImage)) { a.coverImage = await migrateLegacyPath(a.coverImage, { category: 'article-cover', uploadedBy: a.author }); await a.save() }
  }
  console.log(`Articles: checked ${articles.length}`)

  // SuccessStory (singleton — cards[].image, banner.image)
  const story = await SuccessStory.findOne()
  if (story) {
    let changed = false
    for (const card of story.cards) {
      if (isLegacyPath(card.image)) { card.image = await migrateLegacyPath(card.image, { category: 'success-story-card' }); changed = true }
    }
    if (isLegacyPath(story.banner?.image)) { story.banner.image = await migrateLegacyPath(story.banner.image, { category: 'success-story-banner' }); changed = true }
    if (changed) await story.save()
  }
  console.log(`SuccessStory: ${story ? 'checked' : 'not found (no-op)'}`)

  // AcademySettings — logoUrl no longer exists as a schema field; nothing to
  // migrate (the field was renamed to logoId with no prior upload feature).

  // EnrollmentRequest (payment proof — private)
  const enrollments = await EnrollmentRequest.find({ paymentProofId: { $type: 'string' } })
  for (const e of enrollments) {
    if (isLegacyPath(e.paymentProofId)) {
      e.paymentProofId = await migrateLegacyPath(e.paymentProofId, { category: 'payment-proof', uploadedBy: e.studentId, private: true })
      await e.save()
    }
  }
  console.log(`EnrollmentRequests: checked ${enrollments.length}`)

  // Homework submission attachments (private — allowed for submitting student + teacher)
  const homeworks = await Homework.find({ 'submissions.attachments.fileId': { $type: 'string' } })
  for (const hw of homeworks) {
    let changed = false
    for (const sub of hw.submissions) {
      for (const att of sub.attachments || []) {
        if (isLegacyPath(att.fileId)) {
          att.fileId = await migrateLegacyPath(att.fileId, {
            category: 'homework', uploadedBy: sub.studentId, private: true, allowedUserIds: [hw.teacherId],
          })
          changed = true
        }
      }
    }
    if (changed) await hw.save()
  }
  console.log(`Homework: checked ${homeworks.length}`)

  console.log(`\n✅ Migration complete — ${migrated} file(s) moved into GridFS, ${missing} legacy reference(s) had no file on disk (left as-is).`)
  await mongoose.disconnect()
}

run().catch((err) => {
  console.error('❌ Migration failed:', err)
  process.exit(1)
})
