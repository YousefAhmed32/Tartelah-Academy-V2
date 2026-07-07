import { useId, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ChevronDown, CircleHelp } from 'lucide-react'

const FALLBACK_FAQS = [
  { q: 'كيف أبدأ رحلتي مع ترتيلة؟', a: 'سجّل حسابك واختر مستواك، ثم سيتواصل معك فريقنا لتحديد المعلم المناسب وجدول الحصص.' },
  { q: 'هل يمكنني تغيير المعلم؟', a: 'نعم، يمكنك طلب تغيير المعلم في أي وقت دون رسوم إضافية إذا لم تكن راضياً.' },
  { q: 'ما هي تقنية الاتصال المستخدمة؟', a: 'نستخدم Zoom وGoogle Meet وMicrosoft Teams. تحتاج فقط إلى اتصال إنترنت مستقر وميكروفون.' },
  { q: 'هل يمكن تأجيل الحصة؟', a: 'نعم، يمكن التأجيل بإشعار مسبق قبل ٢٤ ساعة على الأقل.' },
  { q: 'هل يمكن للأطفال الانضمام؟', a: 'بالتأكيد، لدينا معلمون متخصصون في تعليم الأطفال من عمر ٤ سنوات.' },
  { q: 'ما هي سياسة الاسترداد؟', a: 'يمكنك استرداد مبلغ الحصص غير المستخدمة خلال ٧ أيام من بدء الاشتراك.' },
]

function FAQItem({ q, a, open, onToggle }) {
  const id = useId()
  return (
    <div className="border-b border-[#ece6f6] last:border-none">
      <h3>
        <button
          type="button"
          id={`faq-btn-${id}`}
          aria-expanded={open}
          aria-controls={`faq-panel-${id}`}
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-4 py-5 text-end"
        >
          <span className={`font-heading text-[15.5px] font-bold transition-colors ${open ? 'text-brand-purple' : 'text-brand-textBody2'}`}>{q}</span>
          <ChevronDown
            size={19}
            strokeWidth={2}
            className={`flex-none text-brand-purple transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
          />
        </button>
      </h3>
      <div
        id={`faq-panel-${id}`}
        role="region"
        aria-labelledby={`faq-btn-${id}`}
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <p className="pb-5 text-[14.5px] leading-[1.85] text-gray-500">{a}</p>
        </div>
      </div>
    </div>
  )
}

export default function ContactFAQ({ faqs = [] }) {
  const [openIndex, setOpenIndex] = useState(0)
  const reduced = useReducedMotion()

  const items = faqs.length > 0
    ? faqs.map((f) => ({ q: f.questionAr || f.question, a: f.answerAr || f.answer }))
    : FALLBACK_FAQS

  return (
    <section className="bg-white px-[clamp(20px,5vw,68px)] py-[clamp(56px,7vw,96px)]">
      <div className="mx-auto max-w-[820px]">
        <motion.div
          initial={{ opacity: 0, y: reduced ? 0 : 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: reduced ? 0 : 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="mb-10 text-center"
        >
          <span className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full bg-[#F2ECFA] px-4 py-1.5">
            <CircleHelp size={15} strokeWidth={1.8} className="text-brand-purple" />
            <span className="text-[13px] font-bold text-brand-purple">الأسئلة الشائعة</span>
          </span>
          <h2 className="font-heading text-[clamp(26px,3.6vw,38px)] font-extrabold text-brand-textBody2">
            إجابات على أكثر <span className="bg-[linear-gradient(120deg,#7C3AED,#9b5cf0)] bg-clip-text text-transparent">استفساراتك</span>
          </h2>
          <p className="mt-3 text-[15px] text-gray-500">لم تجد إجابتك؟ راسلنا مباشرة وسنساعدك خلال 24 ساعة</p>
        </motion.div>

        <div className="card-light px-6 sm:px-8">
          {items.map((item, i) => (
            <FAQItem
              key={item.q}
              q={item.q}
              a={item.a}
              open={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? null : i)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
