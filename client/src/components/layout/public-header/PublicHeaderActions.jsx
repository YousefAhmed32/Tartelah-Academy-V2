import { useNavigate, Link } from 'react-router-dom'
import { motion, useTransform } from 'framer-motion'
import { LayoutDashboard } from 'lucide-react'
import { useAuthStore } from '../../../store/authStore.js'
import { ROUTES, getFileUrl } from '../../../config/constants.js'
import Avatar from '../../ui/Avatar.jsx'

const MotionLink = motion(Link)

// Auth-aware utility cluster. One loud action, one quiet one — never two
// buttons of equal weight. The CTA's own padding compacts a touch as the
// shell floats (driven by the same `progress` value the shell itself uses)
// so the whole composition contracts together instead of only the shell
// resizing around static-sized actions.
export default function PublicHeaderActions({ progress }) {
  const { isAuthenticated, user, getDashboardPath } = useAuthStore()
  const navigate = useNavigate()

  // Physical padding longhands, not paddingBlock/Inline: Framer Motion's
  // px-unit whitelist doesn't reliably cover the logical shorthand, and
  // these values are symmetric anyway so physical vs. logical has no RTL
  // consequence.
  const btnBlock = useTransform(progress, [0, 1], [10, 8])
  const btnInline = useTransform(progress, [0, 1], [20, 16])

  if (isAuthenticated) {
    return (
      <button
        onClick={() => navigate(getDashboardPath())}
        className="relative z-10 hidden flex-none items-center gap-2.5 rounded-full py-1 ps-1 pe-3.5 outline-none transition-colors duration-200 hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-brand-gold/70 sm:flex"
      >
        <Avatar
          src={getFileUrl(user?.avatar)}
          firstName={user?.firstNameAr || user?.firstName}
          lastName={user?.lastNameAr || user?.lastName}
          size="sm"
        />
        <span className="flex items-center gap-1.5 text-[13.5px] font-bold text-[#F3EFFA]">
          <LayoutDashboard size={15} strokeWidth={2} className="text-brand-gold" />
          <span className="hidden md:inline">لوحة التحكم</span>
        </span>
      </button>
    )
  }

  return (
    <div className="relative z-10 flex flex-none items-center gap-2.5">
      <Link to={ROUTES.LOGIN} className="btn-outline hidden text-sm xl:flex">
        تسجيل الدخول
      </Link>
      <MotionLink
        to={ROUTES.REGISTER}
        style={{ paddingTop: btnBlock, paddingBottom: btnBlock, paddingLeft: btnInline, paddingRight: btnInline }}
        className="hidden cursor-pointer whitespace-nowrap rounded-btn border-none bg-gold-gradient font-heading text-sm font-bold text-brand-goldText shadow-gold transition-transform duration-200 hover:-translate-y-0.5 sm:block"
      >
        ابدأ رحلتك الآن
      </MotionLink>
    </div>
  )
}
