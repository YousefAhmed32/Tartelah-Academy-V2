import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import AiCourseCard from './AiCourseCard.jsx'

// Horizontal, swipeable "Netflix-style" rail of course recommendations.
// Kept as its own component (rather than inline in AiConciergePanel) so the
// same entity-driven rendering approach can later grow siblings for other
// entity types (teachers, programs, testimonials, ...) without touching the
// chat message loop itself.
export default function AiCourseRail({ courses, browseMoreUrl }) {
  if (!courses?.length) return null

  return (
    <div className="w-full">
      <div className="flex gap-2.5 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-1 -mx-1 px-1">
        {courses.map((course, i) => (
          <AiCourseCard key={course.id} course={course} index={i} />
        ))}
      </div>

      {browseMoreUrl && (
        <Link
          to={browseMoreUrl}
          className="flex items-center gap-1 mt-2 text-[12px] font-semibold w-fit transition-colors"
          style={{ color: '#c9b8ef' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#E8C76A' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#c9b8ef' }}
        >
          عرض المزيد من الدورات
          <ChevronLeft size={13} strokeWidth={2.4} />
        </Link>
      )}
    </div>
  )
}
