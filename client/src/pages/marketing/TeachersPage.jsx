import { Link } from 'react-router-dom'
import { ROUTES } from '../../config/constants.js'

const teachers = [
  { name: 'أ. محمد الأحمدي', specialty: 'تجويد وحفظ القرآن', bio: 'خريج كلية القرآن الكريم، حافظ للقرآن، خبرة ١٠ سنوات في التدريس.', rating: 4.9, sessions: 250 },
  { name: 'أ. فاطمة العمري', specialty: 'قراءة وتجويد', bio: 'متخصصة في تعليم القراءة للمبتدئين والأطفال، أسلوب ممتع وفعّال.', rating: 4.8, sessions: 180 },
  { name: 'أ. علي الحسن', specialty: 'حفظ القرآن', bio: 'حافظ للقرآن الكريم بالروايات العشر، متخصص في التحفيظ للكبار.', rating: 5.0, sessions: 320 },
  { name: 'أ. سارة الزهراني', specialty: 'تجويد وتلاوة', bio: 'حاصلة على إجازة في رواية حفص، تجمع بين الأصالة والأسلوب العصري.', rating: 4.7, sessions: 140 },
]

export default function TeachersPage() {
  return (
    <div className="bg-brand-dark min-h-screen pt-28 pb-20 px-[clamp(20px,5vw,68px)]" dir="rtl">
      <div className="max-w-[1200px] mx-auto">
        <h1 className="font-heading font-extrabold text-4xl text-white text-center mb-4">فريق المعلمين</h1>
        <p className="text-center mb-12" style={{ color: '#b3a4d0' }}>نخبة من أفضل معلمي القرآن الكريم المتخصصين</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {teachers.map((t, i) => (
            <div key={i} className="rounded-card p-6 text-center" style={{ background: '#1d0a3f', border: '1px solid rgba(150,120,220,0.14)' }}>
              <div className="w-20 h-20 rounded-full bg-purple-gradient flex items-center justify-center text-white font-heading font-bold text-2xl mx-auto mb-4">
                {t.name.split(' ')[1]?.[0]}
              </div>
              <h3 className="font-heading font-bold text-white text-base">{t.name}</h3>
              <p className="text-xs mt-1 mb-3" style={{ color: '#a78fd6' }}>{t.specialty}</p>
              <p className="text-xs leading-relaxed mb-4" style={{ color: '#b3a4d0' }}>{t.bio}</p>
              <div className="flex justify-center gap-4 text-xs mb-5">
                <span className="text-brand-gold">⭐ {t.rating}</span>
                <span style={{ color: '#b3a4d0' }}>{t.sessions}+ حصة</span>
              </div>
              <Link to={ROUTES.REGISTER} className="block text-center py-2.5 rounded-btn text-sm font-bold transition-colors" style={{ border: '1px solid rgba(232,199,106,0.3)', color: '#E8C76A' }}>
                احجز معه
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
