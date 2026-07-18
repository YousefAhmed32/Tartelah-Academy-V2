import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { BookOpen, Search, Star, Pin, Mail } from 'lucide-react'
import api from '../../utils/api.js'
import { getFileUrl, ROUTES } from '../../config/constants.js'
import { useAuthStore } from '../../store/authStore.js'
import { formatDateAr as formatDate } from '../../utils/date.js'

// ── Helpers ────────────────────────────────────────────────────────────────────

// Extract headings from HTML content for Table of Contents
function extractHeadings(html) {
  if (!html) return []
  const matches = [...html.matchAll(/<h([23])[^>]*id="([^"]*)"[^>]*>(.*?)<\/h[23]>/gi)]
  if (matches.length) {
    return matches.map(m => ({
      level: parseInt(m[1]),
      id: m[2],
      text: m[3].replace(/<[^>]+>/g, ''),
    }))
  }
  // Auto-extract without IDs
  const plain = [...html.matchAll(/<h([23])[^>]*>(.*?)<\/h[23]>/gi)]
  return plain.map((m, i) => ({
    level: parseInt(m[1]),
    id: `heading-${i}`,
    text: m[2].replace(/<[^>]+>/g, ''),
  }))
}

// Inject IDs into headings in HTML
function injectHeadingIds(html) {
  if (!html) return html
  let counter = 0
  return html.replace(/<h([23])([^>]*)>(.*?)<\/h[23]>/gi, (match, level, attrs, content) => {
    if (attrs.includes('id=')) return match
    const id = `heading-${counter++}`
    return `<h${level}${attrs} id="${id}">${content}</h${level}>`
  })
}

// ── Reading Progress Bar ───────────────────────────────────────────────────────

function ReadingProgressBar() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const updateProgress = () => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement
      const total = scrollHeight - clientHeight
      setProgress(total > 0 ? Math.min(100, (scrollTop / total) * 100) : 0)
    }
    window.addEventListener('scroll', updateProgress, { passive: true })
    return () => window.removeEventListener('scroll', updateProgress)
  }, [])

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gray-200">
      <motion.div
        className="h-full"
        style={{ background: 'linear-gradient(90deg, #7c3aed, #E8C76A)', width: `${progress}%` }}
        initial={false}
        transition={{ duration: 0.1 }}
      />
    </div>
  )
}

// ── Table of Contents ──────────────────────────────────────────────────────────

function TableOfContents({ headings, activeId }) {
  if (!headings.length) return null

  return (
    <div className="sticky top-20 bg-white rounded-2xl shadow-sm p-5" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
      <h3 className="font-heading font-bold text-sm text-gray-800 mb-3 flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        محتويات المقال
      </h3>
      <nav className="space-y-1">
        {headings.map((h) => (
          <a
            key={h.id}
            href={`#${h.id}`}
            className={`block text-sm leading-snug transition-all py-1 border-r-2 pr-3 ${
              h.level === 3 ? 'mr-3 text-[12px]' : ''
            } ${
              activeId === h.id
                ? 'border-violet-500 text-violet-700 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
            }`}
            dir="rtl"
          >
            {h.text}
          </a>
        ))}
      </nav>
    </div>
  )
}

// ── Share Bar ──────────────────────────────────────────────────────────────────

function ShareBar({ title, slug }) {
  const url = typeof window !== 'undefined' ? window.location.href : ''

  function copyLink() {
    navigator.clipboard.writeText(url).then(() => toast.success('تم نسخ الرابط'))
  }

  function shareTwitter() {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`, '_blank')
  }

  function shareWhatsapp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`, '_blank')
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider" style={{ writingMode: 'vertical-rl' }}>شارك</span>
      <button onClick={shareTwitter} title="مشاركة على تويتر"
        className="w-9 h-9 rounded-xl bg-white shadow-sm border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-black hover:text-white hover:border-black transition-all">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.853L1.999 2.25H8.08l4.253 5.622L18.244 2.25z"/>
        </svg>
      </button>
      <button onClick={shareWhatsapp} title="مشاركة عبر واتساب"
        className="w-9 h-9 rounded-xl bg-white shadow-sm border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-green-500 hover:text-white hover:border-green-500 transition-all">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
        </svg>
      </button>
      <button onClick={copyLink} title="نسخ الرابط"
        className="w-9 h-9 rounded-xl bg-white shadow-sm border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-violet-600 hover:text-white hover:border-violet-600 transition-all">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  )
}

// ── Related Article Card ───────────────────────────────────────────────────────

function RelatedCard({ article }) {
  const authorName = article.author
    ? `${article.author.firstNameAr || ''} ${article.author.lastNameAr || ''}`.trim()
    : 'ترتيلة'

  return (
    <Link to={`/articles/${article.slug}`}
      className="group flex gap-4 p-4 bg-white rounded-xl hover:shadow-md transition-all"
      style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
      <div className="w-20 h-20 rounded-xl overflow-hidden flex-none bg-violet-50">
        {article.coverImage
          ? <img src={getFileUrl(article.coverImage)} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : <div className="w-full h-full flex items-center justify-center"><BookOpen size={28} strokeWidth={1.4} color="#a78bfa" /></div>}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-sm text-gray-900 line-clamp-2 mb-1 group-hover:text-violet-700 transition-colors" dir="rtl">
          {article.titleAr || article.title}
        </h4>
        <div className="text-[11px] text-gray-400">{authorName} · {article.readingTime} دقيقة</div>
      </div>
    </Link>
  )
}

// ── Article Skeleton ───────────────────────────────────────────────────────────

function ArticleSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-72 md:h-96 bg-gray-200 rounded-2xl mb-8" />
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="h-4 bg-gray-200 rounded w-1/4" />
        <div className="h-10 bg-gray-200 rounded w-full" />
        <div className="h-10 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ArticleDetailPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()
  const contentRef = useRef(null)
  const [activeHeadingId, setActiveHeadingId] = useState('')
  const [liked, setLiked] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [localLikes, setLocalLikes] = useState(0)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['article', slug],
    queryFn: () => api.get(`/articles/${slug}`).then(r => r.data.data),
    staleTime: 60 * 1000,
  })

  const article = data?.article
  const related = data?.related || []
  const prevArticle = data?.prev
  const nextArticle = data?.next

  useEffect(() => {
    if (data) {
      setLiked(data.userLiked || false)
      setBookmarked(data.userBookmarked || false)
      setLocalLikes(data.article?.likes || 0)
    }
  }, [data])

  // Active heading tracking
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting)
        if (visible.length > 0) setActiveHeadingId(visible[0].target.id)
      },
      { rootMargin: '-20% 0% -70% 0%', threshold: 0 }
    )
    const headings = contentRef.current?.querySelectorAll('h2, h3') || []
    headings.forEach(h => observer.observe(h))
    return () => observer.disconnect()
  }, [article])

  const likeMutation = useMutation({
    mutationFn: () => api.post(`/articles/${slug}/like`),
    onMutate: () => {
      const next = !liked
      setLiked(next)
      setLocalLikes(prev => next ? prev + 1 : Math.max(0, prev - 1))
    },
    onError: () => {
      setLiked(liked)
      setLocalLikes(article?.likes || 0)
    },
  })

  const bookmarkMutation = useMutation({
    mutationFn: () => api.post(`/articles/${slug}/bookmark`),
    onMutate: () => setBookmarked(!bookmarked),
    onError: () => setBookmarked(bookmarked),
    onSuccess: (res) => {
      const msg = res.data.data?.bookmarked ? 'تم حفظ المقال' : 'تم إلغاء الحفظ'
      toast.success(msg)
    },
  })

  function handleLike() {
    if (!isAuthenticated) { toast.error('يجب تسجيل الدخول أولاً'); return }
    likeMutation.mutate()
  }

  function handleBookmark() {
    if (!isAuthenticated) { toast.error('يجب تسجيل الدخول أولاً'); return }
    bookmarkMutation.mutate()
  }

  if (isLoading) return (
    <div className="min-h-screen" style={{ background: '#F8F7FF' }} dir="rtl">
      <ReadingProgressBar />
      <div className="max-w-5xl mx-auto px-4 py-10"><ArticleSkeleton /></div>
    </div>
  )

  if (isError || !article) return (
    <div className="min-h-screen flex flex-col items-center justify-center" dir="rtl">
      <Search size={60} strokeWidth={1.2} color="#d1d5db" className="mb-4" />
      <h2 className="font-heading font-bold text-2xl text-gray-800 mb-2">المقال غير موجود</h2>
      <p className="text-gray-500 mb-6">ربما تم حذف المقال أو تغيير رابطه</p>
      <Link to={ROUTES.ARTICLES} className="px-6 py-2.5 rounded-xl bg-violet-600 text-white font-semibold hover:bg-violet-700 transition-colors">
        العودة للمقالات
      </Link>
    </div>
  )

  const authorName = article.author
    ? `${article.author.firstNameAr || article.author.firstName || ''} ${article.author.lastNameAr || article.author.lastName || ''}`.trim()
    : 'ترتيلة'

  const processedContent = injectHeadingIds(article.contentAr || article.content || '')
  const headings = extractHeadings(processedContent)

  return (
    <div className="min-h-screen" dir="rtl" style={{ background: '#F8F7FF' }}>
      <ReadingProgressBar />

      {/* ── Hero Cover ────────────────────────────────────────────────────── */}
      {article.coverImage && (
        <div className="relative w-full h-64 md:h-96 overflow-hidden">
          <img src={getFileUrl(article.coverImage)} alt={article.titleAr || article.title}
            className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(15,2,38,0.8) 0%, transparent 60%)' }} />
        </div>
      )}

      {/* ── Article Header ────────────────────────────────────────────────── */}
      <div className={`${article.coverImage ? '-mt-32 relative' : 'pt-12'}`}>
        <div className="max-w-5xl mx-auto px-4">
          <div className={`${article.coverImage ? 'bg-white rounded-3xl shadow-xl p-8 md:p-10' : ''}`}>

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-5">
              <Link to={ROUTES.HOME} className="hover:text-violet-600 transition-colors">الرئيسية</Link>
              <span>/</span>
              <Link to={ROUTES.ARTICLES} className="hover:text-violet-600 transition-colors">المقالات</Link>
              {article.category && (
                <>
                  <span>/</span>
                  <Link to={`${ROUTES.ARTICLES}?category=${article.category._id}`}
                    className="hover:text-violet-600 transition-colors">
                    {article.category.nameAr || article.category.name}
                  </Link>
                </>
              )}
            </div>

            {/* Category + Tags */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {article.category && (
                <span className="text-xs font-bold px-3 py-1.5 rounded-full"
                  style={{ background: `${article.category.color}18`, color: article.category.color }}>
                  {article.category.icon} {article.category.nameAr || article.category.name}
                </span>
              )}
              {article.featured && (
                <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-amber-50 text-amber-600 flex items-center gap-1"><Star size={11} strokeWidth={0} fill="#d97706" /> مميز</span>
              )}
              {article.pinned && (
                <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 flex items-center gap-1"><Pin size={11} strokeWidth={0} fill="#3b82f6" /> مثبت</span>
              )}
            </div>

            {/* Title */}
            <h1 className="font-heading font-extrabold text-3xl md:text-4xl text-gray-900 leading-tight mb-4" dir="rtl">
              {article.titleAr || article.title}
            </h1>

            {/* Excerpt */}
            {(article.excerptAr || article.excerpt) && (
              <p className="text-lg text-gray-600 leading-relaxed mb-6" dir="rtl">
                {article.excerptAr || article.excerpt}
              </p>
            )}

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-5 text-sm text-gray-500 pb-6 border-b border-gray-100">
              {/* Author */}
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full overflow-hidden flex-none bg-violet-100 flex items-center justify-center font-bold text-violet-700">
                  {article.author?.avatar
                    ? <img src={getFileUrl(article.author.avatar)} alt="" className="w-full h-full object-cover" />
                    : (authorName[0] || '؟')}
                </div>
                <div>
                  <div className="font-semibold text-gray-800 text-sm">{authorName}</div>
                  <div className="text-[11px] text-gray-400">كاتب المقال</div>
                </div>
              </div>

              <div className="w-px h-8 bg-gray-200" />
              <div className="flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                {formatDate(article.publishedAt)}
              </div>
              <div className="flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/><path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                {article.readingTime} دقيقة قراءة
              </div>
              <div className="flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/></svg>
                {article.views?.toLocaleString()} مشاهدة
              </div>
            </div>

            {/* Tags */}
            {article.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-4">
                {article.tags.map(tag => (
                  <Link key={tag} to={`${ROUTES.ARTICLES}?tag=${tag}`}
                    className="text-[11px] font-medium px-3 py-1 rounded-full bg-gray-100 text-gray-600 hover:bg-violet-100 hover:text-violet-700 transition-colors">
                    #{tag}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Content Layout ────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex gap-8">

          {/* Sticky Share Bar (desktop) */}
          <div className="hidden xl:flex flex-none w-10 pt-4">
            <ShareBar title={article.titleAr || article.title} slug={slug} />
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div
              ref={contentRef}
              className="prose-article bg-white rounded-2xl shadow-sm p-8 md:p-10 mb-8"
              style={{ border: '1px solid rgba(0,0,0,0.06)' }}
              dir="rtl"
              dangerouslySetInnerHTML={{ __html: processedContent }}
            />

            {/* Like + Bookmark + Share row */}
            <div className="flex items-center justify-between gap-4 bg-white rounded-2xl p-5 mb-8 shadow-sm"
              style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
              <div className="flex items-center gap-3">
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={handleLike}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    liked ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-rose-50 hover:text-rose-600'
                  }`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'}>
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  {localLikes} إعجاب
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={handleBookmark}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    bookmarked ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-amber-50 hover:text-amber-600'
                  }`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill={bookmarked ? 'currentColor' : 'none'}>
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                  </svg>
                  {bookmarked ? 'محفوظ' : 'حفظ'}
                </motion.button>
              </div>

              {/* Mobile share */}
              <div className="flex items-center gap-2 xl:hidden">
                <button onClick={() => navigator.clipboard.writeText(window.location.href).then(() => toast.success('تم نسخ الرابط'))}
                  className="px-4 py-2.5 rounded-xl bg-violet-50 text-violet-600 border border-violet-200 text-sm font-bold hover:bg-violet-100 transition-colors flex items-center gap-2">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  مشاركة
                </button>
              </div>
            </div>

            {/* Author Card */}
            <div className="bg-white rounded-2xl p-6 mb-8 shadow-sm flex gap-5 items-start"
              style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
              <div className="w-16 h-16 rounded-2xl overflow-hidden flex-none bg-violet-100 flex items-center justify-center text-2xl font-bold text-violet-700">
                {article.author?.avatar
                  ? <img src={getFileUrl(article.author.avatar)} alt="" className="w-full h-full object-cover" />
                  : (authorName[0] || '؟')}
              </div>
              <div dir="rtl">
                <div className="font-heading font-bold text-lg text-gray-900">{authorName}</div>
                <div className="text-xs text-violet-600 font-semibold mb-2">معلم في ترتيلة أونلاين</div>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {article.author?.bio || 'معلم متخصص في تعليم القرآن الكريم والتجويد.'}
                </p>
              </div>
            </div>

            {/* Prev / Next */}
            {(prevArticle || nextArticle) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {prevArticle && (
                  <Link to={`/articles/${prevArticle.slug}`}
                    className="group flex items-center gap-4 p-5 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all"
                    style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-gray-400 group-hover:text-violet-600 transition-colors flex-none">
                      <path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <div dir="rtl" className="min-w-0">
                      <div className="text-[11px] text-gray-400 font-semibold mb-1">المقال السابق</div>
                      <div className="text-sm font-semibold text-gray-800 line-clamp-1 group-hover:text-violet-700 transition-colors">
                        {prevArticle.titleAr || prevArticle.title}
                      </div>
                    </div>
                  </Link>
                )}
                {nextArticle && (
                  <Link to={`/articles/${nextArticle.slug}`}
                    className="group flex items-center gap-4 p-5 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all justify-end"
                    style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
                    <div dir="rtl" className="min-w-0 text-end">
                      <div className="text-[11px] text-gray-400 font-semibold mb-1">المقال التالي</div>
                      <div className="text-sm font-semibold text-gray-800 line-clamp-1 group-hover:text-violet-700 transition-colors">
                        {nextArticle.titleAr || nextArticle.title}
                      </div>
                    </div>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-gray-400 group-hover:text-violet-600 transition-colors flex-none">
                      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </Link>
                )}
              </div>
            )}

            {/* Related Articles */}
            {related.length > 0 && (
              <div className="mb-8">
                <h3 className="font-heading font-bold text-xl text-gray-900 mb-4">مقالات ذات صلة</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {related.map(a => <RelatedCard key={a._id} article={a} />)}
                </div>
              </div>
            )}

            {/* Newsletter */}
            <div className="rounded-2xl p-8 text-center" style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}>
              <Mail size={44} strokeWidth={1.3} color="rgba(255,255,255,0.7)" className="mb-3 mx-auto" />
              <h3 className="font-heading font-bold text-2xl text-white mb-2">اشترك في نشرتنا البريدية</h3>
              <p className="text-violet-200 text-sm mb-6">احصل على أحدث المقالات مباشرة في بريدك</p>
              <div className="flex gap-2 max-w-sm mx-auto">
                <input type="email" placeholder="بريدك الإلكتروني" dir="rtl"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white/20 border border-white/30 text-white placeholder-white/60 text-sm focus:outline-none" />
                <button className="px-5 py-2.5 rounded-xl bg-amber-400 text-gray-900 font-bold text-sm hover:bg-amber-300 transition-colors whitespace-nowrap">
                  اشترك
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar: TOC (desktop) */}
          {headings.length > 0 && (
            <div className="hidden lg:block w-64 flex-none">
              <TableOfContents headings={headings} activeId={activeHeadingId} />
            </div>
          )}
        </div>
      </div>

      {/* Article content styles */}
      <style>{`
        .prose-article { font-family: 'Tajawal', sans-serif; color: #374151; line-height: 1.9; font-size: 17px; }
        .prose-article h2 { font-family: 'Cairo', sans-serif; font-size: 1.6rem; font-weight: 800; color: #111827; margin: 2.2rem 0 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid #f3f4f6; }
        .prose-article h3 { font-family: 'Cairo', sans-serif; font-size: 1.25rem; font-weight: 700; color: #1f2937; margin: 1.8rem 0 0.8rem; }
        .prose-article p { margin-bottom: 1.4rem; }
        .prose-article a { color: #7c3aed; text-decoration: underline; }
        .prose-article ul, .prose-article ol { padding-right: 1.5rem; margin-bottom: 1.4rem; }
        .prose-article li { margin-bottom: 0.5rem; }
        .prose-article blockquote { border-right: 4px solid #7c3aed; background: #faf5ff; padding: 1rem 1.5rem; margin: 1.5rem 0; border-radius: 0 12px 12px 0; color: #5b21b6; font-style: italic; }
        .prose-article code { background: #f3f4f6; padding: 0.15rem 0.5rem; border-radius: 6px; font-size: 0.85em; color: #7c3aed; }
        .prose-article pre { background: #1e1b4b; padding: 1.5rem; border-radius: 12px; overflow-x: auto; margin: 1.5rem 0; }
        .prose-article pre code { background: none; color: #c4b5fd; padding: 0; }
        .prose-article img { border-radius: 12px; max-width: 100%; margin: 1.5rem 0; }
        .prose-article table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; }
        .prose-article th, .prose-article td { padding: 0.75rem 1rem; border: 1px solid #e5e7eb; text-align: right; }
        .prose-article th { background: #f9fafb; font-weight: 700; }
        .prose-article hr { border: none; border-top: 2px solid #f3f4f6; margin: 2rem 0; }
        .prose-article .callout { background: #f0fdf4; border-right: 4px solid #22c55e; padding: 1rem 1.5rem; border-radius: 0 12px 12px 0; margin: 1.5rem 0; }
        .prose-article .callout-warning { background: #fffbeb; border-right-color: #f59e0b; }
        .prose-article .callout-info { background: #eff6ff; border-right-color: #3b82f6; }
      `}</style>
    </div>
  )
}
