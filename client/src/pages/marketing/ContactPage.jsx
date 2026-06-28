import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Mail, Phone, MessageCircle, Clock, Globe, Send, CircleCheck, Play } from 'lucide-react'
import api from '../../utils/api.js'

const COUNTRIES = [
  'المملكة العربية السعودية', 'مصر', 'الإمارات', 'الكويت', 'قطر', 'البحرين', 'الأردن', 'العراق',
  'سوريا', 'لبنان', 'تونس', 'المغرب', 'الجزائر', 'ليبيا', 'اليمن', 'عُمان', 'فلسطين', 'السودان',
  'الولايات المتحدة', 'المملكة المتحدة', 'كندا', 'أستراليا', 'ألمانيا', 'فرنسا', 'دولة أخرى',
]

const SUBJECTS = [
  'الاستفسار عن الاشتراك', 'التسجيل في الأكاديمية', 'مشكلة تقنية',
  'شراكة أو تعاون', 'الاستفسار عن المناهج', 'التواصل مع الإدارة', 'غير ذلك',
]

function FloatingParticle({ style }) {
  return (
    <div style={{
      position: 'absolute', borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(124,58,237,0.35) 0%, transparent 70%)',
      animation: 'particle-float linear infinite',
      pointerEvents: 'none',
      ...style,
    }} />
  )
}

function ContactCard({ Icon, label, value, href, color, subValue }) {
  const [hov, setHov] = useState(false)
  return (
    <a
      href={href} target="_blank" rel="noopener noreferrer"
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
        padding: '28px 22px', borderRadius: 20, textDecoration: 'none',
        background: hov ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.055)',
        border: `1px solid ${hov ? color + '66' : 'rgba(255,255,255,0.1)'}`,
        backdropFilter: 'blur(12px)',
        boxShadow: hov ? `0 20px 50px ${color}22, 0 0 0 1px ${color}33` : '0 8px 32px rgba(0,0,0,0.2)',
        transform: hov ? 'translateY(-6px)' : 'translateY(0)',
        transition: 'all 0.35s cubic-bezier(0.2,0.7,0.2,1)',
        cursor: 'pointer',
      }}
    >
      <div style={{
        width: 58, height: 58, borderRadius: 18,
        background: hov ? color + '33' : 'rgba(255,255,255,0.08)',
        border: `1px solid ${color}44`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all .3s',
      }}>
        <Icon size={26} strokeWidth={1.7} color={color} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'Cairo', fontWeight: 700, color: '#F3E6C0', fontSize: 15, marginBottom: 5 }}>{label}</div>
        <div style={{ color: hov ? '#E8C76A' : '#c9bce8', fontSize: 14, transition: 'color .3s' }}>{value}</div>
        {subValue && <div style={{ color: '#9b7fd6', fontSize: 12.5, marginTop: 3 }}>{subValue}</div>}
      </div>
      <div style={{
        fontSize: 12, fontWeight: 600, color, opacity: hov ? 1 : 0,
        transition: 'opacity .3s', padding: '4px 14px', borderRadius: 20,
        background: color + '18', border: `1px solid ${color}33`,
      }}>
        تواصل الآن
      </div>
    </a>
  )
}

function FAQItem({ q, a, idx, open, onToggle }) {
  return (
    <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(150,120,220,0.14)', background: open ? 'rgba(124,58,237,0.1)' : 'rgba(255,255,255,0.04)', transition: 'all .3s' }}>
      <button
        onClick={() => onToggle(open ? null : idx)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '17px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'right' }}
      >
        <span style={{ fontFamily: 'Cairo', fontWeight: 700, color: open ? '#E8C76A' : '#F3E6C0', fontSize: 15, transition: 'color .25s', textAlign: 'right' }}>{q}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ transform: open ? 'rotate(180deg)' : '', transition: 'transform .3s', flexShrink: 0 }}>
          <path d="m6 9 6 6 6-6" stroke="#a78fd6" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      </button>
      <div style={{ maxHeight: open ? 300 : 0, overflow: 'hidden', transition: 'max-height .35s ease' }}>
        <p style={{ color: '#b3a4d0', fontSize: 14.5, lineHeight: 1.8, padding: '0 20px 18px', margin: 0 }}>{a}</p>
      </div>
    </div>
  )
}

function Field({ label, error, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: error ? '#f87171' : '#c9bce8', marginBottom: 7 }}>{label}</label>
      {children}
      {error && <span style={{ fontSize: 12.5, color: '#f87171', marginTop: 4, display: 'block' }}>{error}</span>}
    </div>
  )
}

const INPUT = {
  width: '100%', padding: '11px 14px', borderRadius: 11, fontFamily: 'Tajawal', fontSize: 14.5,
  border: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.06)',
  color: '#e8e0f5', outline: 'none', boxSizing: 'border-box', transition: 'border-color .2s', appearance: 'none',
}

function QuickLink({ Icon, label, sub, href, color }) {
  const [hov, setHov] = useState(false)
  return (
    <a
      href={href} target="_blank" rel="noopener noreferrer"
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, border: `1px solid ${hov ? color+'44' : 'rgba(255,255,255,.08)'}`, background: hov ? color+'0f' : 'transparent', textDecoration: 'none', transition: 'all .25s' }}
    >
      <Icon size={22} strokeWidth={1.8} color={color} />
      <div>
        <div style={{ fontFamily: 'Cairo', fontWeight: 700, color: '#F3E6C0', fontSize: 13.5 }}>{label}</div>
        <div style={{ color: '#9b7fd6', fontSize: 12 }}>{sub}</div>
      </div>
    </a>
  )
}

export default function ContactPage() {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', country: '', subject: '', message: '', preferredContact: 'email',
  })
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [openFAQ, setOpenFAQ] = useState(null)

  const { data: settings = {} } = useQuery({
    queryKey: ['public', 'settings'],
    queryFn: () => api.get('/website/settings').then(r => r.data.data),
    staleTime: 10 * 60 * 1000,
    placeholderData: {},
  })

  const { data: faqs = [] } = useQuery({
    queryKey: ['public', 'faqs'],
    queryFn: () => api.get('/website/faqs').then(r => r.data.data || []),
    staleTime: 10 * 60 * 1000,
    placeholderData: [],
  })

  const s = settings || {}
  const phone        = s.phone       || '+20 105 040 0096'
  const whatsapp     = s.whatsapp    || '966567443805'
  const emailAddr    = s.email       || 'tartela.online@gmail.com'
  const youtube      = s.youtube     || '@tartela.2online'
  const workingHours = s.workingHours || 'السبت – الخميس: 9:00 ص – 9:00 م'

  const submitMutation = useMutation({
    mutationFn: (data) => api.post('/website/contact', data),
    onSuccess: () => setSubmitted(true),
    onError: (err) => setErrors({ submit: err?.response?.data?.message || 'حدث خطأ، يرجى المحاولة مجدداً' }),
  })

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'الاسم مطلوب'
    if (!form.email.trim()) e.email = 'البريد الإلكتروني مطلوب'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'بريد إلكتروني غير صالح'
    if (!form.message.trim()) e.message = 'الرسالة مطلوبة'
    return e
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    submitMutation.mutate(form)
  }

  function field(key) {
    return (e) => {
      setForm(p => ({ ...p, [key]: e.target.value }))
      if (errors[key]) setErrors(p => { const n = { ...p }; delete n[key]; return n })
    }
  }

  const displayFAQs = faqs.length > 0
    ? faqs.map(f => ({ q: f.questionAr || f.question, a: f.answerAr || f.answer }))
    : [
        { q: 'كيف أبدأ رحلتي مع ترتيلة؟', a: 'سجّل حسابك واختر مستواك، ثم سيتواصل معك فريقنا لتحديد المعلم المناسب وجدول الحصص.' },
        { q: 'هل يمكنني تغيير المعلم؟', a: 'نعم، يمكنك طلب تغيير المعلم في أي وقت دون رسوم إضافية إذا لم تكن راضياً.' },
        { q: 'ما هي تقنية الاتصال المستخدمة؟', a: 'نستخدم Zoom وGoogle Meet وMicrosoft Teams. تحتاج فقط إلى اتصال إنترنت مستقر وميكروفون.' },
        { q: 'هل يمكن تأجيل الحصة؟', a: 'نعم، يمكن التأجيل بإشعار مسبق قبل ٢٤ ساعة على الأقل.' },
        { q: 'هل يمكن للأطفال الانضمام؟', a: 'بالتأكيد، لدينا معلمون متخصصون في تعليم الأطفال من عمر ٤ سنوات.' },
        { q: 'ما هي سياسة الاسترداد؟', a: 'يمكنك استرداد مبلغ الحصص غير المستخدمة خلال ٧ أيام من بدء الاشتراك.' },
      ]

  return (
    <div dir="rtl" style={{ background: '#0f0226', minHeight: '100vh', overflowX: 'hidden' }}>

      {/* HERO */}
      <section style={{ position: 'relative', overflow: 'hidden', paddingTop: 'clamp(120px,14vw,180px)', paddingBottom: 'clamp(60px,7vw,96px)', padding: 'clamp(120px,14vw,180px) clamp(20px,5vw,68px) clamp(60px,7vw,96px)' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 70% at 50% -10%, rgba(124,58,237,0.45) 0%, transparent 60%), radial-gradient(ellipse 50% 50% at 20% 80%, rgba(91,33,182,0.3) 0%, transparent 60%), linear-gradient(180deg, #0f0226 0%, #1a0347 50%, #0f0226 100%)', pointerEvents: 'none' }} />

        {/* Geometric pattern */}
        <svg style={{ position: 'absolute', top: 0, right: 0, width: '45%', height: '100%', opacity: 0.045, pointerEvents: 'none' }} viewBox="0 0 400 400">
          <defs>
            <pattern id="geo-contact" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
              <polygon points="40,2 78,22 78,58 40,78 2,58 2,22" fill="none" stroke="white" strokeWidth="1"/>
              <circle cx="40" cy="40" r="8" fill="none" stroke="white" strokeWidth="0.7"/>
            </pattern>
          </defs>
          <rect width="400" height="400" fill="url(#geo-contact)"/>
        </svg>

        {/* Particles */}
        <FloatingParticle style={{ width: 320, height: 320, top: '5%', right: '3%', animationDuration: '18s', animationDelay: '0s' }} />
        <FloatingParticle style={{ width: 200, height: 200, top: '55%', left: '3%', animationDuration: '24s', animationDelay: '-6s' }} />

        <div style={{ position: 'relative', maxWidth: 780, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 18px', borderRadius: 30, background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)', marginBottom: 28 }}>
            <Mail size={16} strokeWidth={1.8} color="#c4b5fd" />
            <span style={{ color: '#c4b5fd', fontSize: 13.5, fontWeight: 600 }}>نحن هنا لمساعدتك</span>
          </div>

          <h1 style={{ fontFamily: 'Cairo', fontWeight: 900, fontSize: 'clamp(36px,5vw,62px)', lineHeight: 1.2, color: '#F3E6C0', marginBottom: 22 }}>
            تواصل مع{' '}
            <span style={{ background: 'linear-gradient(120deg, #D4AF37, #E8C76A, #D4AF37)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
              ترتيلة أونلاين
            </span>
          </h1>

          <p style={{ color: '#b3a4d0', fontSize: 'clamp(15px,1.8vw,18px)', lineHeight: 1.9, maxWidth: 560, margin: '0 auto 40px' }}>
            {s.supportText || 'فريقنا مستعد للإجابة على استفساراتك ومساعدتك في رحلة تعلم القرآن الكريم'}
          </p>

          <div style={{ display: 'flex', gap: 'clamp(20px,3vw,40px)', justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              { value: '< 24 ساعة', label: 'ردّ خلال' },
              { value: '7 أيام', label: 'دعم' },
              { value: 'عربي / إنجليزي', label: 'لغات' },
            ].map(stat => (
              <div key={stat.label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'Cairo', fontWeight: 800, fontSize: 22, color: '#E8C76A' }}>{stat.value}</div>
                <div style={{ color: '#9b7fd6', fontSize: 13 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT CARDS */}
      <section style={{ padding: '0 clamp(20px,5vw,68px) clamp(48px,6vw,80px)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
          <ContactCard Icon={Mail} label="البريد الإلكتروني" value={emailAddr} href={`mailto:${emailAddr}`} color="#7C3AED" />
          <ContactCard Icon={Phone} label="رقم الهاتف" value={phone} href={`tel:${phone.replace(/\s/g,'')}`} color="#10B981" subValue={workingHours} />
          <ContactCard Icon={MessageCircle} label="واتساب" value="تواصل سريع" href={`https://api.whatsapp.com/send/?phone=${whatsapp}`} color="#25D366" />
          <ContactCard Icon={Play} label="يوتيوب" value={youtube} href={`https://youtube.com/${youtube.startsWith('@') ? youtube : '@'+youtube}`} color="#FF0000" />
        </div>
      </section>

      {/* FORM + SIDEBAR */}
      <section style={{ padding: '0 clamp(20px,5vw,68px) clamp(60px,7vw,96px)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)', gap: 36, alignItems: 'start' }}>

          {/* Form */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: 'clamp(24px,4vw,40px)', backdropFilter: 'blur(8px)' }}>
            <h2 style={{ fontFamily: 'Cairo', fontWeight: 800, fontSize: 22, color: '#F3E6C0', marginBottom: 6 }}>أرسل لنا رسالة</h2>
            <p style={{ color: '#9b7fd6', fontSize: 14, marginBottom: 28 }}>سنرد عليك في أقرب وقت ممكن</p>

            {submitted ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <CircleCheck size={64} strokeWidth={1.2} color="#4ade80" style={{ margin: '0 auto 20px', display: 'block' }} />
                <h3 style={{ fontFamily: 'Cairo', fontWeight: 800, color: '#4ade80', fontSize: 22, marginBottom: 12 }}>تم إرسال رسالتك!</h3>
                <p style={{ color: '#b3a4d0', fontSize: 15, lineHeight: 1.8 }}>شكراً لتواصلك معنا. سيقوم فريقنا بالرد خلال 24 ساعة.</p>
                <button
                  onClick={() => { setSubmitted(false); setForm({ name:'', email:'', phone:'', country:'', subject:'', message:'', preferredContact:'email' }) }}
                  style={{ marginTop: 24, padding: '12px 32px', borderRadius: 12, border: '1px solid rgba(124,58,237,.4)', background: 'rgba(124,58,237,.15)', color: '#c4b5fd', fontFamily: 'Tajawal', fontWeight: 600, fontSize: 14.5, cursor: 'pointer' }}
                >
                  إرسال رسالة أخرى
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <Field label="الاسم الكامل *" error={errors.name}>
                    <input value={form.name} onChange={field('name')} placeholder="محمد أحمد" style={{ ...INPUT, borderColor: errors.name ? 'rgba(239,68,68,.5)' : undefined }} />
                  </Field>
                  <Field label="البريد الإلكتروني *" error={errors.email}>
                    <input type="email" value={form.email} onChange={field('email')} placeholder="example@email.com" style={{ ...INPUT, borderColor: errors.email ? 'rgba(239,68,68,.5)' : undefined }} dir="ltr" />
                  </Field>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <Field label="رقم الهاتف">
                    <input value={form.phone} onChange={field('phone')} placeholder="+966 XX XXX XXXX" style={INPUT} dir="ltr" />
                  </Field>
                  <Field label="الدولة">
                    <select value={form.country} onChange={field('country')} style={INPUT}>
                      <option value="">اختر دولتك</option>
                      {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="الموضوع">
                  <select value={form.subject} onChange={field('subject')} style={INPUT}>
                    <option value="">اختر موضوع رسالتك</option>
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="الرسالة *" error={errors.message}>
                  <textarea value={form.message} onChange={field('message')} placeholder="اكتب رسالتك هنا..." rows={5}
                    style={{ ...INPUT, resize: 'vertical', minHeight: 120, borderColor: errors.message ? 'rgba(239,68,68,.5)' : undefined }} />
                </Field>

                {/* Preferred contact */}
                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#c9bce8', marginBottom: 10 }}>طريقة التواصل المفضلة</label>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {[{ v: 'email', l: 'بريد إلكتروني', Ic: Mail }, { v: 'phone', l: 'هاتف', Ic: Phone }, { v: 'whatsapp', l: 'واتساب', Ic: MessageCircle }].map(opt => (
                      <button key={opt.v} type="button" onClick={() => setForm(p => ({ ...p, preferredContact: opt.v }))}
                        style={{
                          padding: '9px 18px', borderRadius: 10, cursor: 'pointer',
                          border: `1px solid ${form.preferredContact === opt.v ? 'rgba(124,58,237,.7)' : 'rgba(255,255,255,.12)'}`,
                          background: form.preferredContact === opt.v ? 'rgba(124,58,237,.2)' : 'rgba(255,255,255,.04)',
                          color: form.preferredContact === opt.v ? '#c4b5fd' : '#a89ec8',
                          fontSize: 13.5, fontFamily: 'Tajawal', fontWeight: 600, transition: 'all .2s',
                        }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><opt.Ic size={14} strokeWidth={1.8} />{opt.l}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {errors.submit && (
                  <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,.15)', border: '1px solid rgba(239,68,68,.3)', color: '#f87171', fontSize: 14 }}>
                    {errors.submit}
                  </div>
                )}

                <button type="submit" disabled={submitMutation.isPending}
                  style={{ marginTop: 4, padding: '15px 28px', borderRadius: 13, border: 'none', cursor: submitMutation.isPending ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg, #7C3AED, #5b21b6)', color: '#fff', fontFamily: 'Cairo', fontWeight: 800, fontSize: 15.5, boxShadow: '0 12px 36px rgba(124,58,237,.45)', opacity: submitMutation.isPending ? 0.7 : 1, transition: 'all .25s' }}
                  onMouseEnter={e => { if (!submitMutation.isPending) e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = '' }}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Send size={16} strokeWidth={2} />{submitMutation.isPending ? 'جارٍ الإرسال...' : 'إرسال الرسالة'}</span>
                </button>
              </form>
            )}
          </div>

          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 20, padding: '26px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                <Clock size={28} strokeWidth={1.6} color="#E8C76A" />
                <h3 style={{ fontFamily: 'Cairo', fontWeight: 800, color: '#F3E6C0', fontSize: 16, margin: 0 }}>ساعات العمل</h3>
              </div>
              <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(124,58,237,.1)', border: '1px solid rgba(124,58,237,.2)' }}>
                <div style={{ color: '#c9bce8', fontSize: 14.5, lineHeight: 1.8 }}>{workingHours}</div>
              </div>
              {s.emergencyContact && (
                <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 12, background: 'rgba(212,175,55,.08)', border: '1px solid rgba(212,175,55,.2)' }}>
                  <div style={{ fontSize: 12, color: '#E8C76A', fontWeight: 700, marginBottom: 4 }}>طوارئ</div>
                  <div style={{ color: '#c9bce8', fontSize: 14 }}>{s.emergencyContact}</div>
                </div>
              )}
            </div>

            <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 20, padding: '26px 24px' }}>
              <h3 style={{ fontFamily: 'Cairo', fontWeight: 800, color: '#F3E6C0', fontSize: 16, marginBottom: 18 }}>تواصل فوري</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <QuickLink Icon={MessageCircle} label="واتساب" sub="رد خلال دقائق" href={`https://api.whatsapp.com/send/?phone=${whatsapp}`} color="#25D366" />
                <QuickLink Icon={Mail} label="البريد الإلكتروني" sub={emailAddr} href={`mailto:${emailAddr}`} color="#7C3AED" />
                <QuickLink Icon={Phone} label="الهاتف" sub={phone} href={`tel:${phone.replace(/\s/g,'')}`} color="#10B981" />
              </div>
            </div>

            {s.googleMapsEmbed ? (
              <div style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(255,255,255,.1)' }}>
                <iframe src={s.googleMapsEmbed} width="100%" height="200" style={{ border: 0, display: 'block' }} allowFullScreen loading="lazy" title="الموقع" />
              </div>
            ) : (
              <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 20, padding: '26px 24px', textAlign: 'center' }}>
                <Globe size={42} strokeWidth={1.3} color="#9b7fd6" style={{ display: 'block', margin: '0 auto 12px' }} />
                <div style={{ fontFamily: 'Cairo', fontWeight: 700, color: '#F3E6C0', fontSize: 15, marginBottom: 6 }}>أكاديمية عبر الإنترنت</div>
                <div style={{ color: '#9b7fd6', fontSize: 13.5 }}>نخدم الطلاب من جميع أنحاء العالم</div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: '0 clamp(20px,5vw,68px) clamp(60px,7vw,96px)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 42 }}>
            <h2 style={{ fontFamily: 'Cairo', fontWeight: 900, fontSize: 'clamp(28px,4vw,42px)', color: '#F3E6C0', marginBottom: 12 }}>
              الأسئلة <span style={{ color: '#E8C76A' }}>الشائعة</span>
            </h2>
            <p style={{ color: '#9b7fd6', fontSize: 15.5 }}>إجابات على أكثر الأسئلة شيوعاً من طلابنا</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {displayFAQs.map((faq, i) => (
              <FAQItem key={i} q={faq.q} a={faq.a} idx={i} open={openFAQ === i} onToggle={setOpenFAQ} />
            ))}
          </div>
        </div>
      </section>

      <style>{`
        @keyframes particle-float {
          0%   { transform: translateY(0) scale(1); opacity: 0.4 }
          50%  { transform: translateY(-40px) scale(1.08); opacity: 0.65 }
          100% { transform: translateY(0) scale(1); opacity: 0.4 }
        }
        @media (max-width: 768px) {
          .contact-grid { grid-template-columns: 1fr !important }
        }
      `}</style>
    </div>
  )
}
