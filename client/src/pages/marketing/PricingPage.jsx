import { Link } from 'react-router-dom'
import { ROUTES } from '../../config/constants.js'

const packages = [
  { name: 'الباقة الأساسية', sessions: 4, duration: 60, price: 80, currency: '$', features: ['٤ حصص شهرياً', '٦٠ دقيقة/حصة', 'تقارير أسبوعية', 'دعم عبر الواتساب'], popular: false },
  { name: 'الباقة المميزة', sessions: 8, duration: 60, price: 140, currency: '$', features: ['٨ حصص شهرياً', '٦٠ دقيقة/حصة', 'تقارير أسبوعية', 'دعم عبر الواتساب', 'تسجيل الحصص'], popular: true },
  { name: 'الباقة المكثفة', sessions: 16, duration: 60, price: 240, currency: '$', features: ['١٦ حصة شهرياً', '٦٠ دقيقة/حصة', 'تقارير تفصيلية', 'دعم أولوية ٢٤/٧', 'تسجيل الحصص', 'مراجعة شهرية شاملة'], popular: false },
]

export default function PricingPage() {
  return (
    <div className="bg-brand-dark min-h-screen pt-28 pb-20 px-[clamp(20px,5vw,68px)]" dir="rtl">
      <div className="max-w-5xl mx-auto">
        <h1 className="font-heading font-extrabold text-4xl text-white text-center mb-4">الأسعار والباقات</h1>
        <p className="text-center mb-12" style={{ color: '#b3a4d0' }}>باقات مرنة تناسب جميع الاحتياجات والميزانيات</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {packages.map((pkg, i) => (
            <div
              key={i}
              className="rounded-card p-8 relative"
              style={{
                background: pkg.popular ? 'linear-gradient(135deg, #2d1257, #1d0a3f)' : '#1d0a3f',
                border: pkg.popular ? '1.5px solid rgba(232,199,106,0.5)' : '1px solid rgba(150,120,220,0.14)',
              }}
            >
              {pkg.popular && (
                <div className="absolute -top-3.5 inset-x-0 flex justify-center">
                  <span className="bg-gold-gradient text-brand-goldText text-xs font-bold px-4 py-1.5 rounded-full">الأكثر طلباً</span>
                </div>
              )}
              <h3 className="font-heading font-bold text-white text-xl">{pkg.name}</h3>
              <div className="mt-5 flex items-end gap-1">
                <span className="font-heading font-extrabold text-white text-5xl">{pkg.currency}{pkg.price}</span>
                <span className="text-sm mb-2" style={{ color: '#b3a4d0' }}>/شهرياً</span>
              </div>
              <p className="text-sm mt-2 mb-5" style={{ color: '#a78fd6' }}>{pkg.sessions} حصص × {pkg.duration} دقيقة</p>
              <ul className="space-y-3">
                {pkg.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-3 text-sm" style={{ color: '#cdbef0' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="m5 12 5 5 9-9" stroke="#E8C76A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link to={ROUTES.REGISTER} className={`mt-8 block text-center py-3.5 rounded-btn font-bold text-sm transition-all ${pkg.popular ? 'btn-gold' : ''}`} style={!pkg.popular ? { border: '1.5px solid rgba(232,199,106,0.35)', color: '#E8C76A' } : {}}>
                اشترك الآن
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
