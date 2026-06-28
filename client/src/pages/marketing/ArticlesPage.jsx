import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Star, Mail, Inbox, Library } from 'lucide-react'
import api from '../../utils/api.js'
import { getFileUrl, ROUTES } from '../../config/constants.js'

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })
}

function readingLabel(n) {
  return `${n} دقيقة قراءة`
}

function ArticleCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse">
      <div className="h-48 bg-gray-200" />
      <div className="p-5 space-y-3">
        <div className="h-3 bg-gray-200 rounded w-1/3" />
        <div className="h-5 bg-gray-200 rounded w-4/5" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="flex gap-3 pt-2">
          <div className="h-8 w-8 bg-gray-200 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-gray-200 rounded w-1/3" />
            <div className="h-3 bg-gray-200 rounded w-1/4" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Article Card ───────────────────────────────────────────────────────────────

function ArticleCard({ article, featured = false }) {
  const authorName = article.author
    ? `${article.author.firstNameAr || article.author.firstName || ''} ${article.author.lastNameAr || article.author.lastName || ''}`.trim()
    : 'ترتيلة'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col ${featured ? 'lg:flex-row' : ''}`}
      style={{ border: '1px solid rgba(0,0,0,0.06)' }}
    >
      {/* Cover */}
      <Link
        to={`/articles/${article.slug}`}
        className={`block overflow-hidden flex-none ${featured ? 'lg:w-2/5 h-56 lg:h-auto' : 'h-52'}`}
      >
        {article.coverImage ? (
          <img
            src={getFileUrl(article.coverImage)}
            alt={article.titleAr || article.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #f3f0ff, #ede9fe)' }}>
            <BookOpen size={40} strokeWidth={1.3} color="#a78bfa" />
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="flex-1 flex flex-col p-5 lg:p-6">
        {/* Category + Reading time */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {article.category && (
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full"
              style={{ background: `${article.category.color}18`, color: article.category.color }}>
              {article.category.icon} {article.category.nameAr || article.category.name}
            </span>
          )}
          {article.featured && (
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-600">
              <Star size={11} strokeWidth={0} fill="#d97706" className="inline-block" /> مميز
            </span>
          )}
          <span className="text-[11px] text-gray-400 mr-auto">
            {readingLabel(article.readingTime)}
          </span>
        </div>

        {/* Title */}
        <Link to={`/articles/${article.slug}`} className="group/title">
          <h3 className={`font-heading font-bold text-gray-900 leading-snug mb-2 group-hover/title:text-violet-700 transition-colors line-clamp-2 ${featured ? 'text-2xl' : 'text-lg'}`}
            dir="rtl">
            {article.titleAr || article.title}
          </h3>
        </Link>

        {/* Excerpt */}
        {article.excerptAr || article.excerpt ? (
          <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-4 flex-1" dir="rtl">
            {article.excerptAr || article.excerpt}
          </p>
        ) : <div className="flex-1" />}

        {/* Footer */}
        <div className="flex items-center gap-3 pt-3 border-t border-gray-50">
          {/* Author */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-full overflow-hidden flex-none bg-violet-100 flex items-center justify-center text-sm font-bold text-violet-700">
              {article.author?.avatar
                ? <img src={getFileUrl(article.author.avatar)} alt="" className="w-full h-full object-cover" />
                : (authorName[0] || '؟')}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-gray-800 truncate">{authorName}</div>
              <div className="text-[10px] text-gray-400">{formatDate(article.publishedAt)}</div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 text-[11px] text-gray-400 flex-none">
            <span className="flex items-center gap-1">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/></svg>
              {article.views?.toLocaleString() || 0}
            </span>
            <span className="flex items-center gap-1">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth="1.8"/></svg>
              {article.likes?.toLocaleString() || 0}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ── Newsletter CTA ─────────────────────────────────────────────────────────────

function NewsletterCTA() {
  return (
    <div className="rounded-2xl p-8 text-center" style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}>
      <Mail size={44} strokeWidth={1.3} color="rgba(255,255,255,0.7)" className="mb-3 mx-auto" />
      <h3 className="font-heading font-bold text-2xl text-white mb-2">اشترك في نشرتنا البريدية</h3>
      <p className="text-violet-200 text-sm mb-6">احصل على أحدث المقالات والنصائح في تعليم القرآن الكريم مباشرة في بريدك</p>
      <div className="flex gap-2 max-w-sm mx-auto">
        <input
          type="email"
          placeholder="بريدك الإلكتروني"
          dir="rtl"
          className="flex-1 px-4 py-2.5 rounded-xl bg-white/20 border border-white/30 text-white placeholder-white/60 text-sm focus:outline-none focus:bg-white/30"
        />
        <button className="px-5 py-2.5 rounded-xl bg-amber-400 text-gray-900 font-bold text-sm hover:bg-amber-300 transition-colors whitespace-nowrap">
          اشترك
        </button>
      </div>
      <p className="text-violet-300 text-[11px] mt-3">لا رسائل مزعجة — يمكنك إلغاء الاشتراك في أي وقت</p>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function ArticlesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '')
  const [activeCategory, setActiveCategory] = useState(searchParams.get('category') || '')
  const [activeSort, setActiveSort] = useState(searchParams.get('sort') || 'latest')
  const [page, setPage] = useState(1)
  const searchRef = useRef(null)

  const isSearchMode = !!searchParams.get('q')

  // Articles query
  const articlesQuery = useQuery({
    queryKey: ['articles', { category: activeCategory, sort: activeSort, page, q: searchParams.get('q') }],
    queryFn: () => {
      const q = searchParams.get('q')
      if (q) {
        return api.get('/articles/search', { params: { q, page, limit: 12 } }).then(r => r.data)
      }
      return api.get('/articles', {
        params: { category: activeCategory || undefined, sort: activeSort, page, limit: 12 }
      }).then(r => r.data)
    },
    keepPreviousData: true,
  })

  // Featured articles (only when not searching)
  const featuredQuery = useQuery({
    queryKey: ['articles', 'featured'],
    queryFn: () => api.get('/articles/featured').then(r => r.data),
    enabled: !isSearchMode && page === 1,
  })

  // Categories
  const categoriesData = articlesQuery.data?.data?.categories || []
  const articles = articlesQuery.data?.data?.articles || []
  const total = articlesQuery.data?.total || 0
  const totalPages = articlesQuery.data?.totalPages || 1
  const featured = featuredQuery.data?.data || []

  function handleSearch(e) {
    e.preventDefault()
    const q = searchInput.trim()
    if (q) {
      setSearchParams({ q })
    } else {
      setSearchParams({})
    }
    setPage(1)
  }

  function handleCategoryChange(cat) {
    setActiveCategory(cat)
    setPage(1)
    setSearchParams(cat ? { category: cat } : {})
  }

  function handleSortChange(s) {
    setActiveSort(s)
    setPage(1)
  }

  function clearSearch() {
    setSearchInput('')
    setSearchParams({})
    setPage(1)
  }

  const SORT_OPTIONS = [
    { value: 'latest',  label: 'الأحدث' },
    { value: 'popular', label: 'الأكثر مشاهدة' },
    { value: 'liked',   label: 'الأكثر إعجاباً' },
  ]

  return (
    <div className="min-h-screen" dir="rtl" style={{ background: '#F8F7FF' }}>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div style={{ background: 'linear-gradient(160deg, #0f0226 0%, #1d0a3f 50%, #150232 100%)' }}>
        <div className="max-w-5xl mx-auto px-4 py-20 text-center">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-6"
              style={{ background: 'rgba(124,58,237,0.25)', color: '#c4b5fd', border: '1px solid rgba(124,58,237,0.4)' }}>
              <Library size={13} strokeWidth={2} /> مركز المعرفة
            </div>
            <h1 className="font-heading font-extrabold text-4xl md:text-6xl text-white mb-4 leading-tight">
              مقالات ترتيلة
            </h1>
            <p className="text-violet-300 text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
              مقالات متخصصة في تعليم القرآن الكريم والتجويد والمنهجية، بقلم نخبة من المعلمين والمتخصصين
            </p>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
              <div className="flex items-center gap-2 bg-white rounded-2xl shadow-2xl px-4 py-2"
                style={{ border: '1px solid rgba(124,58,237,0.2)' }}>
                <button type="submit" className="text-violet-500 hover:text-violet-700 transition-colors flex-none p-1">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
                    <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
                <input
                  ref={searchRef}
                  type="text"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  placeholder="ابحث في المقالات... (التجويد، الحفظ، التلاوة)"
                  className="flex-1 py-2.5 text-gray-800 text-base bg-transparent outline-none placeholder-gray-400"
                  dir="rtl"
                />
                {searchInput && (
                  <button type="button" onClick={clearSearch} className="text-gray-400 hover:text-gray-600 transition-colors flex-none p-1">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                )}
              </div>
            </form>

            {/* Stats */}
            <div className="flex items-center justify-center gap-8 mt-10 text-sm text-violet-300">
              <span>{total} مقال</span>
              <span className="w-1 h-1 rounded-full bg-violet-500" />
              <span>{categoriesData.length} فئة</span>
              <span className="w-1 h-1 rounded-full bg-violet-500" />
              <span>تحديث مستمر</span>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">

        {/* ── Featured Article ────────────────────────────────────────────── */}
        {!isSearchMode && page === 1 && featured.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
            <div className="flex items-center gap-3 mb-5">
              <h2 className="font-heading font-bold text-2xl text-gray-900">المقال المميز</h2>
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-600 flex items-center gap-1"><Star size={11} strokeWidth={0} fill="#d97706" /> مميز</span>
            </div>
            <ArticleCard article={featured[0]} featured />
          </motion.div>
        )}

        {/* ── Categories ─────────────────────────────────────────────────── */}
        {!isSearchMode && (
          <div className="mb-8">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <button
                onClick={() => handleCategoryChange('')}
                className={`flex-none px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                  !activeCategory ? 'bg-violet-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                الكل
              </button>
              {categoriesData.map(cat => (
                <button
                  key={cat._id}
                  onClick={() => handleCategoryChange(cat._id)}
                  className={`flex-none px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                    activeCategory === cat._id ? 'text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                  }`}
                  style={activeCategory === cat._id ? { background: cat.color } : {}}
                >
                  {cat.icon} {cat.nameAr || cat.name}
                  {cat.articlesCount > 0 && (
                    <span className={`mr-1.5 text-[11px] ${activeCategory === cat._id ? 'text-white/80' : 'text-gray-400'}`}>
                      ({cat.articlesCount})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Controls ───────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="text-sm text-gray-500">
            {isSearchMode ? (
              <span>نتائج البحث عن: <span className="font-semibold text-gray-900">«{searchParams.get('q')}»</span> ({total} نتيجة)</span>
            ) : (
              <span>{total} مقال</span>
            )}
          </div>
          {!isSearchMode && (
            <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-200 p-1">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleSortChange(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeSort === opt.value ? 'bg-violet-600 text-white' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Grid ───────────────────────────────────────────────────────── */}
        {articlesQuery.isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => <ArticleCardSkeleton key={i} />)}
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-20">
            <Inbox size={60} strokeWidth={1.2} color="#d1d5db" className="mb-4 mx-auto" />
            <h3 className="font-heading font-bold text-xl text-gray-700 mb-2">
              {isSearchMode ? 'لا توجد نتائج' : 'لا توجد مقالات بعد'}
            </h3>
            <p className="text-gray-500 text-sm mb-6">
              {isSearchMode ? 'جرب كلمات بحث مختلفة' : 'كن أول من يقرأ مقالاتنا القادمة'}
            </p>
            {isSearchMode && (
              <button onClick={clearSearch} className="px-5 py-2.5 rounded-xl bg-violet-600 text-white font-semibold text-sm hover:bg-violet-700 transition-colors">
                عرض كل المقالات
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {articles.map((a, i) => (
                  <motion.div
                    key={a._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <ArticleCard article={a} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-all"
                >
                  السابق
                </button>
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  const p = i + Math.max(1, page - 2)
                  if (p > totalPages) return null
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${
                        p === page ? 'bg-violet-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {p}
                    </button>
                  )
                })}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-all"
                >
                  التالي
                </button>
              </div>
            )}
          </>
        )}

        {/* ── Newsletter ──────────────────────────────────────────────────── */}
        <div className="mt-16">
          <NewsletterCTA />
        </div>

      </div>
    </div>
  )
}
