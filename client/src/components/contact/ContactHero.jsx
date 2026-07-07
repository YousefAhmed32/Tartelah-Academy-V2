import { motion, useReducedMotion } from 'framer-motion'
import { Headphones, Clock, Languages, ShieldCheck, ArrowLeft, MessageCircle } from 'lucide-react'

const fadeUp = (reduced, delay = 0) => ({
  initial: { opacity: 0, y: reduced ? 0 : 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: reduced ? 0 : 0.6, delay: reduced ? 0 : delay, ease: [0.16, 1, 0.3, 1] },
})

const TRUST_STATS = [
  { Icon: Clock, value: '24 ساعة', label: 'أقصى وقت للرد' },
  { Icon: ShieldCheck, value: '7 أيام', label: 'دعم أسبوعي' },
  { Icon: Languages, value: 'عربي وإنجليزي', label: 'لغات الدعم' },
]

export default function ContactHero({ whatsappHref, supportText }) {
  const reduced = useReducedMotion()

  return (
    <section className="contact-hero relative overflow-hidden">
      {/* Unified atmosphere: one layered background carries the whole hero,
          instead of a separate opaque "dark band" sitting on top of a
          different light gradient. The base (bottom) layer is a single
          solid-color-stop linear gradient authored explicitly through every
          step of deep purple → soft lavender → white — a fixed pixel-height
          transition (independent of the hero's total height, which varies a
          lot between the stacked-mobile and side-by-side-desktop layouts) so
          it always keeps the fixed, transparent navbar legible without ever
          reintroducing a muddy alpha-blended band. The radials on top are
          low-alpha, single-hue accents (purple glow, lavender corners) that
          only ever tint an already-authored color, so they add depth without
          desaturating anything. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(65% 55% at 50% -6%, rgba(124,58,237,0.16) 0%, rgba(124,58,237,0.06) 45%, transparent 72%),' +
            'radial-gradient(90% 60% at 85% 0%, #F2ECFA 0%, transparent 55%),' +
            'radial-gradient(70% 50% at 10% 100%, #F7F4FC 0%, transparent 60%),' +
            'linear-gradient(180deg,' +
            '#1A0447 0px,' +
            '#1A0447 58px,' +
            '#2C0F5C 90px,' +
            '#4E2C87 122px,' +
            '#8874B4 154px,' +
            '#DDD3EE 190px,' +
            '#F7F4FC 222px,' +
            '#FFFFFF 258px)',
        }}
      />

      {/* Faint geometric texture, consistent with the rest of the brand */}
      <svg aria-hidden="true" className="pointer-events-none absolute inset-y-0 end-0 w-1/2 opacity-[0.035]" viewBox="0 0 400 400" preserveAspectRatio="xMaxYMid slice">
        <defs>
          <pattern id="contact-hero-geo" x="0" y="0" width="70" height="70" patternUnits="userSpaceOnUse">
            <polygon points="35,2 68,20 68,50 35,68 2,50 2,20" fill="none" stroke="#1A0447" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="400" height="400" fill="url(#contact-hero-geo)" />
      </svg>

      <div className="relative mx-auto grid max-w-[1340px] grid-cols-1 items-center gap-12 px-[clamp(20px,5vw,68px)] pb-[clamp(56px,7vw,88px)] pt-[clamp(140px,16vw,184px)] lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">

        {/* Text column — first in DOM = right side in RTL */}
        <div className="text-center lg:text-right">
          <motion.div {...fadeUp(reduced, 0)} className="inline-flex items-center gap-2 rounded-full border border-[rgba(109,52,214,0.18)] bg-[#F2ECFA] px-4 py-2">
            <Headphones size={16} strokeWidth={1.8} className="text-brand-purple" />
            <span className="text-[13.5px] font-bold text-brand-purple">{supportText}</span>
          </motion.div>

          <motion.h1 {...fadeUp(reduced, 0.1)} className="mt-6 font-heading text-[clamp(32px,4.6vw,58px)] font-extrabold leading-[1.2] text-brand-textBody2">
            نحن هنا لمساعدتك في{' '}
            <span className="bg-[linear-gradient(120deg,#7C3AED,#9b5cf0)] bg-clip-text text-transparent">كل خطوة</span>
          </motion.h1>

          <motion.p {...fadeUp(reduced, 0.18)} className="mx-auto mt-5 max-w-[520px] text-[clamp(15.5px,1.4vw,18px)] leading-[1.9] text-gray-500 lg:mx-0 lg:me-auto">
            فريق ترتيلة أونلاين جاهز للإجابة على استفساراتك، ومساعدتك في اختيار المسار الأنسب لرحلتك مع القرآن الكريم.
          </motion.p>

          <motion.div {...fadeUp(reduced, 0.26)} className="mt-9 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 lg:justify-start">
            {TRUST_STATS.map(({ Icon, value, label }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="grid h-11 w-11 flex-none place-items-center rounded-2xl bg-[#F2ECFA]">
                  <Icon size={19} strokeWidth={1.8} className="text-brand-purple" />
                </span>
                <div className="text-start">
                  <div className="font-heading text-[15.5px] font-extrabold text-brand-textBody2">{value}</div>
                  <div className="text-[12.5px] text-gray-500">{label}</div>
                </div>
              </div>
            ))}
          </motion.div>

          <motion.div {...fadeUp(reduced, 0.34)} className="mt-9 flex flex-wrap items-center justify-center gap-3.5 lg:justify-start">
            <a href="#contact-form" className="btn-purple">
              أرسل رسالة الآن
              <ArrowLeft size={18} strokeWidth={2} />
            </a>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex cursor-pointer items-center gap-2.5 rounded-btn border border-[#25D36655] bg-[#25D36612] px-6 py-3 font-body font-bold text-[#128C4D] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#25D3661f]"
            >
              <MessageCircle size={18} strokeWidth={2} />
              تواصل عبر واتساب
            </a>
          </motion.div>
        </div>

        {/* Visual column — second in DOM = left side in RTL */}
        <motion.div
          initial={{ opacity: 0, y: reduced ? 0 : 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0 : 0.7, delay: reduced ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto w-full max-w-[440px] lg:max-w-none"
        >
          <div className="relative overflow-hidden rounded-[32px] border border-[#ECE4FA] bg-gradient-to-br from-[#F7F4FC] to-[#F2ECFA] p-7 shadow-card sm:p-8 lg:p-12">
            {/* Ambient color blobs */}
            <div aria-hidden="true" className="pointer-events-none absolute -top-10 -end-10 h-40 w-40 rounded-full bg-brand-gold/20 blur-3xl" />
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-14 -start-10 h-48 w-48 rounded-full bg-brand-purple/15 blur-3xl" />

            <div className="relative flex flex-col items-center gap-4 pt-4 pb-20 text-center lg:gap-5 lg:pt-6">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3.5 py-1.5 text-[12px] font-bold text-emerald-700 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                فريق الدعم متصل الآن
              </span>

              <div className="grid h-20 w-20 place-items-center rounded-full bg-purple-gradient shadow-purple lg:h-28 lg:w-28">
                <Headphones size={44} strokeWidth={1.4} className="h-8 w-8 text-white lg:h-11 lg:w-11" />
              </div>

              <p className="max-w-[240px] text-[14.5px] leading-[1.8] text-gray-500">
                فريق مخصص لمتابعة استفساراتك والرد عليها بعناية واهتمام
              </p>
            </div>

            {/* Floating detail cards */}
            <div className="pointer-events-none absolute start-6 top-8 flex items-center gap-2.5 rounded-2xl border border-[#f0ecf8] bg-white px-4 py-3 shadow-lift sm:start-2">
              <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-[#F2ECFA]">
                <Clock size={17} strokeWidth={1.8} className="text-brand-purple" />
              </span>
              <div className="text-start">
                <div className="text-[13px] font-bold text-brand-textBody2">رد سريع</div>
                <div className="text-[11px] text-gray-500">خلال 24 ساعة</div>
              </div>
            </div>

            <div className="pointer-events-none absolute bottom-8 end-6 flex items-center gap-2.5 rounded-2xl border border-[#f0ecf8] bg-white px-4 py-3 shadow-lift sm:end-2">
              <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-[#FBF3DF]">
                <Languages size={17} strokeWidth={1.8} className="text-brand-goldDark" />
              </span>
              <div className="text-start">
                <div className="text-[13px] font-bold text-brand-textBody2">دعم ثنائي اللغة</div>
                <div className="text-[11px] text-gray-500">عربي / إنجليزي</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
