const mongoose = require('mongoose')
const Course = require('../models/Course')
const { sendSuccess, sendError, sendPaginated } = require('../utils/response')
const { isValidYouTubeUrl } = require('../utils/youtube')

// ── Slug Helpers ─────────────────────────────────────────────────────────────

function baseSlug(name) {
  if (!name || !name.trim()) return ''
  return name.toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 80)
}

async function uniqueSlug(name, nameAr, excludeId = null) {
  const base = baseSlug(name) || `course-${Date.now()}`
  let slug = base
  let counter = 1
  const query = excludeId ? { slug, _id: { $ne: excludeId } } : { slug }
  while (await Course.findOne(query).lean()) {
    slug = `${base}-${counter++}`
    query.slug = slug
  }
  return slug
}

// ── Public Routes ─────────────────────────────────────────────────────────────

exports.listPublished = async (req, res, next) => {
  try {
    const { category, difficulty, language, tags, featured, search, page = 1, limit = 12 } = req.query
    const filter = { status: 'published', isActive: true }
    if (category)   filter.category = category
    if (difficulty) filter.difficulty = difficulty
    if (language)   filter.language = language
    if (featured === 'true') filter.featured = true
    if (tags)       filter.tags = { $in: tags.split(',').map(t => t.trim().toLowerCase()) }
    if (search)     filter.$or = [
      { nameAr: { $regex: search, $options: 'i' } },
      { name: { $regex: search, $options: 'i' } },
      { shortDescriptionAr: { $regex: search, $options: 'i' } },
      { tags: { $in: [search.toLowerCase()] } },
    ]

    const skip = (Number(page) - 1) * Number(limit)
    const [courses, total] = await Promise.all([
      Course.find(filter)
        .select('nameAr name slug shortDescriptionAr shortDescription thumbnailImage coverImage category difficulty ageGroup language estimatedDuration lessonsCount studentsCount enrollmentCount featured rating reviewCount certificateAvailable order createdAt')
        .populate('instructor', 'firstName lastName firstNameAr lastNameAr avatar gender')
        .sort({ featured: -1, order: 1, studentsCount: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Course.countDocuments(filter),
    ])
    sendPaginated(res, courses, total, page, limit)
  } catch (err) {
    next(err)
  }
}

exports.getFeatured = async (req, res, next) => {
  try {
    const courses = await Course.find({ status: 'published', isActive: true, featured: true })
      .select('nameAr name slug shortDescriptionAr thumbnailImage category difficulty studentsCount estimatedDuration lessonsCount')
      .populate('instructor', 'firstName firstNameAr avatar gender')
      .sort({ order: 1, studentsCount: -1 })
      .limit(6)
      .lean()
    sendSuccess(res, courses)
  } catch (err) {
    next(err)
  }
}

exports.getBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params
    // This is a public, unauthenticated endpoint — the ObjectId branch exists
    // only as a fallback for the rare course that lacks a slug (client falls
    // back to `course.slug || course._id`), it must never be a way to bypass
    // the published/active visibility check for draft or archived courses.
    const identity = mongoose.Types.ObjectId.isValid(slug) ? { _id: slug } : { slug }
    const filter = { ...identity, status: 'published', isActive: true }

    const course = await Course.findOne(filter)
      .populate('instructor', 'firstName lastName firstNameAr lastNameAr avatar bio bioAr gender')
      .lean()
    if (!course) return sendError(res, 'المقرر غير موجود', 404)

    // Related courses
    const related = await Course.find({
      status: 'published',
      isActive: true,
      _id: { $ne: course._id },
      category: course.category,
    })
      .select('nameAr name slug thumbnailImage category difficulty studentsCount lessonsCount estimatedDuration')
      .limit(3)
      .lean()

    sendSuccess(res, { ...course, relatedCourses: related })
  } catch (err) {
    next(err)
  }
}

// ── Admin Routes ──────────────────────────────────────────────────────────────

exports.adminList = async (req, res, next) => {
  try {
    const {
      status, category, difficulty, featured, search,
      page = 1, limit = 20,
      sort = 'newest',
    } = req.query

    const filter = {}
    if (status && status !== 'all')   filter.status = status
    if (category && category !== 'all') filter.category = category
    if (difficulty && difficulty !== 'all') filter.difficulty = difficulty
    if (featured === 'true') filter.featured = true
    if (search) filter.$or = [
      { nameAr: { $regex: search, $options: 'i' } },
      { name: { $regex: search, $options: 'i' } },
    ]

    const sortMap = {
      newest:    { createdAt: -1 },
      oldest:    { createdAt: 1 },
      students:  { studentsCount: -1 },
      alpha:     { nameAr: 1 },
      order:     { order: 1, createdAt: -1 },
    }
    const sortObj = sortMap[sort] || sortMap.newest

    const skip = (Number(page) - 1) * Number(limit)
    const [courses, total] = await Promise.all([
      Course.find(filter)
        .populate('instructor', 'firstName lastName firstNameAr avatar')
        .sort(sortObj)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Course.countDocuments(filter),
    ])

    sendPaginated(res, courses, total, page, limit)
  } catch (err) {
    next(err)
  }
}

exports.getAdminStats = async (req, res, next) => {
  try {
    const [total, published, draft, archived, featured, studentsAgg] = await Promise.all([
      Course.countDocuments({}),
      Course.countDocuments({ status: 'published' }),
      Course.countDocuments({ status: 'draft' }),
      Course.countDocuments({ status: 'archived' }),
      Course.countDocuments({ featured: true }),
      Course.aggregate([{ $group: { _id: null, total: { $sum: '$studentsCount' } } }]),
    ])
    sendSuccess(res, {
      total,
      published,
      draft,
      archived,
      featured,
      totalStudents: studentsAgg[0]?.total || 0,
    })
  } catch (err) {
    next(err)
  }
}

exports.getById = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('instructor', 'firstName lastName firstNameAr avatar')
      .lean()
    if (!course) return sendError(res, 'المقرر غير موجود', 404)
    sendSuccess(res, course)
  } catch (err) {
    next(err)
  }
}

exports.create = async (req, res, next) => {
  try {
    const {
      nameAr, name, shortDescriptionAr, shortDescription,
      descriptionAr, description, category, subCategory, tags,
      language, difficulty, level, ageGroup, estimatedDuration,
      lessonsCount, durationWeeks, learningOutcomesAr, learningOutcomes,
      requirementsAr, requirements, targetAudienceAr, targetAudience,
      syllabusAr, curriculum, order, featured, status, enrollmentEnabled,
      certificateAvailable, instructor, seo, introVideoUrl,
    } = req.body

    // Trim before validating, not just before persisting — a copy-pasted
    // URL with incidental leading/trailing whitespace must not be rejected
    // as "invalid" only to become valid once trimmed.
    const cleanIntroVideoUrl = introVideoUrl ? introVideoUrl.trim() : ''
    if (cleanIntroVideoUrl && !isValidYouTubeUrl(cleanIntroVideoUrl)) {
      return sendError(res, 'رابط الفيديو التعريفي غير صالح. يُسمح بروابط YouTube فقط', 400)
    }

    const slug = await uniqueSlug(name, nameAr)

    const course = await Course.create({
      nameAr, name, slug,
      shortDescriptionAr, shortDescription,
      descriptionAr, description,
      category, subCategory,
      tags: Array.isArray(tags) ? tags : (tags ? String(tags).split(',').map(t => t.trim().toLowerCase()) : []),
      language, difficulty: difficulty || level || 'beginner',
      level: level || difficulty || 'beginner',
      ageGroup, estimatedDuration, lessonsCount, durationWeeks,
      learningOutcomesAr, learningOutcomes,
      requirementsAr, requirements,
      targetAudienceAr, targetAudience,
      syllabusAr, curriculum,
      order: order || 0,
      featured: !!featured,
      status: status || 'draft',
      isActive: status === 'published',
      enrollmentEnabled: enrollmentEnabled !== false,
      certificateAvailable: !!certificateAvailable,
      instructor: instructor || null,
      seo: seo || {},
      introVideoUrl: cleanIntroVideoUrl,
      createdBy: req.user._id,
    })

    sendSuccess(res, course, 'تم إنشاء المقرر', 201)
  } catch (err) {
    next(err)
  }
}

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params
    const course = await Course.findById(id)
    if (!course) return sendError(res, 'المقرر غير موجود', 404)

    const {
      nameAr, name, shortDescriptionAr, shortDescription,
      descriptionAr, description, category, subCategory, tags,
      language, difficulty, level, ageGroup, estimatedDuration,
      lessonsCount, durationWeeks, learningOutcomesAr, learningOutcomes,
      requirementsAr, requirements, targetAudienceAr, targetAudience,
      syllabusAr, curriculum, order, featured, status, enrollmentEnabled,
      certificateAvailable, instructor, seo, regenerateSlug, introVideoUrl,
    } = req.body

    // Distinguish "field omitted" (undefined — leave untouched) from
    // "field explicitly cleared" ('' — remove the video), and trim before
    // validating so incidental whitespace from a copy-paste isn't rejected.
    const cleanIntroVideoUrl = introVideoUrl !== undefined
      ? (introVideoUrl ? introVideoUrl.trim() : '')
      : undefined
    if (cleanIntroVideoUrl && !isValidYouTubeUrl(cleanIntroVideoUrl)) {
      return sendError(res, 'رابط الفيديو التعريفي غير صالح. يُسمح بروابط YouTube فقط', 400)
    }

    if (nameAr !== undefined) course.nameAr = nameAr
    if (name !== undefined) course.name = name
    if (regenerateSlug) course.slug = await uniqueSlug(name || course.name, nameAr || course.nameAr, id)

    if (shortDescriptionAr !== undefined) course.shortDescriptionAr = shortDescriptionAr
    if (shortDescription !== undefined) course.shortDescription = shortDescription
    if (descriptionAr !== undefined) course.descriptionAr = descriptionAr
    if (description !== undefined) course.description = description
    if (category !== undefined) course.category = category
    if (subCategory !== undefined) course.subCategory = subCategory
    if (language !== undefined) course.language = language
    if (difficulty !== undefined) { course.difficulty = difficulty; course.level = difficulty }
    if (level !== undefined) { course.level = level; course.difficulty = level }
    if (ageGroup !== undefined) course.ageGroup = ageGroup
    if (estimatedDuration !== undefined) course.estimatedDuration = estimatedDuration
    if (lessonsCount !== undefined) course.lessonsCount = lessonsCount
    if (durationWeeks !== undefined) course.durationWeeks = durationWeeks
    if (tags !== undefined) {
      course.tags = Array.isArray(tags) ? tags : String(tags).split(',').map(t => t.trim().toLowerCase())
    }
    if (learningOutcomesAr !== undefined) course.learningOutcomesAr = learningOutcomesAr
    if (learningOutcomes !== undefined) course.learningOutcomes = learningOutcomes
    if (requirementsAr !== undefined) course.requirementsAr = requirementsAr
    if (requirements !== undefined) course.requirements = requirements
    if (targetAudienceAr !== undefined) course.targetAudienceAr = targetAudienceAr
    if (targetAudience !== undefined) course.targetAudience = targetAudience
    if (syllabusAr !== undefined) course.syllabusAr = syllabusAr
    if (curriculum !== undefined) course.curriculum = curriculum
    if (order !== undefined) course.order = order
    if (featured !== undefined) course.featured = !!featured
    if (status !== undefined) {
      course.status = status
      course.isActive = status === 'published'
    }
    if (enrollmentEnabled !== undefined) course.enrollmentEnabled = !!enrollmentEnabled
    if (certificateAvailable !== undefined) course.certificateAvailable = !!certificateAvailable
    if (instructor !== undefined) course.instructor = instructor || null
    if (seo !== undefined) course.seo = seo
    if (cleanIntroVideoUrl !== undefined) course.introVideoUrl = cleanIntroVideoUrl
    course.updatedBy = req.user._id

    await course.save()
    sendSuccess(res, course, 'تم تحديث المقرر')
  } catch (err) {
    next(err)
  }
}

exports.uploadThumbnail = async (req, res, next) => {
  try {
    if (!req.file) return sendError(res, 'لم يتم رفع ملف', 400)
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { thumbnailImage: `/${req.file.path.replace(/\\/g, '/')}` },
      { new: true }
    )
    if (!course) return sendError(res, 'المقرر غير موجود', 404)
    sendSuccess(res, { thumbnailImage: course.thumbnailImage }, 'تم رفع الصورة المصغرة')
  } catch (err) {
    next(err)
  }
}

exports.uploadCover = async (req, res, next) => {
  try {
    if (!req.file) return sendError(res, 'لم يتم رفع ملف', 400)
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { coverImage: `/${req.file.path.replace(/\\/g, '/')}` },
      { new: true }
    )
    if (!course) return sendError(res, 'المقرر غير موجود', 404)
    sendSuccess(res, { coverImage: course.coverImage }, 'تم رفع صورة الغلاف')
  } catch (err) {
    next(err)
  }
}

exports.togglePublish = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id)
    if (!course) return sendError(res, 'المقرر غير موجود', 404)
    const newStatus = course.status === 'published' ? 'draft' : 'published'
    course.status = newStatus
    course.isActive = newStatus === 'published'
    course.updatedBy = req.user._id
    await course.save()
    sendSuccess(res, { status: course.status, isActive: course.isActive },
      newStatus === 'published' ? 'تم نشر المقرر' : 'تم إلغاء نشر المقرر')
  } catch (err) {
    next(err)
  }
}

exports.toggleFeature = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id)
    if (!course) return sendError(res, 'المقرر غير موجود', 404)
    course.featured = !course.featured
    course.updatedBy = req.user._id
    await course.save()
    sendSuccess(res, { featured: course.featured },
      course.featured ? 'تم تمييز المقرر' : 'تم إلغاء تمييز المقرر')
  } catch (err) {
    next(err)
  }
}

exports.duplicate = async (req, res, next) => {
  try {
    const original = await Course.findById(req.params.id).lean()
    if (!original) return sendError(res, 'المقرر غير موجود', 404)

    const { _id, slug, createdAt, updatedAt, studentsCount, enrollmentCount, __v, ...data } = original
    const newSlug = await uniqueSlug((data.name ? `${data.name}-copy` : null), data.nameAr)

    const copy = await Course.create({
      ...data,
      nameAr: `${data.nameAr} (نسخة)`,
      name: data.name ? `${data.name} (Copy)` : undefined,
      slug: newSlug,
      status: 'draft',
      isActive: false,
      featured: false,
      studentsCount: 0,
      enrollmentCount: 0,
      createdBy: req.user._id,
    })

    sendSuccess(res, copy, 'تم نسخ المقرر', 201)
  } catch (err) {
    next(err)
  }
}

exports.remove = async (req, res, next) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id)
    if (!course) return sendError(res, 'المقرر غير موجود', 404)
    sendSuccess(res, null, 'تم حذف المقرر')
  } catch (err) {
    next(err)
  }
}

exports.bulkAction = async (req, res, next) => {
  try {
    const { ids, action } = req.body
    if (!Array.isArray(ids) || !ids.length) return sendError(res, 'لم يتم تحديد أي مقررات', 400)

    let updateData = {}
    let message = ''

    switch (action) {
      case 'publish':
        updateData = { status: 'published', isActive: true }
        message = `تم نشر ${ids.length} مقرر`
        break
      case 'unpublish':
        updateData = { status: 'draft', isActive: false }
        message = `تم إلغاء نشر ${ids.length} مقرر`
        break
      case 'feature':
        updateData = { featured: true }
        message = `تم تمييز ${ids.length} مقرر`
        break
      case 'unfeature':
        updateData = { featured: false }
        message = `تم إلغاء تمييز ${ids.length} مقرر`
        break
      case 'archive':
        updateData = { status: 'archived', isActive: false }
        message = `تم أرشفة ${ids.length} مقرر`
        break
      case 'delete':
        await Course.deleteMany({ _id: { $in: ids } })
        return sendSuccess(res, null, `تم حذف ${ids.length} مقرر`)
      default:
        return sendError(res, 'إجراء غير معروف', 400)
    }

    await Course.updateMany({ _id: { $in: ids } }, { $set: { ...updateData, updatedBy: req.user._id } })
    sendSuccess(res, null, message)
  } catch (err) {
    next(err)
  }
}
