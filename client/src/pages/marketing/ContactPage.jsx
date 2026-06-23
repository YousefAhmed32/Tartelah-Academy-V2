import { useState } from 'react'
import toast from 'react-hot-toast'

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    await new Promise(r => setTimeout(r, 1000))
    toast.success('تم إرسال رسالتك بنجاح. سنتواصل معك قريباً.')
    setForm({ name: '', email: '', phone: '', message: '' })
    setLoading(false)
  }

  return (
    <div className="bg-brand-dark min-h-screen pt-28 pb-20 px-[clamp(20px,5vw,68px)]" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-heading font-extrabold text-4xl text-white text-center mb-4">تواصل معنا</h1>
        <p className="text-center mb-12" style={{ color: '#b3a4d0' }}>نحن هنا للإجابة على جميع استفساراتك</p>

        <div className="rounded-card p-8" style={{ background: '#1d0a3f', border: '1px solid rgba(150,120,220,0.14)' }}>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-[#cdbef0] mb-1.5">الاسم الكامل</label>
              <input
                value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                required placeholder="اسمك الكامل"
                className="field"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#cdbef0] mb-1.5">البريد الإلكتروني</label>
              <input
                type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                required placeholder="example@email.com"
                className="field"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#cdbef0] mb-1.5">رقم الهاتف (اختياري)</label>
              <input
                value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                placeholder="+966 5X XXX XXXX"
                className="field"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#cdbef0] mb-1.5">الرسالة</label>
              <textarea
                value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                required rows={5} placeholder="اكتب رسالتك هنا..."
                className="field resize-none"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-gold w-full text-center py-4 text-base mt-2">
              {loading ? 'جاري الإرسال...' : 'إرسال الرسالة'}
            </button>
          </form>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-8">
          {[
            { label: 'واتساب', value: '+966 5X XXX XXXX', icon: '📱' },
            { label: 'البريد الإلكتروني', value: 'info@tartelah.com', icon: '📧' },
            { label: 'أوقات الدعم', value: 'السبت - الخميس ٩ص - ١٠م', icon: '🕐' },
          ].map((c, i) => (
            <div key={i} className="rounded-card p-4 text-center" style={{ background: '#1d0a3f', border: '1px solid rgba(150,120,220,0.14)' }}>
              <div className="text-2xl mb-2">{c.icon}</div>
              <div className="text-xs font-semibold mb-1" style={{ color: '#a78fd6' }}>{c.label}</div>
              <div className="text-xs text-white font-medium">{c.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
