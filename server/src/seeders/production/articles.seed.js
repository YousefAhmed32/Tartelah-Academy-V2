/**
 * Production content seed: the article categories and blog posts currently
 * published on the platform (sourced from server/src/seed/seed.js, stripped
 * of randomization so re-running this seeder is deterministic). Idempotent —
 * categories matched by `slug`, articles matched by `slug`; existing
 * documents are never overwritten.
 */
const Article = require('../../models/Article')
const ArticleCategory = require('../../models/ArticleCategory')

const CATEGORIES = [
  { name: 'Tajweed', nameAr: 'التجويد', slug: 'tajweed', color: '#7c3aed', icon: '📖' },
  { name: 'Memorization', nameAr: 'الحفظ', slug: 'memorization', color: '#E8C76A', icon: '🕌' },
  { name: 'Parenting', nameAr: 'تربية الأبناء', slug: 'parenting', color: '#22c55e', icon: '👨‍👩‍👧' },
  { name: 'Platform News', nameAr: 'أخبار المنصة', slug: 'platform-news', color: '#3b82f6', icon: '📰' },
]

const ARTICLES = [
  { titleAr: 'أحكام النون الساكنة والتنوين بالتفصيل', category: 'tajweed', tags: ['تجويد', 'قرآن'], status: 'published', featured: true, pinned: true, views: 1850, likes: 96 },
  { titleAr: '10 نصائح لتثبيت الحفظ', category: 'memorization', tags: ['حفظ', 'تعليم'], status: 'published', featured: true, views: 2200, likes: 130 },
  { titleAr: 'كيف تحفّز طفلك على حفظ القرآن', category: 'parenting', tags: ['أطفال', 'تربية'], status: 'published', featured: true, views: 1600, likes: 88 },
  { titleAr: 'الفرق بين رواية حفص وورش', category: 'tajweed', tags: ['تجويد', 'قرآن'], status: 'published', views: 1200, likes: 54 },
  { titleAr: 'خطة مراجعة أسبوعية فعّالة', category: 'memorization', tags: ['حفظ'], status: 'published', views: 980, likes: 41 },
  { titleAr: 'آداب تلاوة القرآن الكريم', category: 'tajweed', tags: ['قرآن', 'تعليم'], status: 'published', views: 1400, likes: 62 },
  { titleAr: 'أهمية القراءة الصحيحة قبل الحفظ', category: 'memorization', tags: ['حفظ', 'تعليم'], status: 'draft', views: 0, likes: 0 },
  { titleAr: 'كيف تختار المعلم المناسب لك', category: 'parenting', tags: ['تعليم'], status: 'draft', views: 0, likes: 0 },
  { titleAr: 'قصص نجاح من طلابنا', category: 'platform-news', tags: ['قرآن'], status: 'scheduled', views: 0, likes: 0 },
  { titleAr: 'تحديثات جديدة على منصة ترتيلة', category: 'platform-news', tags: ['تعليم'], status: 'archived', views: 450, likes: 12 },
]

function slugify(titleAr, index) {
  return `article-${index + 1}-${titleAr.split(' ')[0]}`.replace(/[^a-zA-Z0-9؀-ۿ-]/g, '')
}

async function seedArticles({ authorId }) {
  const categoryDocs = {}
  let categoriesCreated = 0
  for (const cat of CATEGORIES) {
    let doc = await ArticleCategory.findOne({ slug: cat.slug })
    if (!doc) {
      doc = await ArticleCategory.create(cat)
      categoriesCreated++
    }
    categoryDocs[cat.slug] = doc
  }

  let articlesCreated = 0
  let articlesSkipped = 0
  for (let i = 0; i < ARTICLES.length; i++) {
    const a = ARTICLES[i]
    const slug = slugify(a.titleAr, i)
    const exists = await Article.findOne({ slug })
    if (exists) { articlesSkipped++; continue }

    const now = new Date()
    const publishedAt = a.status === 'published' ? now : a.status === 'archived' ? new Date(now.getTime() - 150 * 24 * 60 * 60 * 1000) : undefined
    const scheduledAt = a.status === 'scheduled' ? new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) : undefined

    await Article.create({
      title: `Article ${i + 1}`,
      titleAr: a.titleAr,
      slug,
      excerptAr: `مقتطف تعريفي عن مقال "${a.titleAr}" يلخص أهم الأفكار الواردة فيه.`,
      contentAr: `<p>محتوى تفصيلي حول ${a.titleAr}.</p><p>يتناول هذا المقال عدة محاور تعليمية مهمة لطلاب القرآن الكريم ومعلميه.</p>`,
      author: authorId,
      category: categoryDocs[a.category]._id,
      tags: a.tags,
      status: a.status,
      publishedAt,
      scheduledAt,
      featured: !!a.featured,
      pinned: !!a.pinned,
      views: a.views,
      likes: a.likes,
      createdBy: authorId,
    })
    articlesCreated++
  }

  return {
    categories: { total: CATEGORIES.length, created: categoriesCreated, skipped: CATEGORIES.length - categoriesCreated },
    articles: { total: ARTICLES.length, created: articlesCreated, skipped: articlesSkipped },
  }
}

module.exports = { seedArticles, ARTICLES, CATEGORIES }
