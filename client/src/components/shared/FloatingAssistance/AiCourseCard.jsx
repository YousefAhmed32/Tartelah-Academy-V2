import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Star, Award, Sparkles, TrendingUp, Clock3, Users, PlayCircle, ArrowLeft, BookOpen } from 'lucide-react'
import { getFileUrl } from '../../../config/constants.js'

const T = {
  bg:           '#1B0A3A',
  border:       'rgba(150,120,220,0.22)',
  borderHover:  'rgba(150,120,220,0.45)',
  text:         '#E7E0F5',
  textSec:      '#b3a4d0',
  textMuted:    '#8b7aad',
  purple:       '#7c3aed',
  purpleLight:  'rgba(124,58,237,0.16)',
  gold:         '#E8C76A',
}

const BADGE_CONFIG = {
  featured:   { label: 'مميزة',          Icon: Star,       color: T.gold,   bg: 'rgba(232,199,106,0.14)', border: 'rgba(232,199,106,0.32)' },
  bestseller: { label: 'الأكثر مبيعًا',   Icon: Award,      color: '#fb923c', bg: 'rgba(251,146,60,0.14)',  border: 'rgba(251,146,60,0.32)' },
  new:        { label: 'جديد',            Icon: Sparkles,   color: '#4ade80', bg: 'rgba(74,222,128,0.14)',  border: 'rgba(74,222,128,0.32)' },
  popular:    { label: 'الأكثر طلبًا',    Icon: TrendingUp, color: '#38bdf8', bg: 'rgba(56,189,248,0.14)',  border: 'rgba(56,189,248,0.32)' },
}

// Rich, Netflix-style card for a single course recommendation surfaced by the
// AI concierge. Every field on `course` is the real, DB-backed entity shape
// returned by server/src/services/aiTools.service.js (courseCardShape) —
// nothing here is invented client-side.
export default function AiCourseCard({ course, index = 0 }) {
  const thumb = getFileUrl(course.thumbnailImage)
  const badge = BADGE_CONFIG[course.badge]

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.32, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3 }}
      className="snap-start flex-none w-[210px]"
    >
      <Link
        to={course.route}
        className="group flex flex-col h-full rounded-2xl overflow-hidden"
        style={{
          background: T.bg,
          border: `1px solid ${T.border}`,
          boxShadow: '0 4px 16px rgba(0,0,0,0.22)',
          transition: 'border-color 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = T.borderHover; e.currentTarget.style.boxShadow = '0 14px 32px rgba(0,0,0,0.4)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.22)' }}
      >
        {/* Thumbnail */}
        <div className="relative w-full h-[104px] flex-none overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
          {thumb ? (
            <img
              src={thumb}
              alt=""
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <BookOpen size={26} strokeWidth={1.2} color={T.textMuted} />
            </div>
          )}
          {badge && (
            <span
              className="absolute top-2 right-2 flex items-center gap-1 text-[9.5px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}
            >
              <badge.Icon size={9} strokeWidth={2.4} />
              {badge.label}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="flex flex-col flex-1 p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span
              className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded"
              style={{ background: T.purpleLight, color: '#c9b8ef' }}
            >
              {course.difficulty}
            </span>
            {course.certificateAvailable && (
              <span className="flex items-center gap-0.5 text-[9.5px]" style={{ color: '#6ee7b7' }}>
                <Award size={9} strokeWidth={2} />
                شهادة
              </span>
            )}
          </div>

          <h4
            className="font-bold text-[12.5px] leading-snug line-clamp-2 mb-1"
            style={{ color: T.text, minHeight: '2.1em' }}
          >
            {course.name}
          </h4>

          {course.instructorName && (
            <p className="text-[10.5px] mb-1.5 truncate" style={{ color: T.textMuted }}>
              {course.instructorName}
            </p>
          )}

          {course.shortDescription && (
            <p className="text-[10.5px] leading-relaxed line-clamp-2 mb-2 flex-1" style={{ color: T.textSec }}>
              {course.shortDescription}
            </p>
          )}

          <div className="flex items-center gap-2 mb-2.5 flex-wrap text-[10px]" style={{ color: T.textMuted }}>
            {course.rating > 0 && (
              <span className="flex items-center gap-0.5">
                <Star size={9.5} fill={T.gold} strokeWidth={0} />
                {course.rating.toFixed(1)}
                {course.reviewCount > 0 && ` (${course.reviewCount})`}
              </span>
            )}
            {course.estimatedDurationHours > 0 && (
              <span className="flex items-center gap-0.5">
                <Clock3 size={9.5} strokeWidth={2} />
                {course.estimatedDurationHours}س
              </span>
            )}
            {course.lessonsCount > 0 && (
              <span className="flex items-center gap-0.5">
                <PlayCircle size={9.5} strokeWidth={2} />
                {course.lessonsCount}
              </span>
            )}
            {course.studentsCount > 0 && (
              <span className="flex items-center gap-0.5">
                <Users size={9.5} strokeWidth={2} />
                {course.studentsCount.toLocaleString('ar')}
              </span>
            )}
          </div>

          <span
            className="mt-auto flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold"
            style={{ background: T.purple, color: '#fff' }}
          >
            {course.enrollmentEnabled ? 'سجّل الآن' : 'عرض الدورة'}
            <ArrowLeft size={11} strokeWidth={2.5} style={{ transform: 'rotate(180deg)' }} />
          </span>
        </div>
      </Link>
    </motion.div>
  )
}
