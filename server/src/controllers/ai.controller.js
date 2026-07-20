const { sendSuccess, sendError } = require('../utils/response')
const { askAI, askConcierge, hasLLM, HANDOFF_MARKER, MODEL } = require('../services/ai.service')
const { getKnowledgeStatus } = require('../services/aiKnowledge.service')
const aiTools = require('../services/aiTools.service')
const AIFeedback = require('../models/AIFeedback')
const Article = require('../models/Article')

// ── Rule-based fallback knowledge base (Tutor persona) ───────────────────────

const KNOWLEDGE_BASE = {
  tajweed_rules: {
    keywords: ['تجويد', 'أحكام', 'صفات', 'مخارج', 'حروف'],
    answer: `أحكام التجويد الأساسية:\n\n١. **أحكام النون الساكنة والتنوين:**\n- الإظهار: عند حروف الحلق (أ، ه، ع، ح، غ، خ)\n- الإدغام: عند حروف (ي، ر، م، ل، و، ن)\n- الإقلاب: عند حرف الباء (ب)\n- الإخفاء: عند باقي الحروف الخمسة عشر\n\n٢. **أحكام الميم الساكنة:**\n- الإخفاء الشفوي: عند الباء\n- الإدغام الشفوي: عند الميم\n- الإظهار الشفوي: عند باقي الحروف\n\n٣. **المد:**\n- المد الأصلي: 2 حركة\n- المد الفرعي: 4-6 حركات`,
  },
  memorization_tips: {
    keywords: ['حفظ', 'خطوات', 'تحسين', 'نصيحة', 'طريقة', 'ختمة', 'مراجعة'],
    answer: `نصائح لتحسين حفظ القرآن الكريم:\n\n١. **التكرار المنتظم** — كرر كل آية 7-10 مرات\n٢. **الربط بالمعنى** — افهم معنى الآية لتتذكرها أسرع\n٣. **الحفظ صباحاً** — الذاكرة أقوى بعد صلاة الفجر\n٤. **المراجعة اليومية** — راجع ما حفظته قبل إضافة جديد\n٥. **الاستماع المتكرر** — استمع لقارئ جيد عدة مرات\n٦. **التسميع** — سَمِّع يومياً أمام المعلم`,
  },
  idgham: {
    keywords: ['إدغام'],
    answer: `الإدغام في التجويد:\n\nإدخال حرف في حرف مثله أو قريب منه.\n\n**أنواعه:**\n- إدغام بغنة: عند حروف (ينمو)\n- إدغام بلا غنة: عند حرفي (ل ر)\n\n**مثال:** "من يعمل" — النون تُدغم في الياء`,
  },
  ikhfaa: {
    keywords: ['إخفاء'],
    answer: `الإخفاء: النطق بالنون الساكنة بصفة بين الإظهار والإدغام مع الغنة.\n\n**حروفه الخمسة عشر:** ص ذ ث ك ج ش ق س د ط ز ف ت ض ظ\n\n**مثال:** "منكم" — النون تُخفى قبل الكاف مع الغنة`,
  },
  izhaar: {
    keywords: ['إظهار'],
    answer: `الإظهار الحلقي: النطق بالنون الساكنة من غير غنة.\n\n**حروفه الستة:** أ هـ ع ح غ خ (حروف الحلق)\n\n**مثال:** "من أمن" — النون تُظهر قبل الألف`,
  },
  iqlab: {
    keywords: ['إقلاب'],
    answer: `الإقلاب: قلب النون الساكنة ميماً مع إخفائها عند الباء.\n\n**حرفه:** الباء (ب) فقط\n\n**مثال:** "أنبياء" — تُقلب النون ميماً → "أمبياء"`,
  },
  madd: {
    keywords: ['مد', 'مدود', 'مد الصلة', 'مد اللين'],
    answer: `أنواع المد في التجويد:\n\n**المد الأصلي (الطبيعي):** حركتان — لا يتوقف عليه كلام.\n\n**المد الفرعي:** أكثر من حركتين، له أسباب:\n- الهمز: مد واجب متصل (4-5 حركات)، مد جائز منفصل (2-5 حركات)\n- السكون: مد عارض للسكون (2-4-6 حركات)، مد لين`,
  },
  academy: {
    keywords: ['أكاديمية', 'ترتيلة', 'سعر', 'باقة', 'تسجيل', 'اشتراك', 'حصة', 'معلم'],
    answer: `أكاديمية ترتيلة أونلاين:\n\n🎓 **متخصصون في:** تعليم القرآن الكريم والتجويد والحفظ\n\n📚 **ما نقدمه:**\n- حصص فردية مع معلمين متخصصين\n- جداول مرنة تناسب وقتك\n- متابعة أكاديمية مستمرة\n- تقييمات دورية لقياس التقدم\n\n💡 **للتسجيل أو الاستفسار عن الأسعار:** تواصل معنا عبر صفحة التواصل أو سجل مباشرة من الموقع.`,
  },
  default: {
    answer: `شكراً على سؤالك! يمكنني مساعدتك في:\n\n📚 **التجويد:** أحكام النون الساكنة، الميم الساكنة، المدود\n📖 **الحفظ:** طرق وأساليب الحفظ المجربة\n🎯 **القراءة:** تحسين النطق والتلاوة\n🏫 **الأكاديمية:** الباقات والخدمات\n\nما هو موضوع سؤالك تحديداً؟`,
  },
}

function findBestMatch(question) {
  const q = question.toLowerCase()
  for (const [key, entry] of Object.entries(KNOWLEDGE_BASE)) {
    if (key === 'default') continue
    if (entry.keywords?.some(k => q.includes(k))) return entry
  }
  return KNOWLEDGE_BASE.default
}

async function searchArticleKnowledge(question) {
  try {
    const articles = await Article.find(
      { status: 'published', deletedAt: null, $text: { $search: question } },
      { score: { $meta: 'textScore' }, titleAr: 1, title: 1, excerptAr: 1, excerpt: 1, slug: 1 }
    ).sort({ score: { $meta: 'textScore' } }).limit(3).lean()
    return articles
  } catch (_) { return [] }
}

// ── Tutor endpoint (existing, authenticated, AIAssistantPage.jsx) ───────────

exports.ask = async (req, res, next) => {
  try {
    const { question, history } = req.body
    if (!question?.trim()) return sendError(res, 'يرجى إدخال سؤال', 400)

    let answer = null
    let mode = 'rule-based'
    let sources = ['قواعد التجويد - منهج ترتيلة']

    const relatedArticles = await searchArticleKnowledge(question)

    if (hasLLM) {
      try {
        let enrichedHistory = history || []
        if (relatedArticles.length > 0) {
          const articleCtx = relatedArticles.map(a =>
            `مقال: ${a.titleAr || a.title}\n${a.excerptAr || a.excerpt || ''}`
          ).join('\n\n')
          enrichedHistory = [
            { role: 'user', content: `[معرفة من المقالات]\n${articleCtx}` },
            { role: 'assistant', content: 'فهمت، سأستخدم هذه المعرفة في الإجابة.' },
            ...enrichedHistory,
          ]
        }
        answer = await askAI(question, enrichedHistory)
        mode = 'llm'
        if (relatedArticles.length > 0) {
          sources = relatedArticles.map(a => `${a.titleAr || a.title} — /articles/${a.slug}`)
        }
      } catch (err) {
        console.warn('[AI] LLM error, falling back to rule-based:', err.message)
      }
    }

    if (!answer) {
      const entry = findBestMatch(question)
      answer = entry.answer
      if (relatedArticles.length > 0) {
        const articleLinks = relatedArticles.map(a => `- ${a.titleAr || a.title}`).join('\n')
        answer += `\n\n📚 **مقالات ذات صلة:**\n${articleLinks}`
        sources = relatedArticles.map(a => `${a.titleAr || a.title} — /articles/${a.slug}`)
      }
    }

    sendSuccess(res, { answer, mode, sources })
  } catch (err) {
    next(err)
  }
}

exports.getStatus = async (req, res) => {
  const knowledge = getKnowledgeStatus()
  res.json({ success: true, data: { hasLLM, model: hasLLM ? MODEL : null, mode: hasLLM ? 'llm' : 'rule-based', knowledge } })
}

// ── Concierge endpoint (new, public, floating widget) ────────────────────────

const CONTACT_INTENT = ['تواصل', 'دعم', 'واتساب', 'واتس', 'اتصال', 'مكالمة', 'إنسان', 'موظف', 'مسؤول']
const PACKAGE_INTENT = ['سعر', 'اسعار', 'أسعار', 'باقة', 'باقات', 'اشتراك', 'تكلفة', 'فلوس', 'رسوم']
const TEACHER_INTENT = ['مدرس', 'معلم', 'معلمة', 'مدرسة', 'مدرسين', 'معلمين']
const COURSE_WORDS = ['دورة', 'دورات', 'كورس', 'كورسات']

function pageContextNoteFrom(pageContext) {
  if (!pageContext) return null
  const parts = []
  if (pageContext.pageType === 'course' && pageContext.courseSlug) {
    parts.push(`المستخدم يتصفح حاليًا صفحة دورة. المعرف/الرابط المختصر لهذه الدورة: "${pageContext.courseSlug}". إن سأل عن "هذه الدورة" استخدم get_course_details بهذا المعرف أولًا.`)
  } else if (pageContext.pageType === 'teacher' && pageContext.teacherId) {
    parts.push(`المستخدم يتصفح حاليًا صفحة معلم. معرف هذا المعلم: "${pageContext.teacherId}". إن سأل عن "هذا المعلم" استخدم get_teacher_details بهذا المعرف أولًا.`)
  } else if (pageContext.pageType === 'pricing') {
    parts.push('المستخدم يتصفح حاليًا صفحة الأسعار/الباقات.')
  } else if (pageContext.pageType === 'article' && pageContext.articleSlug) {
    parts.push(`المستخدم يتصفح حاليًا مقالة بعنوان مختصر "${pageContext.articleSlug}".`)
  }
  return parts.length ? parts.join(' ') : null
}

function suggestionsFor(pageContext) {
  if (pageContext?.pageType === 'course') {
    return ['هل هذه الدورة مناسبة للمبتدئين؟', 'ما مدة الدورة؟', 'كيف أسجل؟']
  }
  if (pageContext?.pageType === 'pricing') {
    return ['ما الفرق بين الباقات؟', 'هل يوجد خصم؟', 'أريد التحدث مع الدعم']
  }
  if (pageContext?.pageType === 'teacher') {
    return ['ما تخصص هذا المعلم؟', 'ما الدورات التي يقدمها؟']
  }
  return ['رشّح لي دورة مناسبة', 'ما الدورات المتاحة؟', 'هل يوجد شهادة إتمام؟', 'أريد التحدث مع الدعم']
}

function dedupeEntities(list) {
  const seen = new Set()
  const out = []
  for (const item of list) {
    const key = `${item.type}:${item.id || item.key || item.name}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out.slice(0, 6)
}

// Builds the "عرض المزيد من الدورات" deep link into /courses, carrying
// forward whatever category/free-text query actually produced the courses
// shown — so the visitor lands on a prefiltered browse page, not a blank one.
function courseBrowseUrl(courseQuery) {
  if (!courseQuery) return null
  const params = new URLSearchParams()
  if (courseQuery.category) params.set('category', courseQuery.category)
  if (courseQuery.query) params.set('search', courseQuery.query)
  const qs = params.toString()
  return qs ? `/courses?${qs}` : '/courses'
}

// Deterministic, LLM-free intent router — used only when OPENAI_API_KEY is
// not configured or the provider call fails. Real data only, same as the
// LLM path; just no natural-language generation on top of it.
async function deterministicConcierge(message, pageContext) {
  const q = message.toLowerCase()
  let entities = []
  let handoff = false
  let answer
  let courseQuery = null

  let pageCourse = null
  if (pageContext?.pageType === 'course' && pageContext.courseSlug) {
    pageCourse = await aiTools.getCourseDetails({ slug: pageContext.courseSlug })
    if (pageCourse) entities.push(pageCourse)
  }

  // Answer directly from the course the visitor is already looking at
  // before falling back to a generic catalog browse/search.
  const refersToThisCourse = ['هذه الدورة', 'الدورة دي', 'الدوره دي', 'هل هي مناسبة', 'هل تناسب'].some(k => q.includes(k))
    || (pageCourse && ['مناسب', 'مناسبة', 'مدة', 'مدتها', 'كيف أسجل', 'التسجيل', 'حصص', 'دروس'].some(k => q.includes(k)))

  if (pageCourse && refersToThisCourse && !CONTACT_INTENT.some(k => q.includes(k)) && !PACKAGE_INTENT.some(k => q.includes(k))) {
    const beginnerAsk = ['مبتدئ', 'مبتدئين', 'مناسب', 'مناسبة'].some(k => q.includes(k))
    const durationAsk = ['مدة', 'مدتها', 'كام ساعة', 'وقت'].some(k => q.includes(k))
    const enrollAsk = ['سجل', 'تسجيل', 'اشترك'].some(k => q.includes(k))

    const lines = [`دورة "${pageCourse.name}" — المستوى: ${pageCourse.difficulty}.`]
    if (beginnerAsk) {
      lines.push(pageCourse.difficulty === 'مبتدئ'
        ? 'نعم، هذه الدورة مصممة للمبتدئين.'
        : `هذه الدورة بمستوى "${pageCourse.difficulty}"، فقد تحتاج أساسًا سابقًا قبل البدء بها.`)
    }
    if (durationAsk) lines.push(`مدتها التقديرية ${pageCourse.estimatedDurationHours} ساعة عبر ${pageCourse.lessonsCount} درسًا.`)
    if (enrollAsk) lines.push(pageCourse.enrollmentEnabled ? 'التسجيل متاح حاليًا مباشرة من صفحة الدورة.' : 'التسجيل في هذه الدورة مغلق مؤقتًا حاليًا.')
    answer = lines.join(' ')
  } else if (CONTACT_INTENT.some(k => q.includes(k))) {
    const contact = await aiTools.getPlatformContact()
    entities.push(contact)
    handoff = true
    answer = 'يمكنك التواصل مع فريق الدعم مباشرة عبر واتساب وسنساعدك في أقرب وقت.'
  } else if (PACKAGE_INTENT.some(k => q.includes(k))) {
    const packages = await aiTools.getPackages()
    entities = entities.concat(packages)
    answer = packages.length
      ? `هذه باقات الاشتراك الحالية المتاحة فعليًا على المنصة:\n\n${packages.map(p => `- ${p.name}: ${p.price} / ${p.durationDays} يوم (${p.sessionsPerMonth} حصة شهريًا)`).join('\n')}`
      : 'لا تتوفر لديّ حاليًا بيانات أسعار معتمدة لهذا السؤال.'
    if (!packages.length) handoff = true
  } else if (TEACHER_INTENT.some(k => q.includes(k))) {
    const teachers = await aiTools.searchTeachers({ limit: 5 })
    entities = entities.concat(teachers)
    answer = teachers.length
      ? `هؤلاء بعض المعلمين المتاحين حاليًا على المنصة:\n\n${teachers.map(t => `- ${t.name}${t.specialization ? ` (${t.specialization})` : ''}`).join('\n')}`
      : 'لا يوجد معلمون متاحون ضمن بياناتي حاليًا.'
  } else {
    const knowledge = aiTools.searchAiKnowledgeTool({ query: message })
    if (knowledge.length) {
      entities = entities.concat(knowledge)
      answer = knowledge[0].answer
    } else {
      // Generic "what courses do you have" phrasing has no topic keyword to
      // regex-match against course names — browse all published courses
      // instead of searching for the literal question text.
      const isGenericBrowse = COURSE_WORDS.some(w => q.includes(w))
      courseQuery = isGenericBrowse ? {} : { query: message }
      const courses = isGenericBrowse
        ? await aiTools.searchCourses({ limit: 5 })
        : await aiTools.searchCourses({ query: message, limit: 5 })
      entities = entities.concat(courses)
      answer = courses.length
        ? `وجدت هذه الدورات:\n\n${courses.map(c => `- ${c.name} (${c.difficulty})`).join('\n')}`
        : 'لم أجد معلومة مؤكدة لهذا السؤال ضمن بياناتي المعتمدة حاليًا. يمكنني تحويلك لفريق الدعم عبر واتساب للتأكد.'
      if (!courses.length) handoff = true
    }
  }

  return { answer, entities: dedupeEntities(entities), handoff, courseQuery }
}

exports.chat = async (req, res, next) => {
  try {
    const { message, history = [], pageContext, conversationId } = req.body
    if (!message?.trim()) return sendError(res, 'يرجى إدخال رسالة', 400)

    const persona = 'concierge'
    let handoffRecommended = false
    let entities = []
    let answer = null
    let degraded = false
    let courseQuery = null

    if (hasLLM) {
      try {
        const usedTools = []
        const result = await askConcierge({
          message,
          history,
          pageContextNote: pageContextNoteFrom(pageContext),
          usedTools,
        })
        if (result?.text) {
          handoffRecommended = result.text.includes(HANDOFF_MARKER)
          answer = result.text.replace(HANDOFF_MARKER, '').trim()
          entities = dedupeEntities(usedTools)
          courseQuery = result.courseQuery
        }
      } catch (err) {
        console.warn('[AI Concierge] provider error, falling back:', err.message)
        degraded = true
      }
    }

    if (!answer) {
      const fallback = await deterministicConcierge(message, pageContext)
      answer = fallback.answer
      entities = fallback.entities
      handoffRecommended = handoffRecommended || fallback.handoff || degraded
      courseQuery = fallback.courseQuery
    }

    let contact = null
    if (handoffRecommended) {
      contact = await aiTools.getPlatformContact()
    }

    sendSuccess(res, {
      answer,
      entities,
      suggestions: suggestionsFor(pageContext),
      handoff: { recommended: handoffRecommended, contact },
      courseBrowseUrl: courseBrowseUrl(courseQuery),
      conversationId: conversationId || null,
      mode: hasLLM && !degraded ? 'llm' : 'rule-based',
    })
  } catch (err) {
    next(err)
  }
}

exports.submitFeedback = async (req, res, next) => {
  try {
    const { conversationId, responseId, value, persona } = req.body
    await AIFeedback.create({
      conversationId,
      responseId,
      value,
      persona: persona === 'tutor' ? 'tutor' : 'concierge',
      userId: req.user?._id,
    })
    sendSuccess(res, null, 'شكرًا لملاحظتك')
  } catch (err) {
    next(err)
  }
}
