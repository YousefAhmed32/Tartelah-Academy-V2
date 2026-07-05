import { Link } from 'react-router-dom'
import { resolveTeacherIdentity, handleAvatarError } from '../../utils/teacherIdentity.js'
import { ROUTES } from '../../config/constants.js'

// Stable, accessible teacher card — no hover-only flip. Everything a visitor
// needs to decide (identity, specialization, a taste of the bio) is visible
// at rest; "عرض الملف الشخصي" leads to the full profile instead of hiding
// content behind a gesture that doesn't work for keyboard/touch/reduced-motion.
export default function TeacherCard({ teacher }) {
  const fullName = `${teacher.firstNameAr || ''} ${teacher.lastNameAr || ''}`.trim()
  const identity = resolveTeacherIdentity(teacher)
  const displayName = identity.honorificAr ? `${identity.honorificAr} ${fullName}` : fullName
  const profileHref = ROUTES.TEACHER_PROFILE.replace(':id', teacher._id)

  return (
    <article className="card-light card-lift flex flex-col h-full p-6">
      <div className="flex items-start gap-4 mb-4">
        <img
          src={identity.displayAvatar}
          alt=""
          aria-hidden="true"
          loading="lazy"
          onError={(e) => handleAvatarError(e, identity)}
          className="w-20 h-20 rounded-full object-cover flex-none ring-2 ring-brand-gold/50 shadow-sm bg-brand-light3"
        />
        <div className="min-w-0 pt-1.5">
          <h3 className="font-heading font-bold text-brand-textBody text-lg leading-snug break-words">
            {displayName}
          </h3>
          {!identity.isResolved && (
            <span className="inline-block mt-1 text-[11px] font-semibold text-gray-400">
              معلم قرآن كريم
            </span>
          )}
        </div>
      </div>

      {teacher.specialization && (
        <span className="pill-purple self-start mb-3">{teacher.specialization}</span>
      )}

      {teacher.bioAr && (
        <p className="text-sm leading-relaxed line-clamp-3 mb-5 flex-1 text-[#6b6280]">
          {teacher.bioAr}
        </p>
      )}

      <Link to={profileHref} className="btn-purple text-center text-sm py-2.5 mt-auto">
        عرض الملف الشخصي
      </Link>
    </article>
  )
}
