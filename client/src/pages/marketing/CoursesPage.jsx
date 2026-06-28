import { useState, useEffect, useRef, memo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Search, BookOpen, GraduationCap, Music, Eye, PenLine,
  BookMarked, Gem, Users, Clock3, PlayCircle, Star,
  Award, ChevronLeft, ChevronRight, ArrowLeft,
  LayoutGrid, SlidersHorizontal,
} from 'lucide-react'
import api from '../../utils/api.js'
import { getFileUrl, ROUTES } from '../../config/constants.js'

// ── Design tokens — premium light theme ──────────────────────────────────────

const T = {
  bg:           '#FFFFFF',
  bgSubtle:     '#FAFAFB',
  bgSection:    '#F5F5F7',
  border:       '#E4E4E8',
  borderStrong: '#C9C9D4',
  text:         '#111118',
  textSec:      '#4A4A6A',
  textMuted:    '#888899',
  purple:       '#7C3AED',
  purpleDark:   '#5B21B6',
  purpleLight:  '#F5F3FF',
  purpleMid:    '#EDE9FD',
  gold:         '#92650A',
  goldLight:    '#FEF9EC',
  goldBorder:   '#D4AF37',
  green:        '#059669',
  greenLight:   '#ECFDF5',
  greenBorder:  '#A7F3D0',
}

// ── Category config ───────────────────────────────────────────────────────────

const CATEGORIES = [
  { key: 'all',     label: 'جميع الدورات',  Icon: LayoutGrid },
  { key: 'tajweed', label: 'التجويد',        Icon: Music      },
  { key: 'hifz',    label: 'الحفظ',          Icon: BookMarked },
  { key: 'nazra',   label: 'النظر',          Icon: Eye        },
  { key: 'arabic',  label: 'اللغة العربية',  Icon: PenLine    },
  { key: 'quran',   label: 'القرآن الكريم',  Icon: BookOpen   },
  { key: 'other',   label: 'أخرى',           Icon: Gem        },
]

const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map(c => [c.key, c]))

const DIFFICULTY_OPTIONS = [
  { value: 'all',          label: 'جميع المستويات', color: T.textSec,  bg: T.bgSection,    border: T.border      },
  { value: 'beginner',     label: 'مبتدئ',          color: '#059669',  bg: '#ECFDF5',      border: '#A7F3D0'     },
  { value: 'intermediate', label: 'متوسط',          color: '#7C3AED',  bg: '#F5F3FF',      border: '#C4B5FD'     },
  { value: 'advanced',     label: 'متقدم',          color: '#92650A',  bg: '#FEF9EC',      border: '#FDE68A'     },
]

const DIFF_MAP = Object.fromEntries(
  DIFFICULTY_OPTIONS.filter(d => d.value !== 'all').map(d => [d.value, d])
)

// ── Helpers ───────────────────────────────────────────────────────────────────

function getPaginationRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const delta = 2
  const range = []
  for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
    range.push(i)
  }
  if (current - delta > 2)       range.unshift('…')
  if (current + delta < total - 1) range.push('…')
  range.unshift(1)
  range.push(total)
  return range
}

function useDebounce(value, delay = 300) {
  const [d, setD] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return d
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      className="rounded-2xl overflow-hidden bg-white"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)' }}
    >
      <div className="h-48 animate-pulse" style={{ background: T.bgSection }} />
      <div className="p-5 space-y-3">
        <div className="h-2.5 w-1/4 rounded-full animate-pulse" style={{ background: T.bgSection }} />
        <div className="h-4 w-4/5 rounded-full animate-pulse" style={{ background: T.bgSection }} />
        <div className="h-3 w-3/4 rounded-full animate-pulse" style={{ background: T.bgSection }} />
        <div className="h-3 w-1/2 rounded-full animate-pulse" style={{ background: T.bgSection }} />
        <div className="h-10 w-full rounded-xl mt-2 animate-pulse" style={{ background: T.bgSection }} />
      </div>
    </div>
  )
}

// ── Course Card ───────────────────────────────────────────────────────────────

const CourseCard = memo(function CourseCard({ course }) {
  const diff    = DIFF_MAP[course.difficulty]
  const cat     = CATEGORY_MAP[course.category] || CATEGORY_MAP.other
  const slug    = course.slug || course._id
  const thumb   = getFileUrl(course.thumbnailImage)
  const CatIcon = cat.Icon

  return (
    <article
      className="group flex flex-col h-full bg-white rounded-2xl overflow-hidden"
      style={{
        boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
        transition: 'box-shadow 0.25s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.09), 0 32px 48px rgba(0,0,0,0.05)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)' }}
    >
      {/* ── Thumbnail ── */}
      <Link
        to={ROUTES.COURSE_DETAIL.replace(':slug', slug)}
        className="relative block overflow-hidden flex-none"
        style={{ height: '196px' }}
        tabIndex="-1"
        aria-hidden="true"
      >
        {thumb ? (
          <img
            src={thumb}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: T.bgSection }}
          >
            <CatIcon size={36} strokeWidth={1.2} color={T.borderStrong} />
          </div>
        )}

        {/* Difficulty badge */}
        {diff && (
          <div className="absolute top-3 right-3">
            <span
              className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
              style={{ color: diff.color, background: diff.bg, border: `1px solid ${diff.border}` }}
            >
              {diff.label}
            </span>
          </div>
        )}

        {/* Featured badge */}
        {course.featured && (
          <div className="absolute top-3 left-3">
            <span
              className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full"
              style={{ background: T.goldLight, color: T.gold, border: `1px solid rgba(212,175,55,0.3)` }}
            >
              <Star size={9} fill={T.gold} strokeWidth={0} />
              مميز
            </span>
          </div>
        )}

        {/* Certificate badge */}
        {course.certificateAvailable && (
          <div className="absolute bottom-3 left-3">
            <span
              className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full"
              style={{ background: T.greenLight, color: T.green, border: `1px solid ${T.greenBorder}` }}
            >
              <Award size={9} strokeWidth={2} />
              شهادة
            </span>
          </div>
        )}
      </Link>

      {/* ── Body ── */}
      <div className="flex flex-col flex-1 p-5">

        {/* Category */}
        <div className="flex items-center gap-1.5 mb-2">
          <CatIcon size={11} strokeWidth={2} color={T.textMuted} />
          <span className="text-[11px] font-medium" style={{ color: T.textMuted }}>{cat.label}</span>
        </div>

        {/* Title */}
        <Link
          to={ROUTES.COURSE_DETAIL.replace(':slug', slug)}
          className="block mb-2"
        >
          <h3
            className="font-heading font-bold text-[15px] leading-snug line-clamp-2 transition-colors duration-200 group-hover:text-[#7C3AED]"
            style={{ color: T.text, minHeight: '2.4em' }}
          >
            {course.nameAr}
          </h3>
        </Link>

        {/* Description */}
        {course.shortDescriptionAr && (
          <p
            className="text-[12.5px] leading-relaxed line-clamp-2 mb-3 flex-1"
            style={{ color: T.textSec }}
          >
            {course.shortDescriptionAr}
          </p>
        )}

        {/* Meta */}
        <div className="flex items-center gap-3 mb-4 mt-auto flex-wrap">
          {(course.studentsCount > 0 || course.enrollmentCount > 0) && (
            <span className="flex items-center gap-1 text-[11px]" style={{ color: T.textMuted }}>
              <Users size={11} strokeWidth={2} />
              {(course.studentsCount || course.enrollmentCount || 0).toLocaleString('ar')}
            </span>
          )}
          {course.lessonsCount > 0 && (
            <span className="flex items-center gap-1 text-[11px]" style={{ color: T.textMuted }}>
              <PlayCircle size={11} strokeWidth={2} />
              {course.lessonsCount} درس
            </span>
          )}
          {course.estimatedDuration > 0 && (
            <span className="flex items-center gap-1 text-[11px]" style={{ color: T.textMuted }}>
              <Clock3 size={11} strokeWidth={2} />
              {course.estimatedDuration} س
            </span>
          )}
        </div>

        {/* Instructor */}
        {course.instructor && (
          <div
            className="flex items-center gap-2 mb-4 pb-4"
            style={{ borderBottom: `1px solid ${T.border}` }}
          >
            {course.instructor.avatar ? (
              <img
                src={getFileUrl(course.instructor.avatar)}
                alt=""
                className="w-6 h-6 rounded-full object-cover"
                style={{ border: `1px solid ${T.border}` }}
              />
            ) : (
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-none"
                style={{ background: T.purpleMid, color: T.purple }}
              >
                {(course.instructor.firstNameAr || course.instructor.firstName || '?')[0]}
              </div>
            )}
            <span className="text-[11px] font-medium truncate" style={{ color: T.textSec }}>
              {course.instructor.firstNameAr || course.instructor.firstName}{' '}
              {course.instructor.lastNameAr   || course.instructor.lastName}
            </span>
          </div>
        )}

        {/* CTA */}
        <Link
          to={ROUTES.COURSE_DETAIL.replace(':slug', slug)}
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold"
          style={{
            background: T.purpleLight,
            color: T.purple,
            border: `1px solid ${T.purpleMid}`,
            transition: 'background 0.18s, color 0.18s, border-color 0.18s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = T.purple
            e.currentTarget.style.color = '#fff'
            e.currentTarget.style.borderColor = T.purple
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = T.purpleLight
            e.currentTarget.style.color = T.purple
            e.currentTarget.style.borderColor = T.purpleMid
          }}
        >
          استعرض الدورة
          <ArrowLeft size={13} strokeWidth={2.5} style={{ transform: 'rotate(180deg)' }} />
        </Link>
      </div>
    </article>
  )
})

// ── Featured Spotlight ────────────────────────────────────────────────────────

function FeaturedSpotlight({ course }) {
  const slug = course.slug || course._id
  const cat  = CATEGORY_MAP[course.category] || CATEGORY_MAP.other

  return (
    <div
      className="relative mb-10 overflow-hidden rounded-2xl"
      style={{
        background: T.purpleLight,
        border: `1px solid ${T.purpleMid}`,
      }}
    >
      <div className="p-7 md:p-9 flex flex-col md:flex-row items-start md:items-center gap-8">
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-2 mb-3">
            <span
              className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full"
              style={{ background: T.goldLight, color: T.gold, border: `1px solid rgba(212,175,55,0.3)` }}
            >
              <Star size={9} fill={T.gold} strokeWidth={0} />
              دورة مميزة
            </span>
            <span className="text-[11px] font-medium" style={{ color: T.textMuted }}>
              {cat.label}
            </span>
          </div>

          <h2
            className="font-heading font-bold text-xl md:text-2xl mb-2.5 leading-snug"
            style={{ color: T.text }}
          >
            {course.nameAr}
          </h2>

          {course.shortDescriptionAr && (
            <p
              className="text-sm leading-relaxed mb-5"
              style={{ color: T.textSec, maxWidth: '520px' }}
            >
              {course.shortDescriptionAr}
            </p>
          )}

          <div className="flex items-center flex-wrap gap-5 mb-6">
            {course.lessonsCount > 0 && (
              <span className="flex items-center gap-1.5 text-[12px]" style={{ color: T.textMuted }}>
                <PlayCircle size={13} strokeWidth={1.8} />
                {course.lessonsCount} درس
              </span>
            )}
            {course.estimatedDuration > 0 && (
              <span className="flex items-center gap-1.5 text-[12px]" style={{ color: T.textMuted }}>
                <Clock3 size={13} strokeWidth={1.8} />
                {course.estimatedDuration} ساعة
              </span>
            )}
            {course.studentsCount > 0 && (
              <span className="flex items-center gap-1.5 text-[12px]" style={{ color: T.textMuted }}>
                <Users size={13} strokeWidth={1.8} />
                {course.studentsCount.toLocaleString('ar')} طالب
              </span>
            )}
          </div>

          <Link
            to={ROUTES.COURSE_DETAIL.replace(':slug', slug)}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold"
            style={{
              background: T.purple,
              color: '#fff',
              transition: 'background 0.18s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = T.purpleDark }}
            onMouseLeave={e => { e.currentTarget.style.background = T.purple }}
          >
            استعرض الدورة
            <ArrowLeft size={13} strokeWidth={2.5} style={{ transform: 'rotate(180deg)' }} />
          </Link>
        </div>

        {course.thumbnailImage && (
          <div
            className="hidden md:block flex-none w-52 h-36 lg:w-64 lg:h-44 rounded-xl overflow-hidden"
            style={{ border: `1px solid ${T.border}` }}
          >
            <img
              src={getFileUrl(course.thumbnailImage)}
              alt={course.nameAr}
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyState({ onReset }) {
  return (
    <div className="text-center py-24">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
        style={{ background: T.bgSection, border: `1px solid ${T.border}` }}
      >
        <Search size={24} strokeWidth={1.5} color={T.textMuted} />
      </div>
      <h3 className="font-heading font-bold text-xl mb-2" style={{ color: T.text }}>
        لا توجد دورات
      </h3>
      <p className="text-sm mb-7" style={{ color: T.textMuted }}>
        جرّب تعديل معايير البحث أو الفلاتر
      </p>
      <button
        onClick={onReset}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
        style={{
          background: T.bgSection,
          color: T.textSec,
          border: `1px solid ${T.border}`,
          transition: 'border-color 0.18s, color 0.18s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = T.purple; e.currentTarget.style.color = T.purple }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textSec }}
      >
        <SlidersHorizontal size={14} strokeWidth={2} />
        إعادة تعيين الفلاتر
      </button>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CoursesPage() {
  const [search,        setSearch]        = useState('')
  const [category,      setCategory]      = useState('all')
  const [difficulty,    setDifficulty]    = useState('all')
  const [page,          setPage]          = useState(1)
  const [searchFocused, setSearchFocused] = useState(false)
  const searchRef                         = useRef(null)
  const debouncedSearch                   = useDebounce(search)

  const { data, isLoading } = useQuery({
    queryKey: ['public', 'courses', { search: debouncedSearch, category, difficulty, page }],
    queryFn: () =>
      api.get('/courses', {
        params: {
          search:     debouncedSearch || undefined,
          category:   category   !== 'all' ? category   : undefined,
          difficulty: difficulty !== 'all' ? difficulty : undefined,
          page,
          limit: 12,
        },
      }).then(r => r.data),
  })

  const { data: featured } = useQuery({
    queryKey: ['public', 'courses', 'featured'],
    queryFn: () => api.get('/courses/featured').then(r => r.data.data),
    staleTime: 300_000,
  })

  const { data: metaData } = useQuery({
    queryKey: ['public', 'courses-meta'],
    queryFn: () => api.get('/courses', { params: { limit: 1 } }).then(r => r.data),
    staleTime: 300_000,
  })

  const courses      = data?.data       || []
  const total        = data?.total      || 0
  const totalPages   = data?.totalPages || 1
  const totalCourses = metaData?.total  || 0

  const showSpotlight =
    !debouncedSearch && category === 'all' && difficulty === 'all' && page === 1
    && featured && featured.length > 0

  const handleReset = useCallback(() => {
    setSearch('')
    setCategory('all')
    setDifficulty('all')
    setPage(1)
  }, [])

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }) }, [page])
  useEffect(() => { setPage(1) }, [debouncedSearch, category, difficulty])

  return (
    <div dir="rtl" className="min-h-screen" style={{ background: T.bgSubtle }}>

      {/* ══════════════════════════════════════════════════════
          HERO — premium dark surface, seamless transition
      ══════════════════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden"
        style={{
          paddingTop:    'clamp(96px, 10vw, 120px)',
          paddingBottom: 'clamp(56px, 6vw, 80px)',
          background: `linear-gradient(180deg,
            #0D0622  0%,
            #1A0C35  8%,
            #24123D 17%,
            #3B1A5E 28%,
            #4E2A7A 40%,
            #6444A0 55%,
            #8B65C0 68%,
            #C0AAE8 80%,
            #E8E3FA 91%,
            #FFFFFF 100%
          )`,
        }}
      >

        {/* ── Ambient cinematic glow layers ── */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          {/* Primary glow — top-right, slow float */}
          <motion.div
            animate={{ x: [0, 28, 0], y: [0, -16, 0] }}
            transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute', top: -80, right: -40,
              width: 560, height: 560, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(124,58,237,0.28) 0%, transparent 68%)',
              filter: 'blur(72px)',
            }}
          />
          {/* Secondary glow — left side */}
          <motion.div
            animate={{ x: [0, -18, 0], y: [0, 22, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut', delay: 5 }}
            style={{
              position: 'absolute', top: '15%', left: -80,
              width: 500, height: 500, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(78,42,122,0.22) 0%, transparent 70%)',
              filter: 'blur(80px)',
            }}
          />
          {/* Center depth — static, creates mid-field luminosity */}
          <div
            style={{
              position: 'absolute', top: '32%', left: '50%', transform: 'translateX(-50%)',
              width: 720, height: 260,
              background: 'radial-gradient(ellipse, rgba(100,68,160,0.16) 0%, transparent 70%)',
              filter: 'blur(50px)',
            }}
          />
        </div>

        {/* ── Hero content ── */}
        <div className="relative z-10 max-w-2xl mx-auto px-6 text-center">

          {/* Eyebrow */}
          <p
            className="text-[11px] font-bold mb-4"
            style={{ color: 'rgba(220,210,247,0.88)', letterSpacing: '0.04em' }}
          >
            ✦ دورات قرآنية معتمدة ✦
          </p>

          {/* Heading */}
          <h1
            className="font-heading font-extrabold mb-3 leading-tight"
            style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', color: '#FFFFFF' }}
          >
            اكتشف الدورة المناسبة لك
          </h1>

          {/* Subheading */}
          <p
            className="text-[15px] mb-7 max-w-md mx-auto leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.70)' }}
          >
            تجويد، حفظ، قراءة — لكل مستوى وفئة عمرية.
          </p>

          {/* Search — glassmorphism floating card */}
          <div
            className="relative max-w-lg mx-auto rounded-2xl"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            style={{
              background:          'rgba(255,255,255,0.92)',
              backdropFilter:      'blur(24px)',
              WebkitBackdropFilter:'blur(24px)',
              border: searchFocused
                ? '1px solid rgba(124,58,237,0.42)'
                : '1px solid rgba(255,255,255,0.55)',
              boxShadow: searchFocused
                ? '0 16px 56px rgba(0,0,0,0.32), 0 0 0 3px rgba(124,58,237,0.14)'
                : '0 10px 44px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.7)',
              transition: 'border-color 0.22s ease, box-shadow 0.22s ease',
            }}
          >
            <Search
              size={16}
              strokeWidth={2}
              color={T.textMuted}
              className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
            />
            <input
              ref={searchRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ابحث عن دورة، مستوى، أو مهارة..."
              aria-label="البحث في الدورات"
              className="w-full py-3.5 pr-11 pl-10 text-[14px] outline-none rounded-2xl"
              style={{ background: 'transparent', border: 'none', color: T.text }}
            />
            {search && (
              <button
                onClick={() => { setSearch(''); searchRef.current?.focus() }}
                aria-label="مسح البحث"
                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center text-[11px]"
                style={{
                  background: T.bgSection,
                  color: T.textMuted,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = T.border }}
                onMouseLeave={e => { e.currentTarget.style.background = T.bgSection }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Stat strip — glass pill so text stays readable over gradient */}
          {totalCourses > 0 && (
            <div
              className="inline-flex items-center justify-center gap-0 mt-7 rounded-full"
              style={{
                background:          'rgba(15,3,38,0.22)',
                backdropFilter:      'blur(12px)',
                WebkitBackdropFilter:'blur(12px)',
                border:              '1px solid rgba(255,255,255,0.14)',
                padding:             '10px 28px',
              }}
            >
              <div className="text-center px-5">
                <div className="text-[17px] font-bold font-heading" style={{ color: '#FFFFFF' }}>{totalCourses}</div>
                <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.58)' }}>دورة</div>
              </div>
              <div className="w-px h-7" style={{ background: 'rgba(255,255,255,0.18)' }} />
              <div className="text-center px-5">
                <div className="text-[17px] font-bold font-heading" style={{ color: '#FFFFFF' }}>٢٠+</div>
                <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.58)' }}>معلم متخصص</div>
              </div>
              <div className="w-px h-7" style={{ background: 'rgba(255,255,255,0.18)' }} />
              <div className="text-center px-5">
                <div className="text-[17px] font-bold font-heading" style={{ color: '#FFFFFF' }}>٦</div>
                <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.58)' }}>مسارات تعليمية</div>
              </div>
            </div>
          )}
        </div>

        {/* ── SVG wave — organic transition into content ── */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none" aria-hidden="true">
          <svg
            viewBox="0 0 1440 52"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ width: '100%', height: '52px', display: 'block' }}
          >
            {/* Soft lavender crest — creates depth behind the white wave */}
            <path
              d="M0,32 C200,14 400,50 600,30 C800,10 1000,46 1200,26 C1320,14 1400,32 1440,28 L1440,52 L0,52 Z"
              fill="rgba(220,210,247,0.35)"
            />
            {/* Main white fill — the actual organic boundary */}
            <path
              d="M0,38 C180,20 360,52 540,34 C720,16 900,50 1080,32 C1260,14 1380,38 1440,34 L1440,52 L0,52 Z"
              fill="#FFFFFF"
            />
          </svg>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          FILTER BAR — sticky, unified (category + difficulty)
      ══════════════════════════════════════════════════════ */}
      <div
        className="sticky z-30 bg-white"
        style={{ top: 'clamp(76px, calc(50px + 4vw), 90px)', borderBottom: `1px solid ${T.border}` }}
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between gap-3 py-2.5">

            {/* Category tabs */}
            <div className="flex items-center gap-0.5 overflow-x-auto flex-nowrap no-scrollbar">
              {CATEGORIES.map(({ key, label, Icon }) => {
                const active = category === key
                return (
                  <button
                    key={key}
                    onClick={() => setCategory(key)}
                    aria-pressed={active}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium whitespace-nowrap flex-none transition-colors duration-150"
                    style={{
                      background: active ? T.purpleLight : 'transparent',
                      color:      active ? T.purple : T.textSec,
                      border:     active ? `1px solid ${T.purpleMid}` : '1px solid transparent',
                    }}
                  >
                    <Icon size={13} strokeWidth={active ? 2.2 : 1.8} />
                    {label}
                  </button>
                )
              })}
            </div>

            {/* Right side: difficulty + count */}
            <div className="flex items-center gap-1.5 flex-none">
              <div className="hidden sm:flex items-center gap-0.5">
                {DIFFICULTY_OPTIONS.map(opt => {
                  const active = difficulty === opt.value
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setDifficulty(opt.value)}
                      aria-pressed={active}
                      className="px-3 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap transition-colors duration-150"
                      style={{
                        background: active ? opt.bg : 'transparent',
                        color:      active ? opt.color : T.textMuted,
                        border:     active ? `1px solid ${opt.border}` : '1px solid transparent',
                      }}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>

              {!isLoading && total > 0 && (
                <span
                  className="text-[12px] font-medium pr-2 mr-1"
                  style={{ color: T.textMuted, borderRight: `1px solid ${T.border}` }}
                >
                  {total} دورة
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          MAIN CONTENT
      ══════════════════════════════════════════════════════ */}
      <section className="max-w-6xl mx-auto px-6 py-8">

        {/* Difficulty filter — mobile only */}
        <div className="sm:hidden flex items-center gap-1.5 mb-6 overflow-x-auto no-scrollbar">
          {DIFFICULTY_OPTIONS.map(opt => {
            const active = difficulty === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => setDifficulty(opt.value)}
                aria-pressed={active}
                className="px-3.5 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap flex-none transition-colors duration-150"
                style={{
                  background: active ? opt.bg : T.bgSection,
                  color:      active ? opt.color : T.textMuted,
                  border:     `1px solid ${active ? opt.border : T.border}`,
                }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>

        {/* Featured spotlight */}
        {showSpotlight && featured.slice(0, 1).map(fc => (
          <FeaturedSpotlight key={fc._id} course={fc} />
        ))}

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }, (_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : courses.length === 0 ? (
          <EmptyState onReset={handleReset} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {courses.map((course, i) => (
              <motion.div
                key={course._id}
                className="h-full"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: i * 0.028 }}
              >
                <CourseCard course={course} />
              </motion.div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-12">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30"
              style={{ background: T.bgSection, color: T.textSec, border: `1px solid ${T.border}` }}
            >
              <ChevronRight size={15} strokeWidth={2} />
            </button>

            {getPaginationRange(page, totalPages).map((p, idx) =>
              p === '…' ? (
                <span
                  key={`ellipsis-${idx}`}
                  className="w-9 h-9 flex items-center justify-center text-[13px]"
                  style={{ color: T.textMuted }}
                >
                  …
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className="w-9 h-9 rounded-lg text-[13px] font-semibold transition-colors"
                  style={{
                    background: p === page ? T.purple : T.bgSection,
                    color:      p === page ? '#fff'   : T.textSec,
                    border:     p === page ? 'none'   : `1px solid ${T.border}`,
                  }}
                >
                  {p}
                </button>
              )
            )}

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30"
              style={{ background: T.bgSection, color: T.textSec, border: `1px solid ${T.border}` }}
            >
              <ChevronLeft size={15} strokeWidth={2} />
            </button>
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════
          CTA — light, minimal
      ══════════════════════════════════════════════════════ */}
      <section className="px-6 pb-20 pt-4">
        <div
          className="max-w-xl mx-auto text-center rounded-2xl px-8 py-12"
          style={{ background: T.purpleLight, border: `1px solid ${T.purpleMid}` }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-5"
            style={{ background: T.purpleLight, border: `1px solid ${T.purpleMid}` }}
          >
            <GraduationCap size={24} strokeWidth={1.5} color={T.purple} />
          </div>

          <h2
            className="font-heading font-bold text-[1.25rem] mb-2"
            style={{ color: T.text }}
          >
            لا تعرف من أين تبدأ؟
          </h2>

          <p
            className="text-sm leading-relaxed mb-7 max-w-xs mx-auto"
            style={{ color: T.textSec }}
          >
            تواصل معنا ونساعدك في اختيار الدورة المناسبة لمستواك وأهدافك
          </p>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link
              to={ROUTES.CONTACT}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-[14px] font-semibold"
              style={{
                background: T.purple,
                color: '#fff',
                transition: 'background 0.18s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = T.purpleDark }}
              onMouseLeave={e => { e.currentTarget.style.background = T.purple }}
            >
              تواصل معنا
              <ArrowLeft size={13} strokeWidth={2.5} style={{ transform: 'rotate(180deg)' }} />
            </Link>
            <Link
              to={ROUTES.PROGRAMS}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-[14px] font-semibold"
              style={{
                background: '#fff',
                color: T.textSec,
                border: `1px solid ${T.border}`,
                transition: 'border-color 0.18s, color 0.18s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = T.purple; e.currentTarget.style.color = T.purple }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textSec }}
            >
              مسارات التعلم
            </Link>
          </div>
        </div>
      </section>

    </div>
  )
}
