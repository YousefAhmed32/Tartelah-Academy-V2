// Narrow, allowlisted tools the AI concierge may call. Every function here
// queries MongoDB directly with a hardcoded, published/active-only filter —
// the model only ever supplies search arguments (category, query text, ids),
// never a raw query. This is the hard boundary that keeps the model from
// ever seeing draft courses, inactive teachers, or private user data.
const mongoose = require('mongoose')
const Course = require('../models/Course')
const User = require('../models/User')
const Package = require('../models/Package')
const Article = require('../models/Article')
const AcademySettings = require('../models/AcademySettings')
const { searchKnowledge } = require('./aiKnowledge.service')

const CATEGORY_LABELS = {
  tajweed: 'التجويد', hifz: 'الحفظ', nazra: 'النظر',
  arabic: 'اللغة العربية', quran: 'القرآن الكريم', other: 'أخرى',
}
const DIFFICULTY_LABELS = { beginner: 'مبتدئ', intermediate: 'متوسط', advanced: 'متقدم' }

function courseRoute(course) { return `/courses/${course.slug || course._id}` }
function teacherRoute(id) { return `/teachers/${id}` }

// The model can pass arbitrary free-text (including raw user chat input) as
// a search `query` — it must never reach $regex unescaped, or a message
// containing regex metacharacters crashes the query (and untrusted regex is
// a ReDoS vector). Only ever used for these free-text tool searches.
function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// A course is only badged "جديد" for a short, deliberately narrow window —
// long enough to matter to a visitor, short enough that "new" stays true.
const NEW_COURSE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000

function courseBadge(c) {
  if (c.featured) return 'featured'
  if (c.rating >= 4.5 && c.reviewCount >= 5) return 'bestseller'
  if (c.createdAt && Date.now() - new Date(c.createdAt).getTime() < NEW_COURSE_WINDOW_MS) return 'new'
  if (c.studentsCount >= 50) return 'popular'
  return null
}

function courseCardShape(c) {
  return {
    type: 'course',
    id: String(c._id),
    name: c.nameAr,
    route: courseRoute(c),
    slug: c.slug || String(c._id),
    category: CATEGORY_LABELS[c.category] || c.category,
    difficulty: DIFFICULTY_LABELS[c.difficulty] || c.difficulty,
    lessonsCount: c.lessonsCount,
    estimatedDurationHours: c.estimatedDuration,
    certificateAvailable: c.certificateAvailable,
    shortDescription: c.shortDescriptionAr || null,
    thumbnailImage: c.thumbnailImage || null,
    rating: c.rating || 0,
    reviewCount: c.reviewCount || 0,
    studentsCount: c.studentsCount || c.enrollmentCount || 0,
    badge: courseBadge(c),
    instructorName: c.instructor
      ? `${c.instructor.firstNameAr || ''} ${c.instructor.lastNameAr || ''}`.trim()
      : null,
    enrollmentEnabled: c.enrollmentEnabled !== false,
  }
}

async function searchCourses({ category, difficulty, query, limit = 5 } = {}) {
  const filter = { status: 'published', isActive: true }
  if (category && CATEGORY_LABELS[category]) filter.category = category
  if (difficulty && DIFFICULTY_LABELS[difficulty]) filter.difficulty = difficulty
  if (query) {
    const q = escapeRegex(query)
    filter.$or = [
      { nameAr: { $regex: q, $options: 'i' } },
      { name: { $regex: q, $options: 'i' } },
      { shortDescriptionAr: { $regex: q, $options: 'i' } },
      { descriptionAr: { $regex: q, $options: 'i' } },
      { slug: { $regex: q, $options: 'i' } },
      { tags: { $in: [query.toLowerCase()] } },
    ]
  }
  const courses = await Course.find(filter)
    .populate('instructor', 'firstNameAr lastNameAr')
    .select('nameAr slug category difficulty estimatedDuration lessonsCount certificateAvailable studentsCount enrollmentCount shortDescriptionAr thumbnailImage rating reviewCount featured createdAt enrollmentEnabled instructor')
    .sort({ featured: -1, studentsCount: -1 })
    .limit(Math.min(Number(limit) || 5, 8))
    .lean()

  return courses.map(courseCardShape)
}

async function getCourseDetails({ slug } = {}) {
  if (!slug) return null
  const identity = mongoose.Types.ObjectId.isValid(slug) ? { _id: slug } : { slug }
  const course = await Course.findOne({ ...identity, status: 'published', isActive: true })
    .populate('instructor', 'firstNameAr lastNameAr gender')
    .select('nameAr slug category difficulty ageGroup language estimatedDuration lessonsCount certificateAvailable enrollmentEnabled shortDescriptionAr requirementsAr targetAudienceAr thumbnailImage rating reviewCount studentsCount enrollmentCount featured createdAt instructor')
    .lean()
  if (!course) return null

  return {
    ...courseCardShape(course),
    ageGroup: course.ageGroup,
    language: course.language,
    requirements: course.requirementsAr || [],
    targetAudience: course.targetAudienceAr || null,
    instructorRoute: course.instructor ? teacherRoute(course.instructor._id) : null,
  }
}

async function listCourseCategories() {
  const cats = await Course.distinct('category', { status: 'published', isActive: true })
  return cats.map(c => ({ value: c, label: CATEGORY_LABELS[c] || c }))
}

async function searchTeachers({ gender, query, limit = 5 } = {}) {
  const filter = { role: 'teacher', isActive: true }
  if (gender === 'male' || gender === 'female') filter.gender = gender
  if (query) {
    const q = escapeRegex(query)
    filter.$or = [
      { firstNameAr: { $regex: q, $options: 'i' } },
      { lastNameAr: { $regex: q, $options: 'i' } },
      { specialization: { $regex: q, $options: 'i' } },
    ]
  }
  const teachers = await User.find(filter)
    .select('firstNameAr lastNameAr gender specialization')
    .limit(Math.min(Number(limit) || 5, 8))
    .lean()

  return teachers.map(t => ({
    type: 'teacher',
    id: String(t._id),
    name: `${t.firstNameAr || ''} ${t.lastNameAr || ''}`.trim(),
    route: teacherRoute(t._id),
    specialization: t.specialization || null,
  }))
}

async function getTeacherDetails({ id } = {}) {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return null
  const t = await User.findOne({ _id: id, role: 'teacher', isActive: true })
    .select('firstNameAr lastNameAr gender specialization bioAr')
    .lean()
  if (!t) return null
  return {
    type: 'teacher',
    id: String(t._id),
    name: `${t.firstNameAr || ''} ${t.lastNameAr || ''}`.trim(),
    route: teacherRoute(t._id),
    specialization: t.specialization || null,
    bio: t.bioAr || null,
  }
}

// Real pricing source: platform subscription packages. Course documents
// carry no price field — course pricing questions always resolve here.
async function getPackages() {
  const packages = await Package.find({ isActive: true })
    .select('nameAr descriptionAr price durationDays sessionsPerMonth featuresAr isPopular')
    .sort({ sortOrder: 1, price: 1 })
    .lean()

  return packages.map(p => ({
    type: 'package',
    id: String(p._id),
    name: p.nameAr,
    route: '/pricing',
    price: p.price,
    durationDays: p.durationDays,
    sessionsPerMonth: p.sessionsPerMonth,
    features: p.featuresAr || [],
    isPopular: !!p.isPopular,
  }))
}

async function searchArticles({ query, limit = 3 } = {}) {
  if (!query) return []
  try {
    const articles = await Article.find(
      { status: 'published', deletedAt: null, $text: { $search: query } },
      { score: { $meta: 'textScore' }, titleAr: 1, excerptAr: 1, slug: 1 }
    ).sort({ score: { $meta: 'textScore' } }).limit(Math.min(Number(limit) || 3, 5)).lean()

    return articles.map(a => ({
      type: 'article',
      id: String(a._id),
      name: a.titleAr,
      route: `/articles/${a.slug}`,
      excerpt: a.excerptAr || null,
    }))
  } catch (_) {
    return []
  }
}

function searchAiKnowledgeTool({ query } = {}) {
  if (!query) return []
  return searchKnowledge(query, 3).map(e => ({
    type: 'knowledge',
    id: e.id,
    name: e.titleAr || e.id,
    category: e.category,
    answer: e.answerAr,
  }))
}

async function getPlatformContact() {
  const s = await AcademySettings.findOne().select('whatsapp phone email workingHours').lean()
  return {
    type: 'contact',
    whatsapp: s?.whatsapp || null,
    phone: s?.phone || null,
    email: s?.email || null,
    workingHours: s?.workingHours || null,
  }
}

// Small server-side allowlist of navigable public routes — the model
// resolves a route KEY, never a free-form URL.
const ROUTE_MAP = {
  home: '/', courses: '/courses', teachers: '/teachers', pricing: '/pricing',
  faq: '/faq', contact: '/contact', about: '/about', register: '/register', login: '/login',
}
function resolveRoute({ key } = {}) {
  const route = ROUTE_MAP[key]
  return route ? { type: 'route', key, route } : null
}

// Tool schemas exposed to the model (OpenAI function-calling format) plus
// the dispatch map the controller uses to actually execute a requested call.
const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'search_courses',
      description: 'ابحث في الدورات المنشورة الحقيقية على المنصة حسب الفئة أو المستوى أو نص بحث.',
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string', enum: Object.keys(CATEGORY_LABELS) },
          difficulty: { type: 'string', enum: Object.keys(DIFFICULTY_LABELS) },
          query: { type: 'string', description: 'كلمات بحث حرة' },
          limit: { type: 'number' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_course_details',
      description: 'احصل على تفاصيل دورة منشورة حقيقية باستخدام slug أو المعرف.',
      parameters: { type: 'object', properties: { slug: { type: 'string' } }, required: ['slug'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_course_categories',
      description: 'اعرض فئات الدورات المتاحة فعليًا على المنصة.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_teachers',
      description: 'ابحث في المعلمين الحقيقيين المنشورين على المنصة.',
      parameters: {
        type: 'object',
        properties: {
          gender: { type: 'string', enum: ['male', 'female'] },
          query: { type: 'string' },
          limit: { type: 'number' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_teacher_details',
      description: 'احصل على تفاصيل معلم حقيقي باستخدام المعرف.',
      parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_packages',
      description: 'احصل على باقات الاشتراك الحقيقية المنشورة مع الأسعار الفعلية. هذا هو المصدر الوحيد الموثوق للأسعار.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_articles',
      description: 'ابحث في المقالات التعليمية المنشورة الحقيقية على المنصة.',
      parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_ai_knowledge',
      description: 'ابحث في قاعدة المعرفة المعتمدة يدويًا (معلومات تشغيلية غير موجودة في قواعد البيانات الأخرى، مثل أسعار الحصص الخاصة إن وُجدت).',
      parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_platform_contact',
      description: 'احصل على بيانات التواصل الرسمية الحقيقية للمنصة (واتساب، هاتف، بريد، ساعات العمل).',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'resolve_route',
      description: 'حوّل مفتاح صفحة داخلي إلى رابط داخلي حقيقي للموقع.',
      parameters: {
        type: 'object',
        properties: { key: { type: 'string', enum: Object.keys(ROUTE_MAP) } },
        required: ['key'],
      },
    },
  },
]

const TOOL_DISPATCH = {
  search_courses: searchCourses,
  get_course_details: getCourseDetails,
  list_course_categories: listCourseCategories,
  search_teachers: searchTeachers,
  get_teacher_details: getTeacherDetails,
  get_packages: getPackages,
  search_articles: searchArticles,
  search_ai_knowledge: searchAiKnowledgeTool,
  get_platform_contact: getPlatformContact,
  resolve_route: resolveRoute,
}

// The one and only entry point the AI service is allowed to call by name —
// anything not in TOOL_DISPATCH is refused, never executed.
async function callTool(name, args) {
  const fn = TOOL_DISPATCH[name]
  if (!fn) return { error: 'أداة غير معروفة' }
  try {
    const result = await fn(args || {})
    return result === null || result === undefined ? { error: 'لا توجد نتائج' } : result
  } catch (err) {
    console.warn(`[AI Tool] ${name} failed:`, err.message)
    return { error: 'تعذر تنفيذ العملية' }
  }
}

module.exports = {
  TOOL_DEFINITIONS,
  callTool,
  // Exported individually for the no-LLM deterministic fallback router.
  searchCourses, getCourseDetails, searchTeachers, getPackages, getPlatformContact, searchAiKnowledgeTool,
}
