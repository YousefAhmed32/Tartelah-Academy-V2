import { motion, useReducedMotion } from 'framer-motion'
import { CircleCheck, Mail, Phone, MessageCircle, RotateCcw } from 'lucide-react'

const CONTACT_METHOD_LABEL = {
  email: { text: 'عبر البريد الإلكتروني', Icon: Mail },
  phone: { text: 'عبر الهاتف', Icon: Phone },
  whatsapp: { text: 'عبر واتساب', Icon: MessageCircle },
}

export default function ContactSuccessState({ preferredContact = 'email', onReset }) {
  const reduced = useReducedMotion()
  const method = CONTACT_METHOD_LABEL[preferredContact] || CONTACT_METHOD_LABEL.email

  return (
    <div role="status" className="flex flex-col items-center px-4 py-10 text-center">
      <motion.div
        initial={{ opacity: 0, scale: reduced ? 1 : 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: reduced ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="grid h-20 w-20 place-items-center rounded-full bg-emerald-50"
      >
        <CircleCheck size={44} strokeWidth={1.6} className="text-emerald-500" />
      </motion.div>

      <h3 className="mt-6 font-heading text-[22px] font-extrabold text-brand-textBody2">تم إرسال رسالتك بنجاح!</h3>
      <p className="mx-auto mt-3 max-w-[380px] text-[15px] leading-[1.85] text-gray-500">
        شكراً لتواصلك مع ترتيلة أونلاين. تلقّى فريقنا رسالتك وسيقوم بمراجعتها والرد عليك خلال 24 ساعة.
      </p>

      <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#e8e0f5] bg-[#FCFBFE] px-4 py-2">
        <method.Icon size={15} strokeWidth={1.8} className="text-brand-purple" />
        <span className="text-[13.5px] font-semibold text-brand-textBody2">سنتواصل معك {method.text}</span>
      </div>

      <button
        type="button"
        onClick={onReset}
        className="mt-8 inline-flex cursor-pointer items-center gap-2 rounded-btn bg-[#F2ECFA] px-6 py-3 font-body font-bold text-brand-purple transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#e8ddf7]"
      >
        <RotateCcw size={16} strokeWidth={2} />
        إرسال رسالة أخرى
      </button>
    </div>
  )
}
