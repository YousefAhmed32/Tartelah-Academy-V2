import { Link } from 'react-router-dom'
import { ROUTES } from '../../config/constants.js'

export default function AboutPage() {
  return (
    <div className="bg-brand-dark min-h-screen pt-28 pb-20 px-[clamp(20px,5vw,68px)]" dir="rtl">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-heading font-extrabold text-4xl text-white text-center mb-6">من نحن</h1>
        <p className="text-center text-lg leading-relaxed mb-12" style={{ color: '#cfc3e8' }}>
          ترتيلة أونلاين منصة تعليمية متكاملة تهدف إلى نشر تعليم القرآن الكريم بأسلوب عصري ومحتوى أصيل.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {['رؤيتنا', 'مهمتنا', 'قيمنا', 'فريقنا'].map((t) => (
            <div key={t} className="rounded-card p-6" style={{ background: '#1d0a3f', border: '1px solid rgba(150,120,220,0.14)' }}>
              <h3 className="font-heading font-bold text-white text-lg mb-3">{t}</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#b3a4d0' }}>
                نسعى لتقديم أفضل تجربة تعليمية قرآنية عبر الإنترنت، مع الحفاظ على الأصالة والمنهجية العلمية.
              </p>
            </div>
          ))}
        </div>
        <div className="text-center mt-12">
          <Link to={ROUTES.REGISTER} className="btn-gold">ابدأ رحلتك معنا</Link>
        </div>
      </div>
    </div>
  )
}
