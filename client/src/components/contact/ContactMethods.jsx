import { motion, useReducedMotion } from 'framer-motion'
import { Mail, Phone, Play, ArrowLeft, Clock } from 'lucide-react'

function WhatsAppIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  )
}

const fadeUp = (reduced, delay = 0) => ({
  initial: { opacity: 0, y: reduced ? 0 : 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: reduced ? 0 : 0.55, delay: reduced ? 0 : delay, ease: [0.16, 1, 0.3, 1] },
})

function SecondaryMethod({ Icon, label, value, sub, href, iconBg, iconColor, delay, reduced }) {
  return (
    <motion.a
      {...fadeUp(reduced, delay)}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="card-light card-lift group flex items-center gap-4 p-5 no-underline"
    >
      <span className="grid h-12 w-12 flex-none place-items-center rounded-2xl transition-colors" style={{ background: iconBg }}>
        <Icon size={21} strokeWidth={1.8} style={{ color: iconColor }} />
      </span>
      <div className="min-w-0">
        <div className="text-[13px] font-semibold text-gray-500">{label}</div>
        <div dir="ltr" className="truncate text-[15px] font-bold text-brand-textBody2 text-end sm:text-start">{value}</div>
        {sub && <div className="mt-0.5 text-[12px] text-gray-400">{sub}</div>}
      </div>
    </motion.a>
  )
}

export default function ContactMethods({ phone, whatsappHref, emailAddr, youtubeHref, youtubeHandle, workingHours }) {
  const reduced = useReducedMotion()

  return (
    <section className="bg-[#FCFBFE] px-[clamp(20px,5vw,68px)] py-[clamp(48px,6vw,72px)]">
      <div className="mx-auto max-w-[1340px]">

        {/* Featured WhatsApp rail — visually primary, fastest channel */}
        <motion.a
          {...fadeUp(reduced, 0)}
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-col items-center gap-6 rounded-[28px] border border-[#25D36633] bg-gradient-to-l from-[#25D36612] via-white to-white p-7 no-underline shadow-card transition-transform duration-300 hover:-translate-y-1 sm:flex-row sm:p-8"
        >
          <span className="grid h-16 w-16 flex-none place-items-center rounded-2xl bg-[#25D366] shadow-[0_14px_30px_rgba(37,211,102,0.35)]">
            <WhatsAppIcon className="h-8 w-8 text-white" />
          </span>

          <div className="flex-1 text-center sm:text-start">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <h3 className="font-heading text-[19px] font-extrabold text-brand-textBody2">تواصل معنا عبر واتساب</h3>
              <span className="rounded-full bg-[#25D366] px-2.5 py-0.5 text-[11px] font-bold text-white">الأسرع</span>
            </div>
            <p className="mt-1.5 text-[14.5px] text-gray-500">احصل على رد فوري من فريق الدعم خلال دقائق، بدون انتظار</p>
          </div>

          <span className="inline-flex flex-none cursor-pointer items-center gap-2 rounded-btn bg-[#25D366] px-6 py-3 font-body font-bold text-white transition-transform duration-200 group-hover:-translate-y-0.5">
            ابدأ المحادثة
            <ArrowLeft size={17} strokeWidth={2.2} />
          </span>
        </motion.a>

        {/* Secondary methods */}
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <SecondaryMethod
            Icon={Mail} label="البريد الإلكتروني" value={emailAddr} href={`mailto:${emailAddr}`}
            iconBg="#F2ECFA" iconColor="#6D34D6" reduced={reduced} delay={0.08}
          />
          <SecondaryMethod
            Icon={Phone} label="اتصل بنا" value={phone} sub={workingHours} href={`tel:${phone.replace(/\s/g, '')}`}
            iconBg="#EAF6EF" iconColor="#1F9D57" reduced={reduced} delay={0.14}
          />
          <SecondaryMethod
            Icon={Play} label="تابعنا على يوتيوب" value={youtubeHandle} href={youtubeHref}
            iconBg="#FDECEC" iconColor="#E02424" reduced={reduced} delay={0.2}
          />
        </div>

        {/* Working-hours micro-note under the grid, ties phone card back to availability */}
        <motion.div {...fadeUp(reduced, 0.26)} className="mt-5 flex items-center justify-center gap-2 text-[13px] text-gray-400 sm:justify-start">
          <Clock size={14} strokeWidth={1.8} />
          <span>ساعات العمل: {workingHours}</span>
        </motion.div>
      </div>
    </section>
  )
}
