import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Frown, Trophy, Star, Handshake } from 'lucide-react'
import api from '../../utils/api.js'
import { getFileUrl, ROUTES } from '../../config/constants.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractYouTubeId(url) {
  if (!url) return null
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([^&\n?#]+)/)
  return m ? m[1] : null
}

function youtubeThumbnail(url) {
  const id = extractYouTubeId(url)
  return id ? `https://img.youtube.com/vi/${id}/maxresdefault.jpg` : null
}

const CATEGORY_LABELS = {
  tajweed: 'التجويد', hifz: 'الحفظ', nazra: 'النظر',
  arabic: 'اللغة العربية', quran: 'القرآن الكريم', other: 'أخرى',
}

const DIFFICULTY_LABELS = {
  beginner:     { label: 'مبتدئ',  color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  intermediate: { label: 'متوسط',  color: '#7c3aed', bg: 'rgba(124,58,237,0.12)' },
  advanced:     { label: 'متقدم',  color: '#E8C76A', bg: 'rgba(232,199,106,0.12)' },
}

const LANG_LABELS = { ar: 'العربية', en: 'English', both: 'عربي وإنجليزي' }

// ── Video Modal ───────────────────────────────────────────────────────────────

function VideoModal({ videoId, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.9)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-4xl rounded-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
          className="w-full aspect-video"
          allow="autoplay; encrypted-media"
          allowFullScreen
          title="Course preview"
        />
      </motion.div>
    </motion.div>
  )
}

// ── Stat Item ─────────────────────────────────────────────────────────────────

function StatItem({ icon, value, label }) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <div className="text-xl mb-0.5">{icon}</div>
      <div className="font-heading font-bold text-sm text-white">{value}</div>
      <div className="text-[11px]" style={{ color: '#8b7aad' }}>{label}</div>
    </div>
  )
}

// ── Curriculum Section Accordion ──────────────────────────────────────────────

function CurriculumAccordion({ sections }) {
  const [open, setOpen] = useState(0)
  if (!sections || sections.length === 0) return null

  return (
    <div className="space-y-2">
      {sections.map((sec, i) => (
        <div key={i} className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(150,120,220,0.12)', background: 'rgba(255,255,255,0.02)' }}>
          <button
            onClick={() => setOpen(open === i ? -1 : i)}
            className="w-full flex items-center justify-between px-5 py-4 text-right transition-colors"
            style={{ background: open === i ? 'rgba(124,58,237,0.08)' : 'transparent' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-none"
                style={{ background: 'rgba(124,58,237,0.15)', color: '#a78fd6' }}>
                {i + 1}
              </div>
              <span className="font-semibold text-sm text-white">{sec.sectionTitleAr || sec.sectionTitle || `الوحدة ${i + 1}`}</span>
              {sec.lessons?.length > 0 && (
                <span className="text-xs" style={{ color: '#6b5f8a' }}>{sec.lessons.length} درس</span>
              )}
            </div>
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none"
              className="flex-none transition-transform"
              style={{ color: '#8b7aad', transform: open === i ? 'rotate(180deg)' : 'rotate(0deg)' }}
            >
              <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <AnimatePresence>
            {open === i && sec.lessons?.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-4 space-y-2">
                  {sec.lessons.map((lesson, j) => (
                    <div key={j} className="flex items-center gap-3 py-2" style={{ borderBottom: j < sec.lessons.length - 1 ? '1px solid rgba(150,120,220,0.06)' : 'none' }}>
                      <svg className="flex-none" width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M9 18V5l12-2v13" stroke="#8b7aad" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      <span className="text-xs" style={{ color: '#b3a4d0' }}>{lesson}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  )
}

// ── Related Course Card ───────────────────────────────────────────────────────

function RelatedCard({ course }) {
  const diff = DIFFICULTY_LABELS[course.difficulty] || DIFFICULTY_LABELS.beginner
  const slug = course.slug || course._id
  return (
    <Link
      to={ROUTES.COURSE_DETAIL.replace(':slug', slug)}
      className="flex items-center gap-4 p-4 rounded-2xl transition-all group"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(150,120,220,0.1)' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.3)'; e.currentTarget.style.background = 'rgba(124,58,237,0.06)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(150,120,220,0.1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
    >
      <div className="w-16 h-12 rounded-xl overflow-hidden flex-none" style={{ background: 'rgba(124,58,237,0.1)' }}>
        {course.thumbnailImage ? (
          <img src={getFileUrl(course.thumbnailImage)} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><BookOpen size={20} strokeWidth={1.6} color="#7c3aed" /></div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-xs text-white line-clamp-2 mb-1">{course.nameAr}</div>
        <span className="text-[10px] font-semibold" style={{ color: diff.color }}>{diff.label}</span>
      </div>
      <svg className="flex-none transition-transform group-hover:translate-x-[-3px]" width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ color: '#6b5f8a' }}><path d="m9 18-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </Link>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CourseDetailPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [videoOpen, setVideoOpen] = useState(false)
  const [enrollClicked, setEnrollClicked] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['public', 'course', slug],
    queryFn: () => api.get(`/courses/${slug}`).then(r => r.data.data),
    staleTime: 300_000,
  })

  useEffect(() => { window.scrollTo(0, 0) }, [slug])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f0226' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-purple-600 border-t-transparent animate-spin" />
          <span className="text-sm" style={{ color: '#8b7aad' }}>جارٍ التحميل...</span>
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-6" style={{ background: '#0f0226' }}>
        <Frown size={60} strokeWidth={1.2} color="#8b7aad" className="mb-4" />
        <h1 className="font-heading font-bold text-2xl text-white mb-2">الدورة غير موجودة</h1>
        <p className="text-sm mb-6" style={{ color: '#8b7aad' }}>لم نتمكن من العثور على هذه الدورة</p>
        <button
          onClick={() => navigate(ROUTES.COURSES)}
          className="px-6 py-3 rounded-xl font-bold text-white text-sm"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}
        >
          العودة إلى الدورات
        </button>
      </div>
    )
  }

  const course = data
  const related = data.relatedCourses || []
  const diff = DIFFICULTY_LABELS[course.difficulty] || DIFFICULTY_LABELS.beginner
  const ytId = extractYouTubeId(course.introVideoUrl)
  const ytThumb = youtubeThumbnail(course.introVideoUrl)
  const coverImg = getFileUrl(course.coverImage) || getFileUrl(course.thumbnailImage)

  const tabs = [
    { id: 'overview', label: 'نظرة عامة' },
    course.curriculum?.length > 0 ? { id: 'curriculum', label: 'المنهج الدراسي' } : null,
    course.learningOutcomesAr?.length > 0 ? { id: 'outcomes', label: 'ما ستتعلمه' } : null,
  ].filter(Boolean)

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #0f0226 0%, #150232 100%)' }} dir="rtl">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden" style={{ paddingTop: 'clamp(90px, 12vw, 130px)', paddingBottom: '60px' }}>
        {/* Background */}
        {coverImg && (
          <div className="absolute inset-0">
            <img src={coverImg} alt="" className="w-full h-full object-cover opacity-15" />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(15,2,38,0.7) 0%, rgba(15,2,38,0.95) 100%)' }} />
          </div>
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, transparent 60%)' }} />

        <div className="relative max-w-6xl mx-auto px-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs mb-6" style={{ color: '#6b5f8a' }}>
            <Link to={ROUTES.HOME} className="hover:text-purple-300 transition-colors">الرئيسية</Link>
            <span>›</span>
            <Link to={ROUTES.COURSES} className="hover:text-purple-300 transition-colors">الدورات</Link>
            <span>›</span>
            <span style={{ color: '#b3a4d0' }}>{course.nameAr}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10 items-start">
            {/* Left: info */}
            <div>
              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap mb-5">
                <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ color: diff.color, background: diff.bg }}>
                  {diff.label}
                </span>
                {course.category && (
                  <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: 'rgba(124,58,237,0.12)', color: '#a78fd6' }}>
                    {CATEGORY_LABELS[course.category] || course.category}
                  </span>
                )}
                {course.certificateAvailable && (
                  <span className="text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                    <Trophy size={12} strokeWidth={2} /> شهادة إتمام
                  </span>
                )}
                {course.featured && (
                  <span className="text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1" style={{ background: 'rgba(232,199,106,0.12)', color: '#E8C76A' }}>
                    <Star size={12} strokeWidth={0} fill="#E8C76A" /> دورة مميزة
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="font-heading font-extrabold text-white mb-4" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', lineHeight: 1.2 }}>
                {course.nameAr}
              </h1>

              {/* Short desc */}
              {course.shortDescriptionAr && (
                <p className="text-base mb-6 leading-relaxed" style={{ color: '#b3a4d0', maxWidth: '600px' }}>
                  {course.shortDescriptionAr}
                </p>
              )}

              {/* Stats row */}
              <div className="flex items-center gap-6 flex-wrap mb-6">
                {(course.studentsCount > 0 || course.enrollmentCount > 0) && (
                  <div className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="7" r="4" stroke="#b3a4d0" strokeWidth="1.8"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" stroke="#b3a4d0" strokeWidth="1.8" strokeLinecap="round"/><circle cx="17" cy="9" r="2.3" stroke="#b3a4d0" strokeWidth="1.8"/><path d="M21 21v-2a4 4 0 0 0-2-3.5" stroke="#b3a4d0" strokeWidth="1.8" strokeLinecap="round"/></svg>
                    <span className="text-sm font-semibold" style={{ color: '#E7E0F5' }}>
                      {(course.studentsCount || course.enrollmentCount || 0).toLocaleString('ar')} طالب
                    </span>
                  </div>
                )}
                {course.lessonsCount > 0 && (
                  <div className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="#b3a4d0" strokeWidth="1.8"/><path d="m9 9 6 3-6 3V9Z" fill="#b3a4d0"/></svg>
                    <span className="text-sm font-semibold" style={{ color: '#E7E0F5' }}>{course.lessonsCount} درس</span>
                  </div>
                )}
                {course.estimatedDuration > 0 && (
                  <div className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#b3a4d0" strokeWidth="1.8"/><path d="M12 7v5l3 3" stroke="#b3a4d0" strokeWidth="1.8" strokeLinecap="round"/></svg>
                    <span className="text-sm font-semibold" style={{ color: '#E7E0F5' }}>{course.estimatedDuration} ساعة</span>
                  </div>
                )}
                {course.language && (
                  <div className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#b3a4d0" strokeWidth="1.8"/><path d="M3 12h18M12 3c2.5 2.7 4 6.2 4 10s-1.5 7.3-4 10c-2.5-2.7-4-6.2-4-10s1.5-7.3 4-10Z" stroke="#b3a4d0" strokeWidth="1.8"/></svg>
                    <span className="text-sm font-semibold" style={{ color: '#E7E0F5' }}>{LANG_LABELS[course.language]}</span>
                  </div>
                )}
              </div>

              {/* Instructor */}
              {course.instructor && (
                <div className="flex items-center gap-3">
                  {course.instructor.avatar ? (
                    <img src={getFileUrl(course.instructor.avatar)} alt="" className="w-10 h-10 rounded-full object-cover" style={{ border: '2px solid rgba(124,58,237,0.4)' }} />
                  ) : (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold" style={{ background: 'rgba(124,58,237,0.2)', color: '#a78fd6' }}>
                      {(course.instructor.firstNameAr || course.instructor.firstName || '?')[0]}
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-semibold text-white">
                      {course.instructor.firstNameAr || course.instructor.firstName}{' '}
                      {course.instructor.lastNameAr || course.instructor.lastName}
                    </div>
                    <div className="text-[11px]" style={{ color: '#8b7aad' }}>المعلم</div>
                  </div>
                </div>
              )}
            </div>

            {/* Right: sticky enrollment card (hero inline version) */}
            <div>
              <div className="rounded-3xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(150,120,220,0.2)', backdropFilter: 'blur(12px)' }}>
                {/* Thumbnail or video preview */}
                {ytThumb ? (
                  <div className="relative cursor-pointer" style={{ height: '200px' }} onClick={() => setVideoOpen(true)}>
                    <img src={ytThumb} alt="" className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)' }}>
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
                        style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="m5 3 14 9-14 9V3Z"/></svg>
                      </motion.div>
                    </div>
                    <div className="absolute bottom-3 left-3 right-3 text-center">
                      <span className="text-xs font-semibold text-white px-3 py-1 rounded-full" style={{ background: 'rgba(0,0,0,0.6)' }}>▶ شاهد نبذة تعريفية</span>
                    </div>
                  </div>
                ) : getFileUrl(course.thumbnailImage) ? (
                  <div style={{ height: '180px' }} className="overflow-hidden">
                    <img src={getFileUrl(course.thumbnailImage)} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                ) : null}

                <div className="p-6">
                  {/* Price / Enroll */}
                  <div className="mb-5">
                    <p className="text-center font-heading font-extrabold text-2xl text-white mb-1">
                      التسجيل مفتوح
                    </p>
                    <p className="text-center text-xs" style={{ color: '#8b7aad' }}>
                      {course.enrollmentEnabled ? 'انضم الآن وابدأ رحلتك' : 'التسجيل مؤقتاً مغلق'}
                    </p>
                  </div>

                  {course.enrollmentEnabled && (
                    <button
                      onClick={() => { setEnrollClicked(true); navigate(ROUTES.LOGIN) }}
                      className="w-full py-4 rounded-2xl text-base font-extrabold transition-all mb-3"
                      style={{ background: 'linear-gradient(135deg, #E8C76A, #D4AF37)', color: '#2a1500', boxShadow: '0 10px 28px rgba(212,175,55,0.35)' }}
                    >
                      ابدأ التعلم الآن
                    </button>
                  )}

                  <Link
                    to={ROUTES.CONTACT}
                    className="block w-full text-center py-3 rounded-2xl text-sm font-bold transition-all mb-5"
                    style={{ border: '1.5px solid rgba(150,120,220,0.25)', color: '#b3a4d0' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(150,120,220,0.5)'; e.currentTarget.style.color = '#E7E0F5' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(150,120,220,0.25)'; e.currentTarget.style.color = '#b3a4d0' }}
                  >
                    تواصل معنا لمزيد من المعلومات
                  </Link>

                  {/* What's included */}
                  <div className="space-y-2.5">
                    {[
                      course.lessonsCount > 0 && `${course.lessonsCount} درس تفاعلي`,
                      course.estimatedDuration > 0 && `${course.estimatedDuration} ساعة محتوى`,
                      course.certificateAvailable && 'شهادة إتمام رسمية',
                      course.enrollmentEnabled && 'وصول مدى الحياة للمحتوى',
                      'دعم مباشر من المعلم',
                    ].filter(Boolean).map((item, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-none" style={{ background: 'rgba(16,185,129,0.15)' }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="m5 12 5 5 9-9" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                        <span className="text-xs" style={{ color: '#b3a4d0' }}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content Area ── */}
      <div className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10">

          {/* LEFT: Main content */}
          <div>
            {/* Tabs */}
            {tabs.length > 1 && (
              <div className="flex items-center gap-1 mb-8 p-1 rounded-2xl inline-flex" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(150,120,220,0.12)' }}>
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      background: activeTab === tab.id ? 'linear-gradient(135deg, #7c3aed, #5b21b6)' : 'transparent',
                      color: activeTab === tab.id ? '#fff' : '#8b7aad',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            {/* Overview */}
            {(activeTab === 'overview' || tabs.length === 1) && (
              <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
                {/* Description */}
                {course.descriptionAr && (
                  <div>
                    <h2 className="font-heading font-bold text-xl text-white mb-4">عن هذه الدورة</h2>
                    <div className="text-sm leading-8 whitespace-pre-wrap" style={{ color: '#b3a4d0' }}>
                      {course.descriptionAr}
                    </div>
                  </div>
                )}

                {/* Learning Outcomes */}
                {course.learningOutcomesAr?.length > 0 && (
                  <div>
                    <h2 className="font-heading font-bold text-xl text-white mb-5">ماذا ستتعلم</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {course.learningOutcomesAr.map((item, i) => (
                        <div key={i} className="flex items-start gap-3 p-4 rounded-xl" style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.12)' }}>
                          <div className="w-5 h-5 rounded-full flex items-center justify-center flex-none mt-0.5" style={{ background: 'rgba(124,58,237,0.2)' }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="m5 12 5 5 9-9" stroke="#a78fd6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </div>
                          <span className="text-sm" style={{ color: '#E7E0F5' }}>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Requirements */}
                {course.requirementsAr?.length > 0 && (
                  <div>
                    <h2 className="font-heading font-bold text-xl text-white mb-4">المتطلبات المسبقة</h2>
                    <div className="space-y-2.5">
                      {course.requirementsAr.map((req, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className="w-1.5 h-1.5 rounded-full mt-2 flex-none" style={{ background: '#7c3aed' }} />
                          <span className="text-sm" style={{ color: '#b3a4d0' }}>{req}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Target Audience */}
                {course.targetAudienceAr && (
                  <div>
                    <h2 className="font-heading font-bold text-xl text-white mb-4">لمن هذه الدورة؟</h2>
                    <div className="p-5 rounded-2xl text-sm leading-relaxed" style={{ background: 'rgba(232,199,106,0.06)', border: '1px solid rgba(232,199,106,0.15)', color: '#E7E0F5' }}>
                      {course.targetAudienceAr}
                    </div>
                  </div>
                )}

                {/* Instructor section */}
                {course.instructor && (
                  <div>
                    <h2 className="font-heading font-bold text-xl text-white mb-5">المعلم</h2>
                    <div className="flex items-start gap-5 p-6 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(150,120,220,0.12)' }}>
                      {course.instructor.avatar ? (
                        <img src={getFileUrl(course.instructor.avatar)} alt="" className="w-16 h-16 rounded-2xl object-cover flex-none" style={{ border: '2px solid rgba(124,58,237,0.3)' }} />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold flex-none" style={{ background: 'rgba(124,58,237,0.2)', color: '#a78fd6' }}>
                          {(course.instructor.firstNameAr || course.instructor.firstName || '?')[0]}
                        </div>
                      )}
                      <div>
                        <div className="font-heading font-bold text-base text-white mb-1">
                          {course.instructor.firstNameAr || course.instructor.firstName}{' '}
                          {course.instructor.lastNameAr || course.instructor.lastName}
                        </div>
                        {course.instructor.bioAr && (
                          <p className="text-xs leading-relaxed" style={{ color: '#b3a4d0', maxWidth: '400px' }}>{course.instructor.bioAr}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Curriculum */}
            {activeTab === 'curriculum' && (
              <motion.div key="curriculum" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2 className="font-heading font-bold text-xl text-white mb-5">المنهج الدراسي</h2>
                <p className="text-sm mb-6" style={{ color: '#8b7aad' }}>
                  {course.curriculum?.reduce((sum, sec) => sum + (sec.lessons?.length || 0), 0) || 0} درس •{' '}
                  {course.curriculum?.length || 0} وحدة
                </p>
                <CurriculumAccordion sections={course.curriculum} />
              </motion.div>
            )}

            {/* Outcomes */}
            {activeTab === 'outcomes' && (
              <motion.div key="outcomes" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2 className="font-heading font-bold text-xl text-white mb-5">ما ستتعلمه</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {course.learningOutcomesAr?.map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-4 rounded-xl" style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.12)' }}>
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-none mt-0.5" style={{ background: 'rgba(124,58,237,0.2)' }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="m5 12 5 5 9-9" stroke="#a78fd6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                      <span className="text-sm" style={{ color: '#E7E0F5' }}>{item}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* RIGHT: Related courses + tags */}
          <div className="space-y-6 mt-8 lg:mt-0">
            {/* Course tags */}
            {course.tags?.length > 0 && (
              <div className="p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(150,120,220,0.1)' }}>
                <h3 className="font-semibold text-sm text-white mb-3">الوسوم</h3>
                <div className="flex flex-wrap gap-2">
                  {course.tags.map(tag => (
                    <Link
                      key={tag}
                      to={`${ROUTES.COURSES}?search=${tag}`}
                      className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
                      style={{ background: 'rgba(124,58,237,0.1)', color: '#a78fd6', border: '1px solid rgba(124,58,237,0.2)' }}
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Related Courses */}
            {related.length > 0 && (
              <div className="p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(150,120,220,0.1)' }}>
                <h3 className="font-semibold text-sm text-white mb-4">دورات ذات صلة</h3>
                <div className="space-y-3">
                  {related.map(rc => <RelatedCard key={rc._id} course={rc} />)}
                </div>
              </div>
            )}

            {/* CTA card */}
            <div className="p-5 rounded-2xl text-center" style={{ background: 'linear-gradient(135deg, rgba(232,199,106,0.08), rgba(212,175,55,0.04))', border: '1px solid rgba(232,199,106,0.15)' }}>
              <Handshake size={36} strokeWidth={1.4} color="#E8C76A" className="mb-3 mx-auto" />
              <p className="text-sm font-semibold text-white mb-2">هل لديك سؤال؟</p>
              <p className="text-xs mb-4" style={{ color: '#b3a4d0' }}>تواصل معنا ونساعدك في اتخاذ القرار</p>
              <Link
                to={ROUTES.CONTACT}
                className="block text-center py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #E8C76A, #D4AF37)', color: '#2a1500' }}
              >
                تواصل معنا
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Video Modal */}
      <AnimatePresence>
        {videoOpen && ytId && <VideoModal videoId={ytId} onClose={() => setVideoOpen(false)} />}
      </AnimatePresence>
    </div>
  )
}
