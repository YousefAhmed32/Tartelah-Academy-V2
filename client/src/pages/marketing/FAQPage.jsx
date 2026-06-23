import { useState } from 'react'

const faqs = [
  { q: 'كيف أبدأ رحلتي مع ترتيلة؟', a: 'سجّل حسابك واختر مستواك، ثم سيتواصل معك فريقنا لتحديد المعلم المناسب وجدول الحصص.' },
  { q: 'هل يمكنني تغيير المعلم؟', a: 'نعم، يمكنك طلب تغيير المعلم في أي وقت دون رسوم إضافية إذا لم تكن راضياً.' },
  { q: 'ما هي تقنية الاتصال المستخدمة؟', a: 'نستخدم Zoom وGoogle Meet وMicrosoft Teams. تحتاج فقط إلى اتصال إنترنت مستقر وميكروفون.' },
  { q: 'هل يمكن تأجيل الحصة؟', a: 'نعم، يمكن التأجيل بإشعار مسبق قبل ٢٤ ساعة على الأقل، وسيتم إعادة جدولة الحصة في وقت مناسب.' },
  { q: 'هل يمكن للأطفال الانضمام؟', a: 'بالتأكيد، لدينا معلمون متخصصون في تعليم الأطفال من عمر ٤ سنوات.' },
  { q: 'ما هي سياسة الاسترداد؟', a: 'يمكنك استرداد مبلغ الحصص غير المستخدمة خلال ٧ أيام من بدء الاشتراك.' },
  { q: 'هل الحصص مسجلة؟', a: 'في الباقة المميزة والمكثفة يمكن تسجيل الحصص بموافقة المعلم لمراجعتها لاحقاً.' },
  { q: 'هل يتوفر دعم عربي؟', a: 'نعم، منصتنا ودعمنا متاحان باللغة العربية بالكامل.' },
]

export default function FAQPage() {
  const [open, setOpen] = useState(null)

  return (
    <div className="bg-brand-dark min-h-screen pt-28 pb-20 px-[clamp(20px,5vw,68px)]" dir="rtl">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-heading font-extrabold text-4xl text-white text-center mb-4">الأسئلة الشائعة</h1>
        <p className="text-center mb-12" style={{ color: '#b3a4d0' }}>إجابات على أكثر الأسئلة شيوعاً من طلابنا</p>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="rounded-card overflow-hidden"
              style={{ background: '#1d0a3f', border: '1px solid rgba(150,120,220,0.14)' }}
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between gap-4 p-5 text-end"
              >
                <span className="font-heading font-bold text-white text-base">{faq.q}</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={`flex-none transition-transform ${open === i ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6" stroke="#a78fd6" strokeWidth="1.8" strokeLinecap="round"/></svg>
              </button>
              {open === i && (
                <div className="px-5 pb-5 text-sm leading-relaxed" style={{ color: '#b3a4d0' }}>{faq.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
