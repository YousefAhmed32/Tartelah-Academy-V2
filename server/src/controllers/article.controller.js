const Article = require('../models/Article')
const ArticleCategory = require('../models/ArticleCategory')
const { sendSuccess, sendError, sendPaginated } = require('../utils/response')
const { getPagination, buildSearchFilter } = require('../utils/pagination')
const { logAction } = require('../services/audit.service')

// audit.service's logAction takes a single object; wrap it so call sites
// below can pass just (req, action, entityId, changes) without repeating
// actorId/actorRole/entity boilerplate at every site.
function auditArticle(req, action, entityId, changes) {
  return logAction({ actorId: req.user._id, actorRole: req.user.role, action, entity: 'Article', entityId, changes })
}

// ── Slug generation ────────────────────────────────────────────────────────────

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w؀-ۿ-]/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function generateUniqueSlug(base, excludeId = null) {
  let slug = slugify(base)
  if (!slug) slug = `article-${Date.now()}`
  let candidate = slug
  let counter = 1
  while (true) {
    const query = { slug: candidate }
    if (excludeId) query._id = { $ne: excludeId }
    const existing = await Article.findOne(query)
    if (!existing) return candidate
    candidate = `${slug}-${counter++}`
  }
}

// ── PUBLIC ─────────────────────────────────────────────────────────────────────

exports.listPublished = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query)
    const { category, tag, sort = 'latest', featured } = req.query

    const filter = { status: 'published', deletedAt: null }
    if (category) filter.category = category
    if (tag) filter.tags = tag
    if (featured === 'true') filter.featured = true

    let sortObj = { publishedAt: -1 }
    if (sort === 'popular') sortObj = { views: -1 }
    if (sort === 'liked')   sortObj = { likes: -1 }
    if (sort === 'pinned')  sortObj = { pinned: -1, publishedAt: -1 }

    const [articles, total, categories] = await Promise.all([
      Article.find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .select('-content -contentAr -likedBy -bookmarkedBy -seo')
        .populate('author', 'firstNameAr lastNameAr firstName lastName avatar')
        .populate('category', 'nameAr name slug color icon'),
      Article.countDocuments(filter),
      ArticleCategory.find().sort({ order: 1 }),
    ])

    sendPaginated(res, { articles, categories }, total, page, limit)
  } catch (err) { next(err) }
}

exports.getFeatured = async (req, res, next) => {
  try {
    const articles = await Article.find({ status: 'published', featured: true, deletedAt: null })
      .sort({ featuredOrder: 1, publishedAt: -1 })
      .limit(5)
      .select('-content -contentAr -likedBy -bookmarkedBy -seo')
      .populate('author', 'firstNameAr lastNameAr avatar')
      .populate('category', 'nameAr name slug color icon')
    sendSuccess(res, articles)
  } catch (err) { next(err) }
}

exports.getLatest = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 6, 12)
    const articles = await Article.find({ status: 'published', deletedAt: null })
      .sort({ publishedAt: -1 })
      .limit(limit)
      .select('-content -contentAr -likedBy -bookmarkedBy -seo')
      .populate('author', 'firstNameAr lastNameAr avatar')
      .populate('category', 'nameAr name slug color icon')
    sendSuccess(res, articles)
  } catch (err) { next(err) }
}

exports.getBySlug = async (req, res, next) => {
  try {
    const article = await Article.findOne({ slug: req.params.slug, status: 'published', deletedAt: null })
      .populate('author', 'firstNameAr lastNameAr firstName lastName avatar')
      .populate('category', 'nameAr name slug color icon')

    if (!article) return sendError(res, 'المقال غير موجود', 404)

    // Increment view count
    await Article.updateOne({ _id: article._id }, { $inc: { views: 1 } })
    article.views += 1

    // Related articles
    const related = await Article.find({
      status: 'published',
      deletedAt: null,
      _id: { $ne: article._id },
      $or: [
        { category: article.category?._id },
        { tags: { $in: article.tags } },
      ],
    })
      .sort({ publishedAt: -1 })
      .limit(4)
      .select('-content -contentAr -likedBy -bookmarkedBy -seo')
      .populate('author', 'firstNameAr lastNameAr avatar')
      .populate('category', 'nameAr name slug color icon')

    // Previous / next
    const [prev, next_] = await Promise.all([
      Article.findOne({ status: 'published', deletedAt: null, publishedAt: { $lt: article.publishedAt } })
        .sort({ publishedAt: -1 }).select('title titleAr slug coverImage'),
      Article.findOne({ status: 'published', deletedAt: null, publishedAt: { $gt: article.publishedAt } })
        .sort({ publishedAt: 1 }).select('title titleAr slug coverImage'),
    ])

    // Check if current user liked/bookmarked
    let userLiked = false
    let userBookmarked = false
    if (req.user) {
      userLiked = article.likedBy.some(id => id.toString() === req.user._id.toString())
      userBookmarked = article.bookmarkedBy.some(id => id.toString() === req.user._id.toString())
    }

    sendSuccess(res, { article, related, prev, next: next_, userLiked, userBookmarked })
  } catch (err) { next(err) }
}

exports.searchArticles = async (req, res, next) => {
  try {
    const { q, page, limit, skip } = { ...getPagination(req.query), q: req.query.q }
    if (!q || q.trim().length < 2) return sendPaginated(res, [], 0, page, limit)

    const filter = {
      status: 'published',
      deletedAt: null,
      $text: { $search: q.trim() },
    }

    const [articles, total] = await Promise.all([
      Article.find(filter, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .skip(skip)
        .limit(limit)
        .select('-content -contentAr -likedBy -bookmarkedBy -seo')
        .populate('author', 'firstNameAr lastNameAr avatar')
        .populate('category', 'nameAr name slug color icon'),
      Article.countDocuments(filter),
    ])

    sendPaginated(res, articles, total, page, limit)
  } catch (err) { next(err) }
}

exports.toggleLike = async (req, res, next) => {
  try {
    const article = await Article.findOne({ slug: req.params.slug, status: 'published', deletedAt: null })
    if (!article) return sendError(res, 'المقال غير موجود', 404)

    const userId = req.user._id
    const idx = article.likedBy.findIndex(id => id.toString() === userId.toString())
    if (idx === -1) {
      article.likedBy.push(userId)
      article.likes = article.likedBy.length
      await article.save()
      return sendSuccess(res, { likes: article.likes, liked: true })
    } else {
      article.likedBy.splice(idx, 1)
      article.likes = article.likedBy.length
      await article.save()
      return sendSuccess(res, { likes: article.likes, liked: false })
    }
  } catch (err) { next(err) }
}

exports.toggleBookmark = async (req, res, next) => {
  try {
    const article = await Article.findOne({ slug: req.params.slug, status: 'published', deletedAt: null })
    if (!article) return sendError(res, 'المقال غير موجود', 404)

    const userId = req.user._id
    const idx = article.bookmarkedBy.findIndex(id => id.toString() === userId.toString())
    if (idx === -1) {
      article.bookmarkedBy.push(userId)
      article.bookmarks = article.bookmarkedBy.length
      await article.save()
      return sendSuccess(res, { bookmarks: article.bookmarks, bookmarked: true })
    } else {
      article.bookmarkedBy.splice(idx, 1)
      article.bookmarks = article.bookmarkedBy.length
      await article.save()
      return sendSuccess(res, { bookmarks: article.bookmarks, bookmarked: false })
    }
  } catch (err) { next(err) }
}

// ── ADMIN ──────────────────────────────────────────────────────────────────────

exports.adminListAll = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query)
    const { status, category, search, deleted } = req.query

    const filter = {}
    if (deleted === 'true') {
      filter.deletedAt = { $ne: null }
    } else {
      filter.deletedAt = null
      if (status && status !== 'all') filter.status = status
    }
    if (category) filter.category = category
    if (search) {
      const searchFilter = buildSearchFilter(search, ['title', 'titleAr', 'excerpt'])
      Object.assign(filter, searchFilter)
    }

    const [articles, total] = await Promise.all([
      Article.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-content -contentAr -likedBy -bookmarkedBy')
        .populate('author', 'firstNameAr lastNameAr avatar')
        .populate('category', 'nameAr name slug color'),
      Article.countDocuments(filter),
    ])

    const stats = await Article.aggregate([
      { $match: { deletedAt: null } },
      { $group: { _id: '$status', count: { $sum: 1 }, totalViews: { $sum: '$views' } } },
    ])

    sendPaginated(res, { articles, stats }, total, page, limit)
  } catch (err) { next(err) }
}

exports.adminGetById = async (req, res, next) => {
  try {
    const article = await Article.findById(req.params.id)
      .populate('author', 'firstNameAr lastNameAr avatar')
      .populate('category', 'nameAr name slug color')
    if (!article) return sendError(res, 'المقال غير موجود', 404)
    sendSuccess(res, article)
  } catch (err) { next(err) }
}

exports.createArticle = async (req, res, next) => {
  try {
    const {
      title, titleAr, slug: rawSlug, excerpt, excerptAr,
      content, contentAr, coverImage, gallery,
      category, tags, status, scheduledAt,
      featured, featuredOrder, pinned,
      seo,
    } = req.body

    const slug = await generateUniqueSlug(rawSlug || title)

    const article = await Article.create({
      title, titleAr, slug, excerpt, excerptAr,
      content, contentAr, coverImage, gallery: gallery || [],
      author: req.user._id,
      category: category || null,
      tags: tags || [],
      status: status || 'draft',
      scheduledAt: scheduledAt || null,
      publishedAt: status === 'published' ? new Date() : null,
      featured: featured || false,
      featuredOrder: featuredOrder || 0,
      pinned: pinned || false,
      seo: seo || {},
      createdBy: req.user._id,
      updatedBy: req.user._id,
    })

    await auditArticle(req, 'article.create', article._id, { title })
    sendSuccess(res, article, 'تم إنشاء المقال بنجاح', 201)
  } catch (err) { next(err) }
}

exports.updateArticle = async (req, res, next) => {
  try {
    const article = await Article.findOne({ _id: req.params.id, deletedAt: null })
    if (!article) return sendError(res, 'المقال غير موجود', 404)

    const allowed = [
      'title', 'titleAr', 'excerpt', 'excerptAr', 'content', 'contentAr',
      'coverImage', 'gallery', 'category', 'tags', 'status', 'scheduledAt',
      'featured', 'featuredOrder', 'pinned', 'seo',
    ]

    for (const key of allowed) {
      if (key in req.body) article[key] = req.body[key]
    }

    if (req.body.slug && req.body.slug !== article.slug) {
      article.slug = await generateUniqueSlug(req.body.slug, article._id)
    }

    if (req.body.status === 'published' && !article.publishedAt) {
      article.publishedAt = new Date()
    }

    article.updatedBy = req.user._id
    await article.save()

    await auditArticle(req, 'article.update', article._id, {})
    sendSuccess(res, article, 'تم تحديث المقال بنجاح')
  } catch (err) { next(err) }
}

exports.uploadCoverImage = async (req, res, next) => {
  try {
    if (!req.file) return sendError(res, 'لم يتم اختيار صورة', 400)
    const url = `/uploads/articles/${req.file.filename}`
    sendSuccess(res, { url }, 'تم رفع الصورة بنجاح')
  } catch (err) { next(err) }
}

exports.publishArticle = async (req, res, next) => {
  try {
    const article = await Article.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { status: 'published', publishedAt: new Date(), updatedBy: req.user._id },
      { new: true }
    )
    if (!article) return sendError(res, 'المقال غير موجود', 404)
    await auditArticle(req, 'article.publish', article._id, {})
    sendSuccess(res, article, 'تم نشر المقال بنجاح')
  } catch (err) { next(err) }
}

exports.unpublishArticle = async (req, res, next) => {
  try {
    const article = await Article.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { status: 'draft', updatedBy: req.user._id },
      { new: true }
    )
    if (!article) return sendError(res, 'المقال غير موجود', 404)
    await auditArticle(req, 'article.unpublish', article._id, {})
    sendSuccess(res, article, 'تم إلغاء نشر المقال')
  } catch (err) { next(err) }
}

exports.toggleFeature = async (req, res, next) => {
  try {
    const article = await Article.findOne({ _id: req.params.id, deletedAt: null })
    if (!article) return sendError(res, 'المقال غير موجود', 404)
    article.featured = !article.featured
    article.featuredOrder = req.body.featuredOrder ?? article.featuredOrder
    article.updatedBy = req.user._id
    await article.save()
    sendSuccess(res, { featured: article.featured }, article.featured ? 'تم تمييز المقال' : 'تم إلغاء التمييز')
  } catch (err) { next(err) }
}

exports.togglePin = async (req, res, next) => {
  try {
    const article = await Article.findOne({ _id: req.params.id, deletedAt: null })
    if (!article) return sendError(res, 'المقال غير موجود', 404)
    article.pinned = !article.pinned
    article.updatedBy = req.user._id
    await article.save()
    sendSuccess(res, { pinned: article.pinned }, article.pinned ? 'تم تثبيت المقال' : 'تم إلغاء التثبيت')
  } catch (err) { next(err) }
}

exports.duplicateArticle = async (req, res, next) => {
  try {
    const source = await Article.findOne({ _id: req.params.id, deletedAt: null })
    if (!source) return sendError(res, 'المقال غير موجود', 404)

    const slug = await generateUniqueSlug(`${source.slug}-copy`)
    const copy = await Article.create({
      title: `${source.title} (نسخة)`,
      titleAr: source.titleAr ? `${source.titleAr} (نسخة)` : undefined,
      slug,
      excerpt: source.excerpt,
      excerptAr: source.excerptAr,
      content: source.content,
      contentAr: source.contentAr,
      coverImage: source.coverImage,
      gallery: source.gallery,
      author: req.user._id,
      category: source.category,
      tags: source.tags,
      status: 'draft',
      featured: false,
      pinned: false,
      seo: source.seo,
      createdBy: req.user._id,
      updatedBy: req.user._id,
    })

    await auditArticle(req, 'article.duplicate', copy._id, { sourceId: source._id })
    sendSuccess(res, copy, 'تم نسخ المقال بنجاح', 201)
  } catch (err) { next(err) }
}

exports.softDeleteArticle = async (req, res, next) => {
  try {
    const article = await Article.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { deletedAt: new Date(), updatedBy: req.user._id },
      { new: true }
    )
    if (!article) return sendError(res, 'المقال غير موجود', 404)
    await auditArticle(req, 'article.delete', article._id, {})
    sendSuccess(res, null, 'تم حذف المقال')
  } catch (err) { next(err) }
}

exports.restoreArticle = async (req, res, next) => {
  try {
    const article = await Article.findOneAndUpdate(
      { _id: req.params.id, deletedAt: { $ne: null } },
      { deletedAt: null, status: 'draft', updatedBy: req.user._id },
      { new: true }
    )
    if (!article) return sendError(res, 'المقال غير موجود أو غير محذوف', 404)
    await auditArticle(req, 'article.restore', article._id, {})
    sendSuccess(res, article, 'تم استعادة المقال')
  } catch (err) { next(err) }
}

// ── CATEGORIES ─────────────────────────────────────────────────────────────────

function catSlugify(text) {
  return text.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w؀-ۿ-]/g, '').replace(/--+/g, '-')
}

exports.listCategories = async (req, res, next) => {
  try {
    const categories = await ArticleCategory.find().sort({ order: 1 })
    const counts = await Article.aggregate([
      { $match: { status: 'published', deletedAt: null } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ])
    const countMap = {}
    counts.forEach(c => { if (c._id) countMap[c._id.toString()] = c.count })
    const result = categories.map(cat => ({ ...cat.toObject(), articlesCount: countMap[cat._id.toString()] || 0 }))
    sendSuccess(res, result)
  } catch (err) { next(err) }
}

exports.createCategory = async (req, res, next) => {
  try {
    const { name, nameAr, description, color, icon, order } = req.body
    if (!name) return sendError(res, 'الاسم مطلوب', 400)
    const slug = catSlugify(name)
    const existing = await ArticleCategory.findOne({ slug })
    if (existing) return sendError(res, 'هذه الفئة موجودة بالفعل', 409)
    const cat = await ArticleCategory.create({ name, nameAr, slug, description, color, icon, order })
    sendSuccess(res, cat, 'تم إنشاء الفئة بنجاح', 201)
  } catch (err) { next(err) }
}

exports.updateCategory = async (req, res, next) => {
  try {
    const cat = await ArticleCategory.findById(req.params.id)
    if (!cat) return sendError(res, 'الفئة غير موجودة', 404)
    const { name, nameAr, description, color, icon, order } = req.body
    if (name) { cat.name = name; cat.slug = catSlugify(name) }
    if (nameAr !== undefined) cat.nameAr = nameAr
    if (description !== undefined) cat.description = description
    if (color) cat.color = color
    if (icon !== undefined) cat.icon = icon
    if (order !== undefined) cat.order = order
    await cat.save()
    sendSuccess(res, cat, 'تم تحديث الفئة')
  } catch (err) { next(err) }
}

exports.deleteCategory = async (req, res, next) => {
  try {
    const count = await Article.countDocuments({ category: req.params.id, deletedAt: null })
    if (count > 0) return sendError(res, `لا يمكن حذف الفئة لوجود ${count} مقالات مرتبطة بها`, 400)
    await ArticleCategory.findByIdAndDelete(req.params.id)
    sendSuccess(res, null, 'تم حذف الفئة')
  } catch (err) { next(err) }
}
