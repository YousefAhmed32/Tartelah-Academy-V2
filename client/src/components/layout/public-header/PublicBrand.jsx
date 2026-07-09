import { Link } from 'react-router-dom'
import { motion, useTransform } from 'framer-motion'
import { ROUTES } from '../../../config/constants.js'

// The logo asset is a self-contained emblem on a solid deep-purple square
// that already reads as "ترتيلة Online" at full size — a gold ring or heavy
// shadow around it fights the artwork rather than framing it, and at these
// sizes it also reads as a profile-picture avatar rather than a wordmark.
// A hairline inner ring is enough definition against the dark shell; the
// Arabic title stays as the legible fallback once the emblem shrinks past
// the point its own detail is readable.
export default function PublicBrand({ progress }) {
  const mark = useTransform(progress, [0, 1], [46, 32])
  const gap = useTransform(progress, [0, 1], [11, 8])
  const titleSize = useTransform(progress, [0, 1], [16.5, 14])
  const subtitleOpacity = useTransform(progress, [0, 1], [1, 0])
  const subtitleHeight = useTransform(progress, [0, 1], [13, 0])

  return (
    <Link
      to={ROUTES.HOME}
      className="relative z-10 flex flex-none items-center rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/70"
    >
      {/* marginLeft, not marginInlineEnd: this app is RTL-only (no LTR
          mode), and Framer Motion's px-unit whitelist doesn't reliably
          cover logical margin properties. In RTL, inline-end resolves to
          physical left, which is what actually opens the gap toward the
          title text sitting to the logo's left. */}
      <motion.img
        src="/images/logo.jpg"
        alt="ترتيلة أونلاين"
        style={{ width: mark, height: mark, marginLeft: gap }}
        className="flex-none rounded-[10px] object-cover ring-1 ring-white/[0.09]"
      />
      <div style={{ lineHeight: 1.15 }}>
        <motion.div
          style={{ fontSize: titleSize }}
          className="font-heading font-extrabold tracking-[0.3px] text-[#F3E6C0]"
        >
          ترتيلة
        </motion.div>
        <motion.div
          style={{ opacity: subtitleOpacity, height: subtitleHeight }}
          className="overflow-hidden text-[10px] font-semibold tracking-[3px] text-[#9b7fd6]"
        >
          ONLINE
        </motion.div>
      </div>
    </Link>
  )
}
