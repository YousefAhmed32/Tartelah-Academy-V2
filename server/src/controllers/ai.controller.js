const { sendSuccess, sendError } = require('../utils/response')
const { askAI, hasLLM } = require('../services/ai.service')
const Article = require('../models/Article')

// ── Rule-based fallback knowledge base ───────────────────────────────────────

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

// ── Ask endpoint ──────────────────────────────────────────────────────────────

async function searchArticleKnowledge(question) {
  try {
    const articles = await Article.find(
      { status: 'published', deletedAt: null, $text: { $search: question } },
      { score: { $meta: 'textScore' }, titleAr: 1, title: 1, excerptAr: 1, excerpt: 1, slug: 1 }
    ).sort({ score: { $meta: 'textScore' } }).limit(3).lean()
    return articles
  } catch (_) { return [] }
}

exports.ask = async (req, res, next) => {
  try {
    const { question, history } = req.body
    if (!question?.trim()) return sendError(res, 'يرجى إدخال سؤال', 400)

    let answer = null
    let mode = 'rule-based'
    let sources = ['قواعد التجويد - منهج ترتيلة']

    // Search articles knowledge base
    const relatedArticles = await searchArticleKnowledge(question)

    // Try real LLM first
    if (hasLLM) {
      try {
        // Enrich context with article excerpts if available
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

    // Fallback to rule-based + append related articles info
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
  res.json({ success: true, data: { hasLLM, mode: hasLLM ? 'llm' : 'rule-based' } })
}
