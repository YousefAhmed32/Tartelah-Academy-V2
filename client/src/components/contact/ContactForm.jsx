import { useState } from 'react'
import { User, Send, CircleAlert } from 'lucide-react'
import Input from '../ui/Input.jsx'
import Button from '../ui/Button.jsx'
import PreferredContactSelector from './PreferredContactSelector.jsx'
import ContactSuccessState from './ContactSuccessState.jsx'

const COUNTRIES = [
  'المملكة العربية السعودية', 'مصر', 'الإمارات', 'الكويت', 'قطر', 'البحرين', 'الأردن', 'العراق',
  'سوريا', 'لبنان', 'تونس', 'المغرب', 'الجزائر', 'ليبيا', 'اليمن', 'عُمان', 'فلسطين', 'السودان',
  'الولايات المتحدة', 'المملكة المتحدة', 'كندا', 'أستراليا', 'ألمانيا', 'فرنسا', 'دولة أخرى',
]

const SUBJECTS = [
  'الاستفسار عن الاشتراك', 'التسجيل في الأكاديمية', 'مشكلة تقنية',
  'شراكة أو تعاون', 'الاستفسار عن المناهج', 'التواصل مع الإدارة', 'غير ذلك',
]

const EMPTY_FORM = { name: '', email: '', phone: '', country: '', subject: '', message: '', preferredContact: 'email' }

function SelectField({ label, value, onChange, options, placeholder, disabled }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-brand-textBody">{label}</label>
      <select value={value} onChange={onChange} disabled={disabled} className="field-light">
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

export default function ContactForm({ isSubmitting, serverError, onSubmit }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)

  function field(key) {
    return (e) => {
      setForm((p) => ({ ...p, [key]: e.target.value }))
      if (errors[key]) setErrors((p) => { const n = { ...p }; delete n[key]; return n })
    }
  }

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'الاسم مطلوب'
    if (!form.email.trim()) e.email = 'البريد الإلكتروني مطلوب'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'بريد إلكتروني غير صالح'
    if (!form.message.trim()) e.message = 'الرسالة مطلوبة'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    const ok = await onSubmit(form)
    if (ok) setSubmitted(true)
  }

  function handleReset() {
    setForm(EMPTY_FORM)
    setErrors({})
    setSubmitted(false)
  }

  if (submitted) {
    return (
      <div id="contact-form" className="card-light p-[clamp(24px,4vw,40px)] scroll-mt-28">
        <ContactSuccessState preferredContact={form.preferredContact} onReset={handleReset} />
      </div>
    )
  }

  return (
    <div id="contact-form" className="card-light p-[clamp(24px,4vw,40px)] scroll-mt-28">
      <h2 className="font-heading text-[22px] font-extrabold text-brand-textBody2">أرسل لنا رسالة</h2>
      <p className="mt-1.5 text-[14.5px] text-gray-500">سنرد عليك في أقرب وقت ممكن، عادة خلال 24 ساعة</p>

      <form onSubmit={handleSubmit} aria-busy={isSubmitting} className="mt-7 flex flex-col gap-5">
        <Input
          variant="light"
          label="الاسم الكامل *"
          icon={<User size={18} strokeWidth={1.8} />}
          placeholder="محمد أحمد"
          autoComplete="name"
          value={form.name}
          onChange={field('name')}
          error={errors.name}
          disabled={isSubmitting}
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Input
            variant="light"
            type="email"
            dir="ltr"
            label="البريد الإلكتروني *"
            placeholder="example@email.com"
            autoComplete="email"
            value={form.email}
            onChange={field('email')}
            error={errors.email}
            disabled={isSubmitting}
          />
          <Input
            variant="light"
            type="tel"
            dir="ltr"
            label="رقم الهاتف"
            placeholder="+966 5X XXX XXXX"
            autoComplete="tel"
            value={form.phone}
            onChange={field('phone')}
            disabled={isSubmitting}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <SelectField
            label="الدولة" value={form.country} onChange={field('country')}
            options={COUNTRIES} placeholder="اختر دولتك" disabled={isSubmitting}
          />
          <SelectField
            label="الموضوع" value={form.subject} onChange={field('subject')}
            options={SUBJECTS} placeholder="اختر موضوع رسالتك" disabled={isSubmitting}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-brand-textBody">الرسالة *</label>
          <textarea
            value={form.message}
            onChange={field('message')}
            disabled={isSubmitting}
            placeholder="اكتب رسالتك هنا..."
            rows={5}
            className={`field-light resize-y ${errors.message ? '!border-red-400' : ''}`}
          />
          {errors.message && <p className="text-sm text-red-500">{errors.message}</p>}
        </div>

        <PreferredContactSelector
          value={form.preferredContact}
          onChange={(v) => setForm((p) => ({ ...p, preferredContact: v }))}
        />

        {serverError && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-600">
            <CircleAlert size={17} strokeWidth={1.8} className="mt-0.5 flex-none" />
            <span>{serverError}</span>
          </div>
        )}

        <Button
          type="submit"
          variant="purple"
          size="lg"
          fullWidth
          loading={isSubmitting}
          icon={<Send size={17} strokeWidth={2} />}
          className="mt-1"
        >
          {isSubmitting ? 'جارٍ الإرسال...' : 'إرسال الرسالة'}
        </Button>
      </form>
    </div>
  )
}
