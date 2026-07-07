import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, Compass } from 'lucide-react'
import { ROUTES } from '../../config/constants.js'

export default function FinalContactCTA() {
  const reduced = useReducedMotion()

  return (
    <section className="bg-[#FCFBFE] px-[clamp(20px,5vw,68px)] pb-[clamp(64px,7vw,96px)]">
      <motion.div
        initial={{ opacity: 0, y: reduced ? 0 : 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: reduced ? 0 : 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative mx-auto max-w-[1180px] overflow-hidden rounded-[32px] bg-purple-gradient px-8 py-14 text-center shadow-purple sm:px-14"
      >
        <div aria-hidden="true" className="pointer-events-none absolute -top-16 -end-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 -start-16 h-64 w-64 rounded-full bg-brand-gold/15 blur-3xl" />

        <div className="relative">
          <h2 className="font-heading text-[clamp(24px,3.6vw,38px)] font-extrabold text-white">
            لم تحدد بعد المسار المناسب لك؟
          </h2>
          <p className="mx-auto mt-4 max-w-[480px] text-[15px] leading-[1.85] text-[#E7DFFB]">
            تحدث مع فريقنا مباشرة وسنساعدك على اختيار البرنامج والمعلم الأنسب لمستواك وأهدافك
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
            <Link to={ROUTES.REGISTER} className="btn-gold">
              ابدأ رحلتك الآن
              <ArrowLeft size={17} strokeWidth={2.2} />
            </Link>
            <Link
              to={ROUTES.PROGRAMS}
              className="inline-flex cursor-pointer items-center gap-2 rounded-btn border border-white/25 bg-white/5 px-6 py-3 font-body font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/10"
            >
              <Compass size={17} strokeWidth={1.8} />
              استكشف المسارات
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
